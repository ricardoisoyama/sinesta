using System.Globalization;
using Elrond.Application.Common;
using Elrond.Application.Interfaces;
using Elrond.Domain.Entities;
using Elrond.Domain.Regras;
using Microsoft.Extensions.Logging;

namespace Elrond.Application.Services;

/// <summary>De onde vem a cobrança (para não emitir duas vezes a mesma parcela).</summary>
public sealed record OrigemCobranca(string Tipo, string Id, string ParcelaId, string Descricao);

/// <summary>O que a tela (ou a fatura, no futuro) pede para cobrar.</summary>
public sealed record NovaCobranca(decimal Valor, string Vencimento, PagadorCobranca Pagador, IReadOnlyList<string> Mensagens);

public interface ICobrancaService
{
    Task<Result<CobrancaBancaria>> EmitirAsync(string empresaId, OrigemCobranca origem, NovaCobranca pedido, CancellationToken ct = default);
    Task<List<CobrancaBancaria>> ListarAsync(string empresaId, string? origemTipo = null, string? origemId = null);
    Task<Result<CobrancaBancaria>> AtualizarAsync(string id, CancellationToken ct = default);
    Task<Result<byte[]>> PdfAsync(string id, CancellationToken ct = default);
    Task<Result<CobrancaBancaria>> CancelarAsync(string id, string motivo, CancellationToken ct = default);
}

/// <summary>
/// Orquestrador de cobranças: o resto do sistema pede "cobre esta parcela" e ele escolhe o banco
/// da empresa (a integração dela), valida, GRAVA ANTES de chamar o banco e traduz a resposta.
/// Envio incerto (queda, demora) fica "incerta" e, ao atualizar, é procurado pelo seu número
/// antes de qualquer reenvio: assim a mesma parcela nunca vira dois boletos.
/// </summary>
public sealed class CobrancaService(
    ICrudRepository<CobrancaBancaria> cobrancas,
    ICrudRepository<IntegracaoBancaria> integracoes,
    IBancos bancos,
    ICofreBancario cofre,
    IAuditoriaService auditoria,
    TimeProvider relogio,
    ILogger<CobrancaService> log) : ICobrancaService
{
    /// <summary>Valor mínimo aceito pelo Inter (e uma referência razoável para os demais).</summary>
    public const decimal ValorMinimo = 2.50m;
    /// <summary>Dias depois do vencimento até o banco dar baixa sozinho.</summary>
    public const int DiasAgendaPadrao = 30;

    private static readonly CultureInfo PtBr = CultureInfo.GetCultureInfo("pt-BR");

    public async Task<Result<CobrancaBancaria>> EmitirAsync(string empresaId, OrigemCobranca origem, NovaCobranca pedido, CancellationToken ct = default)
    {
        var integracao = (await integracoes.ListarAsync(i => i.EmpresaId == empresaId)).FirstOrDefault(i => i.Libera(IntegracaoBancaria.RecursoCobranca));
        if (integracao is null)
            return Result.Failure<CobrancaBancaria>("Esta empresa não tem integração bancária de cobrança ativa. A ativação é feita pela nossa equipe, a pedido do cliente.");
        var banco = bancos.Modulo(integracao.Banco)?.Cobranca;
        if (banco is null)
            return Result.Failure<CobrancaBancaria>($"O banco \"{integracao.Banco}\" não emite cobrança por API.");
        if (!cofre.Configurado)
            return Result.Failure<CobrancaBancaria>("A chave de cifra das credenciais não está configurada neste ambiente.");

        if (ConferirPedido(pedido) is { } erro) return Result.Failure<CobrancaBancaria>(erro);

        var daOrigem = await cobrancas.ListarAsync(c => c.EmpresaId == empresaId && c.OrigemTipo == origem.Tipo && c.OrigemId == origem.Id && c.OrigemParcelaId == origem.ParcelaId);
        if (daOrigem.FirstOrDefault(c => c.Vigente) is { } existente)
            return Result.Failure<CobrancaBancaria>($"{origem.Descricao} já tem um boleto ({Rotulo(existente.Situacao)}, seu número {existente.SeuNumero}). Cancele ou atualize o existente.");

        var cobranca = new CobrancaBancaria
        {
            Id = Guid.NewGuid().ToString(),
            EmpresaId = empresaId,
            IntegracaoId = integracao.Id,
            Banco = integracao.Banco,
            Ambiente = integracao.Ambiente,
            OrigemTipo = origem.Tipo,
            OrigemId = origem.Id,
            OrigemParcelaId = origem.ParcelaId,
            OrigemDescricao = origem.Descricao,
            SeuNumero = await ProximoSeuNumeroAsync(empresaId),
            Valor = Math.Round(pedido.Valor, 2, MidpointRounding.AwayFromZero),
            Vencimento = pedido.Vencimento,
            PagadorNome = pedido.Pagador.Nome.Trim(),
            PagadorDocumento = DocumentoFiscal.Digitos(pedido.Pagador.CpfCnpj),
            Situacao = CobrancaBancaria.Pendente,
        };
        // Grava antes de chamar o banco: se cair no meio, o registro diz o que foi tentado.
        await cobrancas.AddAsync(cobranca);

        var credencial = cofre.Abrir(integracao);
        var envio = await banco.EmitirAsync(credencial, new PedidoCobranca(cobranca.SeuNumero, cobranca.Valor, cobranca.Vencimento, DiasAgendaPadrao, pedido.Pagador, pedido.Mensagens), ct);
        switch (envio.Desfecho)
        {
            case DesfechoEnvioBanco.Aceito:
                cobranca.IdBanco = envio.IdBanco;
                cobranca.Situacao = CobrancaBancaria.Processando;
                break;
            case DesfechoEnvioBanco.Recusado:
                cobranca.Situacao = CobrancaBancaria.Falha;
                cobranca.Mensagem = envio.Mensagem;
                break;
            default:
                cobranca.Situacao = CobrancaBancaria.Incerta;
                cobranca.Mensagem = $"Não deu para confirmar com o banco ({envio.Mensagem}). Clique em atualizar: o sistema procura antes de emitir de novo.";
                break;
        }
        await cobrancas.UpdateAsync(cobranca.Id, cobranca);
        await auditoria.RegistrarAsync("emitir", "CobrancaBancaria", cobranca.Id,
            $"Boleto {cobranca.SeuNumero} ({origem.Descricao}, {cobranca.Valor.ToString("C", PtBr)}) no {integracao.Banco}/{integracao.Ambiente}: {Rotulo(cobranca.Situacao)}");

        // A emissão do Inter é assíncrona: a primeira consulta costuma já trazer a linha digitável.
        if (cobranca.Situacao == CobrancaBancaria.Processando)
            return Result.Success(await AplicarConsultaAsync(cobranca, banco, credencial, ct));
        return cobranca.Situacao == CobrancaBancaria.Falha
            ? Result.Failure<CobrancaBancaria>($"O banco recusou: {cobranca.Mensagem}")
            : Result.Success(cobranca);
    }

    public async Task<List<CobrancaBancaria>> ListarAsync(string empresaId, string? origemTipo = null, string? origemId = null) =>
        (await cobrancas.ListarAsync(c => c.EmpresaId == empresaId
                && (origemTipo == null || c.OrigemTipo == origemTipo)
                && (origemId == null || c.OrigemId == origemId)))
            .OrderByDescending(c => c.CriadoEm).ToList();

    public async Task<Result<CobrancaBancaria>> AtualizarAsync(string id, CancellationToken ct = default)
    {
        var (cobranca, banco, credencial, erro) = await AbrirAsync(id);
        if (erro is not null) return Result.Failure<CobrancaBancaria>(erro);
        return Result.Success(await AplicarConsultaAsync(cobranca!, banco!, credencial!, ct));
    }

    public async Task<Result<byte[]>> PdfAsync(string id, CancellationToken ct = default)
    {
        var (cobranca, banco, credencial, erro) = await AbrirAsync(id);
        if (erro is not null) return Result.Failure<byte[]>(erro);
        if (cobranca!.IdBanco.Length == 0) return Result.Failure<byte[]>("O boleto ainda não foi registrado no banco.");
        var pdf = await banco!.PdfAsync(credencial!, cobranca.IdBanco, ct);
        return pdf is { Length: > 0 } ? Result.Success(pdf) : Result.Failure<byte[]>("O banco ainda não liberou o PDF deste boleto. Tente de novo em instantes.");
    }

    public async Task<Result<CobrancaBancaria>> CancelarAsync(string id, string motivo, CancellationToken ct = default)
    {
        var (cobranca, banco, credencial, erro) = await AbrirAsync(id);
        if (erro is not null) return Result.Failure<CobrancaBancaria>(erro);
        var c = cobranca!;
        if (c.Situacao is not (CobrancaBancaria.AReceber or CobrancaBancaria.Processando))
            return Result.Failure<CobrancaBancaria>($"Só dá para cancelar boleto a receber (este está {Rotulo(c.Situacao)}).");
        var texto = string.IsNullOrWhiteSpace(motivo) ? "Cancelado pelo ELROND" : motivo.Trim();
        var envio = await banco!.CancelarAsync(credencial!, c.IdBanco, texto.Length > 50 ? texto[..50] : texto, ct);
        if (envio.Desfecho == DesfechoEnvioBanco.Recusado) return Result.Failure<CobrancaBancaria>($"O banco recusou o cancelamento: {envio.Mensagem}");
        await auditoria.RegistrarAsync("cancelar", "CobrancaBancaria", c.Id, $"Cancelamento do boleto {c.SeuNumero} pedido ao banco: {texto}");
        // O cancelamento também é assíncrono: a consulta mostra quando o banco confirmar.
        return Result.Success(await AplicarConsultaAsync(c, banco, credencial!, ct));
    }

    // ── internos ──

    private async Task<(CobrancaBancaria?, ICobrancaBancaria?, CredencialBanco?, string?)> AbrirAsync(string id)
    {
        if (await cobrancas.GetByIdAsync(id) is not { } c) return (null, null, null, "Boleto não encontrado.");
        if (await integracoes.GetByIdAsync(c.IntegracaoId) is not { } integracao) return (null, null, null, "A integração bancária deste boleto não existe mais.");
        if (bancos.Modulo(integracao.Banco)?.Cobranca is not { } banco) return (null, null, null, $"O banco \"{integracao.Banco}\" não está disponível.");
        return (c, banco, cofre.Abrir(integracao), null);
    }

    /// <summary>Consulta o banco e aplica a situação. Sem id do banco (envio incerto), procura pelo seu número.</summary>
    private async Task<CobrancaBancaria> AplicarConsultaAsync(CobrancaBancaria c, ICobrancaBancaria banco, CredencialBanco credencial, CancellationToken ct)
    {
        var consulta = c.IdBanco.Length > 0
            ? await banco.ConsultarAsync(credencial, c.IdBanco, ct)
            : await banco.ConsultarPorSeuNumeroAsync(credencial, c.SeuNumero, c.Vencimento, ct);

        if (consulta.Situacao is { } s)
        {
            var antes = c.Situacao;
            c.Situacao = s.Situacao;
            c.SituacaoBanco = s.SituacaoBanco;
            if (s.NossoNumero.Length > 0) c.NossoNumero = s.NossoNumero;
            if (s.LinhaDigitavel.Length > 0) c.LinhaDigitavel = s.LinhaDigitavel;
            if (s.CodigoBarras.Length > 0) c.CodigoBarras = s.CodigoBarras;
            if (s.PixCopiaECola.Length > 0) c.PixCopiaECola = s.PixCopiaECola;
            c.ValorRecebido = s.ValorRecebido;
            c.RecebidaEm = s.RecebidaEm;
            c.RecebidaPor = s.RecebidaPor;
            c.Mensagem = s.Mensagem;
            if (antes != c.Situacao)
                await auditoria.RegistrarAsync("situacao", "CobrancaBancaria", c.Id, $"Boleto {c.SeuNumero}: {Rotulo(antes)} → {Rotulo(c.Situacao)}");
        }
        else if (consulta.NaoExiste && c.Situacao == CobrancaBancaria.Incerta)
        {
            // O envio incerto não chegou ao banco: libera a parcela para uma nova emissão.
            c.Situacao = CobrancaBancaria.Falha;
            c.Mensagem = "O banco não recebeu este boleto. Pode emitir de novo.";
        }
        else if (consulta.Falha.Length > 0)
        {
            log.LogWarning("Consulta do boleto {SeuNumero} falhou: {Motivo}", c.SeuNumero, consulta.Falha);
            c.Mensagem = $"Não foi possível consultar o banco agora: {consulta.Falha}";
        }
        await cobrancas.UpdateAsync(c.Id, c);
        return c;
    }

    /// <summary>Próximo seu número da empresa: sequência numérica (até 15 caracteres, como o Inter aceita).</summary>
    private async Task<string> ProximoSeuNumeroAsync(string empresaId)
    {
        var maior = (await cobrancas.ListarAsync(c => c.EmpresaId == empresaId))
            .Select(c => long.TryParse(c.SeuNumero, out var n) ? n : 0).DefaultIfEmpty(0).Max();
        return (maior + 1).ToString("D6", CultureInfo.InvariantCulture);
    }

    /// <summary>Confere o pedido antes de gastar uma chamada ao banco (mensagens para a tela).</summary>
    public string? ConferirPedido(NovaCobranca p)
    {
        if (p.Valor < ValorMinimo) return $"O valor mínimo do boleto é {ValorMinimo.ToString("C", PtBr)}.";
        if (!DateOnly.TryParseExact(p.Vencimento, "yyyy-MM-dd", out var venc)) return "Informe o vencimento (aaaa-mm-dd).";
        var hoje = DateOnly.FromDateTime(relogio.GetLocalNow().DateTime);
        if (venc < hoje) return $"O vencimento ({venc:dd/MM/yyyy}) já passou. Escolha uma data a partir de hoje.";
        var g = p.Pagador;
        var doc = DocumentoFiscal.Digitos(g.CpfCnpj);
        if (!(doc.Length == 11 ? DocumentoFiscal.CpfValido(doc) : DocumentoFiscal.CnpjValido(doc))) return "O CPF/CNPJ do pagador é inválido.";
        var faltando = new[] { ("nome", g.Nome), ("endereço", g.Endereco), ("cidade", g.Cidade), ("UF", g.Uf) }
            .Where(x => string.IsNullOrWhiteSpace(x.Item2)).Select(x => x.Item1).ToList();
        if (!DocumentoFiscal.CepValido(g.Cep)) faltando.Add("CEP");
        return faltando.Count > 0 ? $"Faltam dados do pagador para o boleto: {string.Join(", ", faltando)}." : null;
    }

    public static string Rotulo(string situacao) => situacao switch
    {
        CobrancaBancaria.Pendente => "pendente",
        CobrancaBancaria.Processando => "em processamento no banco",
        CobrancaBancaria.AReceber => "a receber",
        CobrancaBancaria.Recebida => "recebido",
        CobrancaBancaria.Cancelada => "cancelado",
        CobrancaBancaria.Expirada => "expirado",
        CobrancaBancaria.Falha => "falhou",
        CobrancaBancaria.Incerta => "sem confirmação do banco",
        _ => situacao,
    };
}

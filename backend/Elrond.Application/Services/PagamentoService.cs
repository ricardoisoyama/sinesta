using System.Globalization;
using Elrond.Application.Common;
using Elrond.Application.DTOs;
using Elrond.Application.Interfaces;
using Elrond.Domain.Entities;
using Elrond.Domain.Regras;
using Microsoft.Extensions.Logging;

namespace Elrond.Application.Services;

/// <summary>Lançamento escolhido para pagar, como a tela de agendamento mostra.</summary>
public sealed record PreparoPagamentoDto(
    string MovimentoId, long Numero, string EmpresaId, string Favorecido, string Email, string ChaveSugerida, decimal Valor,
    string Vencimento, string Descricao, string Banco, string Problema, PagamentoBancario? Atual);

public sealed record ItemAgendamentoDto(string MovimentoId, string Chave);
public sealed record AgendarPagamentosDto(List<ItemAgendamentoDto> Itens, string Data);
public sealed record ResultadoAgendamentoDto(string MovimentoId, bool Ok, string Mensagem, PagamentoBancario? Pagamento);

/// <summary>
/// Pagamentos pelo banco (piloto: Pix). Para cada lançamento a pagar APROVADO, grava o pagamento
/// antes de mandar ao banco (o id dele é a chave de idempotência), envia e traduz a resposta. Pix
/// efetivado na hora dá baixa no lançamento e avisa o favorecido por e-mail; Pix que espera aprovação
/// no app do banco fica "aguardando aprovação" até o aviso do banco (ou a conferência de hora em
/// hora) dizer que foi pago. A baixa usa a conta ligada à integração (Conta do Caixa).
/// </summary>
public sealed class PagamentoService(
    ICrudRepository<PagamentoBancario> pagamentos,
    ICrudRepository<Movimento> movimentos,
    ICrudRepository<IntegracaoBancaria> integracoes,
    ICrudRepository<Fornecedor> fornecedores,
    ICrudRepository<Carteira> carteiras,
    ICrudRepository<Empresa> empresas,
    IUserRepository usuarios,
    IBancos bancos,
    ICofreBancario cofre,
    IFinanceiroService financeiro,
    EmailService email,
    IAuditoriaService auditoria,
    TimeProvider relogio,
    ILogger<PagamentoService> log)
{
    private static readonly UsuarioAtual Banco = new("sistema", "Aviso do banco", "Admin");
    private static readonly CultureInfo PtBr = CultureInfo.GetCultureInfo("pt-BR");

    public async Task<List<PagamentoBancario>> ListarAsync() =>
        (await pagamentos.GetAllAsync()).OrderByDescending(p => p.CriadoEm).Take(300).ToList();

    /// <summary>O que a tela de agendamento precisa: favorecido, chave sugerida do cadastro, valor e o que impede pagar.</summary>
    public async Task<List<PreparoPagamentoDto>> PrepararAsync(List<string> movimentoIds)
    {
        var ids = (movimentoIds ?? new()).ToHashSet();
        var movs = await movimentos.ListarAsync(m => ids.Contains(m.Id));
        var todasInteg = await integracoes.GetAllAsync();
        var atuais = (await pagamentos.ListarAsync(p => ids.Contains(p.MovimentoId))).Where(p => p.Vigente).ToList();
        var lista = new List<PreparoPagamentoDto>();
        foreach (var m in movs)
        {
            var (nome, mail, chave) = await FavorecidoAsync(m);
            // Já no formato do Pix (celular com +55); se a do cadastro não serve, vai como está para a pessoa corrigir.
            if (ChavePix.Normalizar(chave) is { Ok: true } formatada) chave = formatada.Chave;
            var integ = IntegracaoDe(todasInteg, m.EmpresaId);
            var atual = atuais.FirstOrDefault(p => p.MovimentoId == m.Id);
            lista.Add(new PreparoPagamentoDto(m.Id, m.Numero, m.EmpresaId, nome, mail, chave, m.Liquido, m.Vencimento, m.Descricao,
                integ is null ? string.Empty : bancos.Modulo(integ.Banco)?.Nome ?? integ.Banco, Problema(m, integ, atual), atual));
        }
        return lista.OrderBy(p => p.Vencimento).ToList();
    }

    /// <summary>Agenda (ou paga hoje) cada lançamento pelo banco. Cada um responde por si: um que falha não trava os outros.</summary>
    public async Task<List<ResultadoAgendamentoDto>> AgendarAsync(AgendarPagamentosDto dto, UsuarioAtual quem, CancellationToken ct = default)
    {
        var hoje = DateOnly.FromDateTime(relogio.GetLocalNow().DateTime);
        var resultados = new List<ResultadoAgendamentoDto>();
        if (!DateOnly.TryParseExact(dto.Data ?? string.Empty, "yyyy-MM-dd", out var data) || data < hoje)
            return (dto.Itens ?? new()).Select(i => new ResultadoAgendamentoDto(i.MovimentoId, false, "Data inválida: escolha hoje ou um dia futuro.", null)).ToList();
        if (!cofre.Configurado)
            return (dto.Itens ?? new()).Select(i => new ResultadoAgendamentoDto(i.MovimentoId, false, "A chave de cifra das credenciais não está configurada neste ambiente.", null)).ToList();
        var todasInteg = await integracoes.GetAllAsync();
        foreach (var item in dto.Itens ?? new())
        {
            var r = await AgendarUmAsync(item, data.ToString("yyyy-MM-dd"), todasInteg, quem, ct);
            resultados.Add(r);
        }
        return resultados;
    }

    private async Task<ResultadoAgendamentoDto> AgendarUmAsync(ItemAgendamentoDto item, string data, List<IntegracaoBancaria> todasInteg, UsuarioAtual quem, CancellationToken ct)
    {
        var m = await movimentos.GetByIdAsync(item.MovimentoId);
        if (m is null) return new(item.MovimentoId, false, "Lançamento não encontrado.", null);
        var integ = IntegracaoDe(todasInteg, m.EmpresaId);
        var atual = (await pagamentos.ListarAsync(p => p.MovimentoId == m.Id)).FirstOrDefault(p => p.Vigente);
        if (Problema(m, integ, atual) is { Length: > 0 } problema) return new(m.Id, false, problema, atual);
        var chavePix = ChavePix.Normalizar(item.Chave);
        if (!chavePix.Ok) return new(m.Id, false, chavePix.Erro, null);
        var chave = chavePix.Chave;
        var modulo = bancos.Modulo(integ!.Banco)!.Pagamento!;
        var (nome, mail, _) = await FavorecidoAsync(m);

        var p = new PagamentoBancario
        {
            Id = Guid.NewGuid().ToString(),
            EmpresaId = m.EmpresaId,
            IntegracaoId = integ.Id,
            Banco = integ.Banco,
            Ambiente = integ.Ambiente,
            MovimentoId = m.Id,
            MovimentoNumero = m.Numero,
            FavorecidoNome = nome,
            FavorecidoEmail = mail,
            Chave = chave,
            Valor = m.Liquido,
            Data = data,
            Descricao = Descricao(m),
            Situacao = PagamentoBancario.Pendente,
        };
        // Grava antes de chamar o banco: queda no meio não perde o rastro (e o id reenviado não paga duas vezes).
        await pagamentos.AddAsync(p);
        var envio = await modulo.PagarPixAsync(cofre.Abrir(integ), new PedidoPix(p.Id, p.Valor, p.Data, p.Descricao, p.Chave), ct);
        p.IdBanco = envio.IdBanco;
        p.Mensagem = envio.Mensagem;
        p.Situacao = envio.Desfecho switch
        {
            DesfechoPagamento.Processado => PagamentoBancario.Processando, // confirma na consulta logo abaixo
            DesfechoPagamento.AguardandoAprovacao => PagamentoBancario.AguardandoAprovacao,
            DesfechoPagamento.Agendado => PagamentoBancario.Agendado,
            DesfechoPagamento.Recusado => PagamentoBancario.Recusado,
            _ => PagamentoBancario.Incerto,
        };
        await pagamentos.UpdateAsync(p.Id, p);
        await auditoria.RegistrarAsync("pagar", "PagamentoBancario", p.Id,
            $"{quem.Nome} mandou ao banco o Pix de {p.Valor.ToString("C", PtBr)} para {p.FavorecidoNome} (lançamento {m.Numero}, {p.Data}): {Rotulo(p.Situacao)}{(p.Mensagem.Length > 0 ? $" — {p.Mensagem}" : string.Empty)}");
        if (envio.Desfecho == DesfechoPagamento.Processado) p = await AtualizarAsync(p, "envio", ct) ?? p;
        var ok = p.Situacao is not (PagamentoBancario.Recusado or PagamentoBancario.Falha or PagamentoBancario.Cancelado);
        return new(m.Id, ok, ok ? Rotulo(p.Situacao) : $"O banco não aceitou: {p.Mensagem}", p);
    }

    /// <summary>Consulta no banco e aplica (botão "Atualizar" da tela).</summary>
    public async Task<Result<PagamentoBancario>> AtualizarAsync(string id, CancellationToken ct = default)
    {
        var p = await pagamentos.GetByIdAsync(id);
        if (p is null) return Result.Failure<PagamentoBancario>("Pagamento não encontrado.");
        return await AtualizarAsync(p, "tela", ct) is { } r ? Result.Success(r) : Result.Failure<PagamentoBancario>("Não foi possível consultar o banco agora.");
    }

    /// <summary>Aviso do banco (pix-pagamento): acha a integração pelo token, confere cada pagamento no banco e aplica.</summary>
    public async Task<Result<int>> ReceberAvisoAsync(string token, string corpo, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(token) || token.Length < 24) return Result.Failure<int>("Aviso sem identificação.");
        var integracao = (await integracoes.ListarAsync(i => i.AvisoToken == token)).FirstOrDefault();
        if (integracao is null || bancos.Modulo(integracao.Banco)?.Pagamento is not { } modulo) return Result.Failure<int>("Aviso desconhecido.");
        var agora = relogio.GetUtcNow().ToString("o", CultureInfo.InvariantCulture);
        var nossos = 0;
        foreach (var a in modulo.LerAviso(corpo))
        {
            var p = (await pagamentos.ListarAsync(x => x.IntegracaoId == integracao.Id && x.IdBanco == a.IdBanco)).FirstOrDefault();
            if (p is null) continue; // Pix feito fora do ELROND (no app): não é nosso
            nossos++;
            if (p.AvisoEm.Length == 0) p.AvisoEm = agora;
            if (a.DataHora.Length > 0 && p.PagoEm.Length == 0 && InterPago(a.Situacao)) p.PagoEm = a.DataHora;
            await pagamentos.UpdateAsync(p.Id, p);
            await AtualizarAsync(p, "aviso", ct);
        }
        return Result.Success(nossos);
    }

    /// <summary>Rotina: confere no banco os pagamentos que ainda esperam (rede de segurança do aviso).</summary>
    public async Task<int> ConferirAbertosAsync(CancellationToken ct = default)
    {
        var abertos = (await pagamentos.GetAllAsync()).Where(p => p.EmAberto).ToList();
        var mudaram = 0;
        foreach (var p in abertos)
        {
            var antes = p.Situacao;
            var r = await AtualizarAsync(p, "rotina", ct);
            if (r is not null && r.Situacao != antes) mudaram++;
            await Task.Delay(TimeSpan.FromSeconds(1), ct); // o Inter limita as consultas por minuto
        }
        return mudaram;
    }

    /// <summary>Consulta e aplica a situação do banco; pago → baixa no lançamento e e-mail ao favorecido.</summary>
    private async Task<PagamentoBancario?> AtualizarAsync(PagamentoBancario p, string origem, CancellationToken ct)
    {
        var integ = await integracoes.GetByIdAsync(p.IntegracaoId);
        if (integ is null || bancos.Modulo(integ.Banco)?.Pagamento is not { } modulo || !cofre.Configurado) return null;
        var credencial = cofre.Abrir(integ);
        if (p.IdBanco.Length == 0)
        {
            // Envio incerto: reenviar com o MESMO id é seguro (idempotência) e devolve o código do pagamento.
            var envio = await modulo.PagarPixAsync(credencial, new PedidoPix(p.Id, p.Valor, p.Data, p.Descricao, p.Chave), ct);
            if (envio.IdBanco.Length == 0)
            {
                if (envio.Desfecho == DesfechoPagamento.Recusado) { p.Situacao = PagamentoBancario.Recusado; p.Mensagem = envio.Mensagem; await pagamentos.UpdateAsync(p.Id, p); }
                return p;
            }
            p.IdBanco = envio.IdBanco;
        }
        var c = await modulo.ConsultarPixAsync(credencial, p.IdBanco, ct);
        if (c.Situacao is not { } s) return c.NaoExiste ? p : null;
        var antes = p.Situacao;
        p.Situacao = s.Situacao;
        p.SituacaoBanco = s.SituacaoBanco;
        if (s.EndToEnd.Length > 0) p.EndToEnd = s.EndToEnd;
        if (s.PagoEm.Length > 0) p.PagoEm = s.PagoEm;
        if (s.Mensagem.Length > 0) p.Mensagem = s.Mensagem;
        if (p.Situacao == PagamentoBancario.Pago && antes != PagamentoBancario.Pago)
        {
            p.ConfirmadaEm = relogio.GetUtcNow().ToString("o", CultureInfo.InvariantCulture);
            p.ConfirmadaPor = origem;
            await pagamentos.UpdateAsync(p.Id, p);
            await DarBaixaAsync(p, integ);
            await AvisarFavorecidoAsync(p, ct);
            await auditoria.RegistrarAsync("pago", "PagamentoBancario", p.Id,
                $"Pix de {p.Valor.ToString("C", PtBr)} para {p.FavorecidoNome} efetivado no banco (confirmado {QuemConfirmou(origem)}); lançamento {p.MovimentoNumero} baixado");
        }
        else await pagamentos.UpdateAsync(p.Id, p);
        return p;
    }

    private async Task DarBaixaAsync(PagamentoBancario p, IntegracaoBancaria integ)
    {
        var dia = p.PagoEm.Length >= 10 ? p.PagoEm[..10] : relogio.GetLocalNow().ToString("yyyy-MM-dd");
        var r = await financeiro.LiquidarAsync(new BaixaDto(new() { p.MovimentoId }, dia, integ.CarteiraId), Banco);
        // Já baixado (à mão, ou por outro aviso): está tudo certo.
        if (!r.IsSuccess) log.LogInformation("Baixa do pagamento {Id} não aplicada: {Erro}", p.Id, r.Error);
        // O Pix saiu pelo ELROND: marca o lançamento (trava estorno e alteração).
        if (await movimentos.GetByIdAsync(p.MovimentoId) is { } m && m.PagamentoBancarioId != p.Id)
        {
            m.PagamentoBancarioId = p.Id;
            await movimentos.UpdateAsync(m.Id, m);
        }
    }

    private async Task AvisarFavorecidoAsync(PagamentoBancario p, CancellationToken ct)
    {
        var quando = p.PagoEm.Length >= 10 && DateTime.TryParse(p.PagoEm, CultureInfo.InvariantCulture, DateTimeStyles.None, out var d) ? d.ToString("dd/MM/yyyy 'às' HH:mm") : relogio.GetLocalNow().ToString("dd/MM/yyyy");
        var valor = p.Valor.ToString("C", PtBr);
        var assunto = $"Pagamento efetuado · {valor}";
        var html = $"<p>Olá, {System.Net.WebUtility.HtmlEncode(p.FavorecidoNome)}.</p>" +
                   $"<p>Informamos que o pagamento de <b>{valor}</b> foi efetuado por Pix em {quando}.</p>" +
                   $"<p>Referência: {System.Net.WebUtility.HtmlEncode(p.Descricao)}{(p.EndToEnd.Length > 0 ? $"<br/>Identificador do Pix: {p.EndToEnd}" : string.Empty)}</p>";
        var texto = $"Olá, {p.FavorecidoNome}. O pagamento de {valor} foi efetuado por Pix em {quando}. Referência: {p.Descricao}." + (p.EndToEnd.Length > 0 ? $" Identificador do Pix: {p.EndToEnd}." : string.Empty);
        var r = await email.EnviarAsync(p.FavorecidoEmail, assunto, html, texto, "pagamento", p.Id, ct);
        p.EmailEm = relogio.GetUtcNow().ToString("o", CultureInfo.InvariantCulture);
        p.EmailSituacao = r.IsSuccess ? "enviado" : $"não enviado: {r.Error}";
        await pagamentos.UpdateAsync(p.Id, p);
    }

    /// <summary>Integração da empresa que paga pelo banco (ativa, com pagamento ligado e banco que paga).</summary>
    private IntegracaoBancaria? IntegracaoDe(List<IntegracaoBancaria> todas, string empresaId) =>
        todas.FirstOrDefault(i => i.EmpresaId == empresaId && i.Libera(IntegracaoBancaria.RecursoPagamento) && bancos.Modulo(i.Banco)?.Pagamento is not null);

    /// <summary>O que impede pagar este lançamento pelo banco (vazio = pode).</summary>
    private static string Problema(Movimento m, IntegracaoBancaria? integ, PagamentoBancario? atual) =>
        m.Tipo != "pagar" ? "Só lançamento a pagar." :
        m.Cancelado ? "Lançamento cancelado." :
        m.PagoEm.Length > 0 ? "Já está liquidado." :
        m.Aprovacao != "aprovado" ? "Ainda não aprovado: só lançamento aprovado vai para o banco." :
        atual is not null ? $"Já tem pagamento no banco ({Rotulo(atual.Situacao)})." :
        integ is null ? "A empresa deste lançamento não tem integração bancária com pagamento ligado (Administrativo › Integrações Bancárias)." :
        integ.CarteiraId.Length == 0 ? "A integração não tem a Conta do Caixa ligada (é nela que o pagamento é baixado)." :
        m.Liquido <= 0 ? "Valor zerado." :
        string.Empty;

    /// <summary>Favorecido do lançamento: funcionário (func-{id}) ou fornecedor, com e-mail e a chave Pix do cadastro.</summary>
    private async Task<(string Nome, string Email, string Chave)> FavorecidoAsync(Movimento m)
    {
        // Transferência entre contas: o Pix vai para a empresa da conta de destino (chave sugerida: o CNPJ dela).
        if (m.Transferencia && await movimentos.GetByIdAsync(m.OrigemId) is { } entrada
            && await carteiras.GetByIdAsync(entrada.CarteiraId) is { } destino && await empresas.GetByIdAsync(destino.EmpresaId) is { } dona)
            return ($"{dona.Nome} · {destino.Nome}", string.Empty, new string(dona.Cnpj.Where(char.IsDigit).ToArray()));
        if (m.ParceiroId.StartsWith("func-", StringComparison.Ordinal) && Guid.TryParse(m.ParceiroId[5..], out var uid) && await usuarios.FindByIdAsync(uid) is { } u)
            return (u.Name, u.Email, u.Banco?.Pix ?? string.Empty);
        if (m.ParceiroId.Length > 0 && await fornecedores.GetByIdAsync(m.ParceiroId) is { } f)
        {
            var mail = f.Email.Length > 0 ? f.Email : f.Contatos.Select(c => c.Email).FirstOrDefault(e => e.Length > 0) ?? string.Empty;
            return (f.NomeFantasia.Length > 0 ? f.NomeFantasia : f.Nome, mail, f.Banco?.Pix ?? string.Empty);
        }
        return (m.ParceiroNome, string.Empty, string.Empty);
    }

    private static string Descricao(Movimento m)
    {
        var d = $"Lanç. {m.Numero} · {m.Descricao}".Trim(' ', '·');
        return d.Length > 140 ? d[..140] : d;
    }

    private static bool InterPago(string status) => status.ToUpperInvariant() is "PAGO" or "PROCESSADO";

    private static string QuemConfirmou(string origem) => origem switch { "aviso" => "pelo aviso do banco", "rotina" => "pela conferência automática", "envio" => "na hora do envio", _ => "pela consulta na tela" };

    public static string Rotulo(string situacao) => situacao switch
    {
        PagamentoBancario.Pendente => "enviando ao banco",
        PagamentoBancario.AguardandoAprovacao => "aguardando aprovação no app do banco",
        PagamentoBancario.Agendado => "agendado no banco",
        PagamentoBancario.Processando => "em processamento no banco",
        PagamentoBancario.Pago => "pago",
        PagamentoBancario.Recusado => "recusado pelo banco",
        PagamentoBancario.Cancelado => "cancelado no banco",
        PagamentoBancario.Falha => "falhou no banco",
        _ => "sem confirmação do banco (conferindo)",
    };
}

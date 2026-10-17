using System.Globalization;
using System.Text.Json;
using Elrond.Application.Common;
using Elrond.Application.Interfaces;
using Elrond.Domain.Entities;
using Elrond.Domain.Regras;

namespace Elrond.Application.Services;

/// <summary>
/// Cadastro ou alteração do contrato. Empresa, modelo e modalidade só valem na criação. Itens = o
/// escopo que vale a partir de agora: se mudou, vira uma versão nova a partir de <see cref="AditivoDesde"/>.
/// </summary>
public sealed record SalvarContratoDto(
    string EmpresaId, string ClienteId, string ModeloId, string Modalidade, string Inicio, string? Fim,
    CondicoesContrato Condicoes, List<ItemEscopo> Itens,
    string? Contato = null, string? Situacao = null, string? LocalServico = null, string? PropostaId = null,
    string? ServicoId = null, string? TextoAdicionalNota = null, List<CaracteristicaContrato>? Caracteristicas = null,
    List<ComponenteContrato>? Componentes = null, string? AditivoDesde = null, string? AditivoMotivo = null);

public interface IContratoService
{
    Task<ContratosEFaturas> ListarAsync();
    Task<ContratosEFaturas?> ObterAsync(string id);
    Task<Result<Contrato>> CriarAsync(SalvarContratoDto dto);
    Task<Result<Contrato>> AtualizarAsync(string id, SalvarContratoDto dto);
    Task<Result<Contrato>> LancarExtraAsync(string id, ExtraContrato extra);
    Task<Result<Contrato>> MudarCobrancaExtraAsync(string id, string extraId, string cobranca);
    Task<Result<Contrato>> AlternarComponenteAsync(string id, string componenteId);
    /// <summary>Inclui ou atualiza um documento da operação (frete com CT-e) vinculado ao contrato.</summary>
    Task<Result<Contrato>> SalvarDocumentoAsync(string id, DocumentoVinculado doc);
}

/// <summary>
/// A pasta do contrato: cadastro (cliente, modelo, escopo por versão, condições), extras,
/// componentes e documentos vinculados, com o histórico do que aconteceu. Toda mudança
/// ressincroniza as faturas ainda não emitidas (elas são fotografia do contrato).
/// </summary>
public sealed class ContratoService(
    ICrudRepository<Contrato> contratos,
    ICrudRepository<ModeloContrato> modelos,
    ICrudRepository<Empresa> empresas,
    ICrudRepository<Cliente> clientes,
    ICrudRepository<Proposta> propostas,
    IContratoNumerador numerador,
    IFaturamentoService faturamento,
    IUsuarioAtualProvider usuario,
    TimeProvider relogio) : IContratoService
{
    private static readonly CultureInfo PtBr = CultureInfo.GetCultureInfo("pt-BR");
    private static readonly string[] Situacoes = ["vigente", "suspenso", "encerrado"];
    private static readonly string[] TiposExtra = ["hora-extra", "custo-extra", "ocorrencia"];
    private static readonly string[] Cobrancas = [CobrancaExtra.ProximaFatura, CobrancaExtra.Separado, CobrancaExtra.NaoCobrar];

    private string Agora => relogio.GetUtcNow().ToString("o", CultureInfo.InvariantCulture);
    private string Hoje => DateOnly.FromDateTime(relogio.GetLocalNow().DateTime).ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);
    private async Task<string> QuemAsync() => (await usuario.QuemAsync()).Nome is { Length: > 0 } n ? n : "sistema";
    private static bool Data(string? s) => DateOnly.TryParseExact(s ?? string.Empty, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out _);
    private static string Br(string iso) => $"{iso[8..10]}/{iso[5..7]}/{iso[..4]}";

    public async Task<ContratosEFaturas> ListarAsync()
    {
        var todos = await contratos.GetAllAsync();
        return new ContratosEFaturas(todos, await faturamento.SincronizarAsync(todos));
    }

    public async Task<ContratosEFaturas?> ObterAsync(string id) =>
        await contratos.GetByIdAsync(id) is { } c ? new ContratosEFaturas([c], await faturamento.SincronizarAsync([c])) : null;

    public async Task<Result<Contrato>> CriarAsync(SalvarContratoDto dto)
    {
        if (await empresas.GetByIdAsync(dto.EmpresaId) is null) return Result.Failure<Contrato>("Escolha a empresa que presta o serviço.");
        if (dto.Modalidade is not (Modalidade.Recorrente or Modalidade.Spot)) return Result.Failure<Contrato>("Modalidade inválida: recorrente ou spot.");
        // Cobrança avulsa (reembolso, multa contratual) é um spot sem modelo: nenhuma fatura existe solta, sem pasta.
        var modelo = string.IsNullOrEmpty(dto.ModeloId) ? null : await modelos.GetByIdAsync(dto.ModeloId);
        if (modelo is not { Status: "ativo" } && (dto.Modalidade != Modalidade.Spot || modelo is not null))
            return Result.Failure<Contrato>("Escolha um modelo de contrato ativo.");

        var c = new Contrato
        {
            Id = Guid.NewGuid().ToString(),
            EmpresaId = dto.EmpresaId,
            ModeloId = modelo?.Id ?? string.Empty,
            TipoOperacao = modelo?.TipoOperacao ?? "Cobrança avulsa",
            Modalidade = dto.Modalidade,
            ServicoId = modelo?.ServicoId ?? string.Empty,
            // Sem componentes enviados: os do modelo (os fixos viram linhas do escopo).
            Componentes = modelo?.Componentes.Where(x => x.Regra != RegraComponente.Fixo).Select(Copiar).ToList() ?? [],
        };
        if (await AplicarAsync(c, dto, modelo) is { } erro) return Result.Failure<Contrato>(erro);
        if (string.IsNullOrEmpty(c.Condicoes.FaturarDesde)) c.Condicoes.FaturarDesde = Hoje[..7];

        var proposta = c.PropostaNumero.Length > 0 ? $" a partir da proposta {c.PropostaNumero}" : string.Empty;
        c.Escopo = [new VersaoEscopo { Versao = 1, VigenteDesde = c.Inicio, Motivo = proposta.Length > 0 ? $"Proposta {c.PropostaNumero} aprovada" : "Cadastro do contrato", Itens = dto.Itens }];
        c.Numero = await numerador.ProximoAsync(c.EmpresaId);
        c.Eventos.Add(await EventoAsync("assinatura", c.Spot ? $"Spot cadastrado{proposta}" : $"Contrato cadastrado{proposta}"));
        await contratos.AddAsync(c);
        await faturamento.SincronizarAsync([c]);
        return Result.Success(c);
    }

    public async Task<Result<Contrato>> AtualizarAsync(string id, SalvarContratoDto dto)
    {
        if (await contratos.GetByIdAsync(id) is not { } c) return Result.Failure<Contrato>("Contrato não encontrado.");
        var modelo = await modelos.GetByIdAsync(c.ModeloId);
        var situacaoAntes = c.Situacao;
        if (await AplicarAsync(c, dto, modelo) is { } erro) return Result.Failure<Contrato>(erro);

        var vigente = c.EscopoEm(Hoje);
        var eventosAntes = c.Eventos.Count;
        if (vigente is null || JsonSerializer.Serialize(vigente.Itens) != JsonSerializer.Serialize(dto.Itens))
        {
            if (!Data(dto.AditivoDesde) || string.CompareOrdinal(dto.AditivoDesde, c.Inicio) < 0)
                return Result.Failure<Contrato>("O escopo mudou: informe a data a partir de quando vale (não antes do início do contrato).");
            var versao = c.Escopo.Count == 0 ? 1 : c.Escopo.Max(v => v.Versao) + 1;
            var motivo = string.IsNullOrWhiteSpace(dto.AditivoMotivo) ? "Alteração do escopo" : dto.AditivoMotivo.Trim();
            c.Escopo.Add(new VersaoEscopo { Versao = versao, VigenteDesde = dto.AditivoDesde!, Motivo = motivo, Itens = dto.Itens });
            c.Eventos.Add(await EventoAsync("aditivo", $"{motivo}: versão {versao} do escopo a partir de {Br(dto.AditivoDesde!)}"));
        }
        if (situacaoAntes != c.Situacao)
            c.Eventos.Add(await EventoAsync(c.Situacao == "encerrado" ? "encerramento" : "renovacao", c.Situacao switch
            {
                "encerrado" => "Contrato encerrado",
                "suspenso" => "Contrato suspenso: não gera fatura nova enquanto estiver assim",
                _ => "Contrato reativado",
            }));
        else if (c.Eventos.Count == eventosAntes)
            c.Eventos.Add(await EventoAsync("documento", "Cadastro do contrato alterado"));
        return await GravarAsync(c);
    }

    public async Task<Result<Contrato>> LancarExtraAsync(string id, ExtraContrato e)
    {
        if (await contratos.GetByIdAsync(id) is not { } c) return Result.Failure<Contrato>("Contrato não encontrado.");
        if (string.IsNullOrWhiteSpace(e.Descricao)) return Result.Failure<Contrato>("Descreva o extra.");
        if (!TiposExtra.Contains(e.Tipo) || !Cobrancas.Contains(e.Cobranca)) return Result.Failure<Contrato>("Tipo ou forma de cobrança inválida.");
        if (e.Quantidade < 0 || e.ValorUnitario < 0) return Result.Failure<Contrato>("Quantidade e valor não podem ser negativos.");
        e.Id = Guid.NewGuid().ToString();
        e.Descricao = e.Descricao.Trim();
        e.Data = Data(e.Data) ? e.Data : Hoje;
        e.FaturadoEm = string.Empty;
        e.LancadoPor = await QuemAsync();
        c.Extras.Insert(0, e);
        var cobranca = e.Cobranca switch { CobrancaExtra.Separado => "faturar separado", CobrancaExtra.NaoCobrar => "não cobrar", _ => "na próxima fatura" };
        c.Eventos.Add(await EventoAsync(e.Tipo == "ocorrencia" ? "ocorrencia" : "extra", $"Extra lançado: {e.Descricao} ({e.Valor.ToString("C", PtBr)}, {cobranca})"));
        return await GravarAsync(c);
    }

    public async Task<Result<Contrato>> MudarCobrancaExtraAsync(string id, string extraId, string cobranca)
    {
        if (await contratos.GetByIdAsync(id) is not { } c) return Result.Failure<Contrato>("Contrato não encontrado.");
        if (c.Extras.FirstOrDefault(x => x.Id == extraId) is not { } e) return Result.Failure<Contrato>("Extra não encontrado.");
        if (e.FaturadoEm.Length > 0) return Result.Failure<Contrato>("Este extra já foi faturado.");
        if (!Cobrancas.Contains(cobranca)) return Result.Failure<Contrato>("Forma de cobrança inválida.");
        e.Cobranca = cobranca;
        return await GravarAsync(c);
    }

    public async Task<Result<Contrato>> AlternarComponenteAsync(string id, string componenteId)
    {
        if (await contratos.GetByIdAsync(id) is not { } c) return Result.Failure<Contrato>("Contrato não encontrado.");
        if (c.Componentes.FirstOrDefault(x => x.Id == componenteId) is not { } comp) return Result.Failure<Contrato>("Componente não encontrado.");
        comp.Ativo = !comp.Ativo;
        c.Eventos.Add(await EventoAsync("aditivo", $"{comp.Nome} {(comp.Ativo ? "ligado" : "desligado")} no contrato"));
        return await GravarAsync(c);
    }

    public async Task<Result<Contrato>> SalvarDocumentoAsync(string id, DocumentoVinculado doc)
    {
        if (await contratos.GetByIdAsync(id) is not { } c) return Result.Failure<Contrato>("Contrato não encontrado.");
        if (string.IsNullOrWhiteSpace(doc.Numero) || !Data(doc.Data)) return Result.Failure<Contrato>("Informe o número e a data do documento.");
        if (doc.Valor < 0) return Result.Failure<Contrato>("O valor não pode ser negativo.");
        if (doc.Situacao is not ("em-transito" or "entregue" or "cancelado")) return Result.Failure<Contrato>("Situação do documento inválida.");
        var atual = c.Documentos.FirstOrDefault(d => d.Id == doc.Id && doc.Id.Length > 0);
        if (atual is null && c.Documentos.Any(d => d.Tipo == doc.Tipo && d.Numero == doc.Numero.Trim()))
            return Result.Failure<Contrato>($"O {doc.Tipo} {doc.Numero} já está vinculado a este contrato.");
        doc.Numero = doc.Numero.Trim();
        if (atual is null)
        {
            doc.Id = Guid.NewGuid().ToString();
            c.Documentos.Add(doc);
            c.Eventos.Add(await EventoAsync("documento", $"{doc.Tipo} {doc.Numero} vinculado ({doc.Valor.ToString("C", PtBr)})"));
        }
        else c.Documentos[c.Documentos.IndexOf(atual)] = doc;
        return await GravarAsync(c);
    }

    // ── internos ──

    private async Task<Result<Contrato>> GravarAsync(Contrato c)
    {
        await contratos.UpdateAsync(c.Id, c);
        await faturamento.SincronizarAsync([c]);
        return Result.Success(c);
    }

    private async Task<EventoContrato> EventoAsync(string tipo, string texto) =>
        new() { Em = Agora, Tipo = tipo, Texto = texto, Quem = await QuemAsync() };

    private static ComponenteContrato Copiar(ComponenteModelo m) => new()
    {
        Id = Guid.NewGuid().ToString(),
        Apelido = m.Apelido,
        Nome = m.Nome,
        Regra = m.Regra,
        Unidade = m.Unidade,
        ValorUnitario = m.ValorPadrao,
        Quantidade = m.Regra == RegraComponente.Unico ? 1 : 0,
        Formula = m.Formula,
        Documento = m.Documento,
        Ativo = !m.Opcional,
    };

    /// <summary>Confere e aplica o que pode mudar no contrato. Devolve o problema ou null.</summary>
    private async Task<string?> AplicarAsync(Contrato c, SalvarContratoDto d, ModeloContrato? modelo)
    {
        if (await clientes.GetByIdAsync(d.ClienteId) is not { } cliente) return "Escolha o cliente no cadastro.";
        if (!Data(d.Inicio)) return c.Spot ? "Informe a data do serviço." : "Informe o início da vigência.";
        if (!c.Spot && (!Data(d.Fim) || string.CompareOrdinal(d.Fim, d.Inicio) <= 0)) return "O fim da vigência precisa ser depois do início.";
        if (d.Itens.Count == 0) return "Inclua pelo menos uma linha no escopo.";
        if (d.Itens.Any(i => i.Quantidade < 0 || i.ValorUnitario < 0 || i.CustoUnitario < 0)) return "Quantidade, preço e custo não podem ser negativos.";
        var k = d.Condicoes;
        if (k.DiaFaturamento is < 1 or > 28 || k.DiaVencimento is < 1 or > 28) return "Dia do faturamento e do vencimento vão de 1 a 28.";
        if (k.FaturarDesde.Length > 0 && !DateOnly.TryParseExact(k.FaturarDesde + "-01", "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out _))
            return "\"Faturar a partir de\" precisa ser um mês (aaaa-mm).";
        if (d.Situacao is { Length: > 0 } s && !c.Spot && !Situacoes.Contains(s)) return "Situação inválida.";

        var caracteristicas = (d.Caracteristicas ?? c.Caracteristicas).Where(x => x.Valor.Trim().Length > 0).ToList();
        var faltando = modelo?.Campos.Where(f => f.Obrigatorio && caracteristicas.All(x => x.Apelido != f.Apelido)).Select(f => f.Nome).ToList() ?? [];
        if (faltando.Count > 0) return $"Preencha: {string.Join(", ", faltando)}.";
        var componentes = d.Componentes ?? c.Componentes;
        var previa = FaturamentoContrato.Calcular(d.Itens, componentes, caracteristicas, primeiraFatura: true);
        if (previa.Linhas.FirstOrDefault(l => l.Erro.Length > 0) is { } ruim) return $"Fórmula de \"{ruim.Nome}\": {ruim.Erro}";

        if (d.PropostaId is { Length: > 0 } pid && pid != c.PropostaId)
        {
            if (await propostas.GetByIdAsync(pid) is not { Status: "aprovada" } p) return "A proposta escolhida não está aprovada.";
            c.PropostaId = p.Id;
            c.PropostaNumero = p.Numero;
        }
        c.ClienteId = cliente.Id;
        c.ClienteNome = cliente.Nome;
        c.ClienteDocumento = cliente.CpfCnpj;
        c.Contato = d.Contato?.Trim() is { Length: > 0 } contato ? contato : cliente.Contato;
        c.Inicio = d.Inicio;
        c.Fim = c.Spot ? d.Inicio : d.Fim!;
        c.LocalServico = (d.LocalServico ?? string.Empty).Trim();
        c.Situacao = c.Spot ? "vigente" : d.Situacao is { Length: > 0 } sit ? sit : c.Situacao;
        if (d.ServicoId is not null) c.ServicoId = d.ServicoId;
        c.TextoAdicionalNota = (d.TextoAdicionalNota ?? string.Empty).Trim();
        c.Condicoes = k;
        c.Caracteristicas = caracteristicas;
        c.Componentes = componentes;
        return null;
    }
}

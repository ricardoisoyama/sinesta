using Elrond.API.Security;
using Elrond.Application.Interfaces;
using Elrond.Application.Services;
using Elrond.Domain.Entities;
using Elrond.Domain.Regras;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Elrond.API.Controllers;

/// <summary>Modelos de Contrato (Parametrizações): campos com apelido e componentes de cobrança.</summary>
[Route("api/modelos-contrato")]
public class ModelosContratoController(ICrudRepository<ModeloContrato> repo) : CrudControllerBase<ModeloContrato>(repo)
{
    private static readonly string[] Numericos = ["numero", "valor", "percentual"];

    protected override Task<string?> AntesDeGravarAsync(ModeloContrato m)
    {
        if (string.IsNullOrWhiteSpace(m.Nome)) return Pronto("Dê um nome ao modelo.");
        var apelidos = m.Campos.Select(c => c.Apelido).Concat(m.Componentes.Select(c => c.Apelido)).ToList();
        if (apelidos.FirstOrDefault(a => a.Length == 0 || Formula.ChaveDe(a) != a) is { } ruim)
            return Pronto($"Apelido \"{ruim}\" inválido: use só letras minúsculas, números e _.");
        if (apelidos.GroupBy(a => a).FirstOrDefault(g => g.Count() > 1) is { } repetido)
            return Pronto($"O apelido \"{repetido.Key}\" aparece duas vezes.");
        if (m.Componentes.FirstOrDefault(c => !RegraComponente.Todas.Contains(c.Regra)) is { } regra)
            return Pronto($"Regra inválida em \"{regra.Nome}\".");

        // Fórmula só usa o que existe: componentes fixos e outras fórmulas, campos numéricos e "subtotal".
        var conhecidos = m.Componentes.Where(c => c.Regra is RegraComponente.Fixo or RegraComponente.Formula).Select(c => c.Apelido)
            .Concat(m.Campos.Where(c => Numericos.Contains(c.Tipo)).Select(c => c.Apelido)).Append("subtotal").ToHashSet();
        foreach (var c in m.Componentes.Where(c => c.Regra == RegraComponente.Formula))
        {
            if (string.IsNullOrWhiteSpace(c.Formula)) return Pronto($"Escreva a fórmula de \"{c.Nome}\".");
            if (Formula.Referencias(c.Formula).FirstOrDefault(r => !conhecidos.Contains(r)) is { } fora)
                return Pronto($"Fórmula de \"{c.Nome}\": apelido desconhecido \"{fora}\".");
        }
        if (m.Agrupamento is not ("periodo" or "por-documento") || m.Fechamento is not ("mensal" or "quinzenal" or "semanal"))
            return Pronto("Agrupamento ou fechamento inválido.");
        return Pronto(null);
    }

    private static Task<string?> Pronto(string? erro) => Task.FromResult(erro);
}

/// <summary>Cenários da Projeção (as hipóteses vivem só no cenário).</summary>
[Route("api/cenarios-projecao")]
public class CenariosProjecaoController(ICrudRepository<CenarioProjecao> repo) : CrudControllerBase<CenarioProjecao>(repo)
{
    private static readonly string[] Tipos = ["novo-custo", "reajuste-custos", "variacao-meta", "nova-receita", "cortar-custo", "custo-variavel"];

    protected override Task<string?> AntesDeGravarAsync(CenarioProjecao c) => Task.FromResult(
        string.IsNullOrWhiteSpace(c.Nome) ? "Dê um nome ao cenário."
        : c.Hipoteses.Any(h => !Tipos.Contains(h.Tipo)) ? "Tipo de hipótese inválido."
        : c.Hipoteses.Any(h => h.Inicio.Length != 7 || (h.Fim.Length > 0 && string.CompareOrdinal(h.Fim, h.Inicio) < 0)) ? "Confira o período das hipóteses (aaaa-mm)."
        : Math.Abs(c.Sensibilidade) > 0.5m ? "A sensibilidade vai de −50% a +50%."
        : null);
}

/// <summary>A pasta do contrato: cadastro, extras, componentes e documentos vinculados.</summary>
[ApiController]
[Authorize]
[Route("api/contratos")]
public class ContratosController(IContratoService servico) : ControllerBase
{
    public sealed record CobrancaDto(string Cobranca);

    [HttpGet]
    public async Task<IActionResult> Listar() => Ok(await servico.ListarAsync());

    [HttpGet("{id}")]
    public async Task<IActionResult> Obter(string id) => await servico.ObterAsync(id) is { } r ? Ok(r) : NotFound();

    [HttpPost]
    public async Task<IActionResult> Criar([FromBody] SalvarContratoDto dto) => Resposta(await servico.CriarAsync(dto));

    [HttpPut("{id}")]
    public async Task<IActionResult> Atualizar(string id, [FromBody] SalvarContratoDto dto) => Resposta(await servico.AtualizarAsync(id, dto));

    [HttpPost("{id}/extras")]
    public async Task<IActionResult> LancarExtra(string id, [FromBody] ExtraContrato extra) => Resposta(await servico.LancarExtraAsync(id, extra));

    [HttpPut("{id}/extras/{extraId}")]
    public async Task<IActionResult> MudarCobranca(string id, string extraId, [FromBody] CobrancaDto dto) => Resposta(await servico.MudarCobrancaExtraAsync(id, extraId, dto.Cobranca));

    [HttpPost("{id}/componentes/{componenteId}/alternar")]
    public async Task<IActionResult> AlternarComponente(string id, string componenteId) => Resposta(await servico.AlternarComponenteAsync(id, componenteId));

    [HttpPost("{id}/documentos")]
    public async Task<IActionResult> SalvarDocumento(string id, [FromBody] DocumentoVinculado doc) => Resposta(await servico.SalvarDocumentoAsync(id, doc));

    private IActionResult Resposta(Application.Common.Result<Contrato> r) => r.IsSuccess ? Ok(r.Value) : BadRequest(r.Error);
}

/// <summary>Central de Faturamento: as faturas do mês e as etapas da esteira.</summary>
[ApiController]
[Authorize]
[Route("api/faturas")]
public class FaturasController(IFaturamentoService servico, EmissaoNfseFatura nfse) : ControllerBase
{
    public sealed record LoteDto(List<string> Ids);

    /// <summary>NFS-e das faturas (a Central pede para as que têm nota): a emitida vira a NF da fatura aqui.</summary>
    [HttpPost("nfse/situacao")]
    public async Task<IActionResult> SituacaoNfse([FromBody] LoteDto dto, CancellationToken ct) => Ok(await nfse.DasFaturasAsync(dto.Ids ?? new(), ct));

    /// <summary>Emite a NFS-e da fatura conferida (serviço do contrato + impostos da empresa + cliente).</summary>
    [HttpPost("{id}/nfse")]
    [Authorize(Policy = "func:" + NfseController.Permissao)]
    public async Task<IActionResult> EmitirNfse(string id, CancellationToken ct)
    {
        var r = await nfse.EmitirAsync(id, ct);
        return r.IsSuccess ? Ok(r.Value) : BadRequest(r.Error);
    }

    /// <summary>Pergunta à prefeitura agora (sem esperar o acompanhamento de minuto em minuto).</summary>
    [HttpPost("{id}/nfse/atualizar")]
    public async Task<IActionResult> AtualizarNfse(string id, CancellationToken ct)
    {
        var r = await nfse.AtualizarAsync(id, ct);
        return r.IsSuccess ? Ok(r.Value) : BadRequest(r.Error);
    }

    [HttpGet]
    public async Task<IActionResult> DoMes([FromQuery] string competencia) =>
        competencia is { Length: 7 } ? Ok(await servico.DoMesAsync(competencia)) : BadRequest("Informe a competência (aaaa-mm).");

    /// <summary>conferir | devolver | reenviar | nf | boleto | recebimento.</summary>
    [HttpPost("{id}/{etapa}")]
    public async Task<IActionResult> Avancar(string id, string etapa, [FromBody] EtapaFaturaDto dados)
    {
        var r = await servico.AvancarAsync(id, etapa, dados);
        return r.IsSuccess ? Ok(r.Value) : BadRequest(r.Error);
    }

    [HttpPost("lote/conferir")]
    public async Task<IActionResult> ConferirLote([FromBody] LoteDto dto)
    {
        var r = await servico.ConferirLoteAsync(dto.Ids);
        return r.IsSuccess ? Ok(new { conferidas = r.Value }) : BadRequest(r.Error);
    }
}

/// <summary>
/// Pendentes de faturamento (piloto com a SIIMP): CT-es e minutas do período que ainda não estão em
/// nenhuma fatura. A consulta à SIIMP roda em segundo plano (POST começa, GET situacao acompanha).
/// </summary>
[ApiController]
[Authorize]
[Route("api/faturamento-pendente")]
public class FaturamentoPendenteController(PendentesFaturamentoService service, Elrond.API.Background.ConsultaPendentesSiimp consulta, UsuarioContexto usuario) : ControllerBase
{
    public record ConsultarDto(string De, string Ate);

    [HttpGet]
    public async Task<IActionResult> Listar([FromQuery] string de, [FromQuery] string ate) =>
        string.IsNullOrWhiteSpace(de) || string.IsNullOrWhiteSpace(ate) ? BadRequest("Informe o período.") : Ok(await service.ListarAsync(de, ate));

    [HttpGet("situacao")]
    public IActionResult Situacao() => Ok(consulta.Situacao);

    [HttpPost("consultar")]
    public async Task<IActionResult> Consultar([FromBody] ConsultarDto dto)
    {
        if (service.Validar(dto.De, dto.Ate) is { } erro) return BadRequest(erro);
        return Ok(consulta.Iniciar(dto.De, dto.Ate, await usuario.QuemAsync()));
    }
}

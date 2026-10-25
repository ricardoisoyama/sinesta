using Elrond.API.Security;
using Elrond.Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Elrond.API.Controllers;

/// <summary>
/// Faturas ao cliente a partir dos CT-es e minutas pendentes (Central de Faturamento): sugestão e prévia
/// (nada gravado), faturar (número, lançamento, boleto e e-mail), reenviar, boleto de novo e cancelar.
/// </summary>
[ApiController]
[Authorize]
[Route("api/faturas-clientes")]
public class FaturasClientesController(FaturaClienteService service, UsuarioContexto usuario) : ControllerBase
{
    public record CancelarDto(string Motivo);

    [HttpGet]
    public async Task<IActionResult> Listar([FromQuery] string de, [FromQuery] string ate, [FromQuery] string? empresaId) =>
        string.IsNullOrWhiteSpace(de) || string.IsNullOrWhiteSpace(ate) ? BadRequest("Informe o período.") : Ok(await service.ListarAsync(empresaId, de, ate));

    [HttpGet("{id}")]
    public async Task<IActionResult> Obter(string id)
    {
        var r = await service.ObterAsync(id);
        return r.IsSuccess ? Ok(r.Value) : NotFound(r.Error);
    }

    [HttpGet("{id}/pdf")]
    public async Task<IActionResult> Pdf(string id)
    {
        var r = await service.PdfAsync(id);
        return r.IsSuccess ? File(r.Value!, "application/pdf") : NotFound(r.Error);
    }

    [HttpPost("sugestao")]
    public async Task<IActionResult> Sugestao([FromBody] FaturarDto dto, CancellationToken ct)
    {
        var r = await service.SugerirAsync(dto, ct);
        return r.IsSuccess ? Ok(r.Value) : BadRequest(r.Error);
    }

    [HttpPost("previa")]
    public async Task<IActionResult> Previa([FromBody] FaturarDto dto, CancellationToken ct)
    {
        var r = await service.PreviaAsync(dto, ct);
        return r.IsSuccess ? File(r.Value!, "application/pdf") : BadRequest(r.Error);
    }

    [HttpPost]
    public async Task<IActionResult> Faturar([FromBody] FaturarDto dto, CancellationToken ct)
    {
        var r = await service.FaturarAsync(dto, await usuario.QuemAsync(), ct);
        return r.IsSuccess ? Ok(r.Value) : BadRequest(r.Error);
    }

    [HttpPost("{id}/enviar")]
    public async Task<IActionResult> Enviar(string id, CancellationToken ct)
    {
        var r = await service.EnviarAsync(id, await usuario.QuemAsync(), ct);
        return r.IsSuccess ? Ok(r.Value) : BadRequest(r.Error);
    }

    [HttpPost("{id}/boleto")]
    public async Task<IActionResult> Boleto(string id, CancellationToken ct)
    {
        var r = await service.EmitirBoletoAsync(id, await usuario.QuemAsync(), ct);
        return r.IsSuccess ? Ok(r.Value) : BadRequest(r.Error);
    }

    [HttpPost("{id}/cancelar")]
    public async Task<IActionResult> Cancelar(string id, [FromBody] CancelarDto dto, CancellationToken ct)
    {
        var r = await service.CancelarAsync(id, dto.Motivo, await usuario.QuemAsync(), ct);
        return r.IsSuccess ? Ok(r.Value) : BadRequest(r.Error);
    }
}

/// <summary>Administrativo › Numerações: todos leem (a fatura mostra o próximo número); só quem tem a tela altera.</summary>
[ApiController]
[Route("api/numeracoes")]
public class NumeracoesController(NumeracaoService service, UsuarioContexto usuario) : ControllerBase
{
    [HttpGet]
    [Authorize]
    public async Task<IActionResult> Listar() => Ok(await service.ListarAsync());

    [HttpPut("{empresaId}/{tipo}")]
    [Authorize(Policy = "func:/administrativo/numeracoes")]
    public async Task<IActionResult> Salvar(string empresaId, string tipo, [FromBody] SalvarNumeracaoDto dto)
    {
        var r = await service.SalvarAsync(empresaId, tipo, dto, await usuario.QuemAsync());
        return r.IsSuccess ? Ok(r.Value) : BadRequest(r.Error);
    }
}

/// <summary>Gerencial › Curva ABC: só lê, mas mostra receita e despesa: exige a tela.</summary>
[ApiController]
[Route("api/analises/curva-abc")]
[Authorize(Policy = "func:/analises/curva-abc")]
public class CurvaAbcController(CurvaAbcService service) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Calcular([FromQuery] string dimensao, [FromQuery] string de, [FromQuery] string ate, [FromQuery] string? empresaId,
        [FromQuery] string natureza = "receita", [FromQuery] string @base = "lancado", [FromQuery] decimal corteA = 0.8m, [FromQuery] decimal corteB = 0.95m)
    {
        var r = await service.CalcularAsync(new PedidoCurvaAbc(dimensao, de, ate, empresaId, natureza, @base, corteA, corteB));
        return r.IsSuccess ? Ok(r.Value) : BadRequest(r.Error);
    }
}

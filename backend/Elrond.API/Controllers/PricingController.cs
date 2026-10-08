using Elrond.Application.DTOs;
using Elrond.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Elrond.API.Controllers;

[ApiController]
[Authorize]
[Route("api/pricing")]
public class PricingController : ControllerBase
{
    private readonly IPricingService _pricing;
    private readonly IFatorService _fator;

    public PricingController(IPricingService pricing, IFatorService fator)
    {
        _pricing = pricing;
        _fator = fator;
    }

    /// <summary>
    /// Motor do fator: composição DF% + DV + lucro → fator de uma empresa. Com o rascunho do
    /// formulário em <c>empresa</c>, simula antes de salvar (a tela da empresa recalcula ao vivo).
    /// Só calcula, não grava nada.
    /// </summary>
    [HttpPost("fator")]
    public async Task<IActionResult> Fator([FromBody] CalcularFatorRequest req)
    {
        var r = await _fator.CalcularAsync(req);
        return r.IsSuccess ? Ok(r.Value) : BadRequest(r.Error);
    }

    /// <summary>Calcula PV, margem e preço final com impostos (fonte da verdade).</summary>
    [HttpPost("calculate")]
    public async Task<IActionResult> Calculate([FromBody] CalcularPrecoRequest req)
    {
        var result = await _pricing.CalcularAsync(req);
        if (!result.IsSuccess)
            return Problem(detail: result.Error, statusCode: StatusCodes.Status422UnprocessableEntity, title: "Falha ao precificar.");
        return Ok(result.Value);
    }
}

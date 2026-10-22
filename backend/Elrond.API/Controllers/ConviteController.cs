using Elrond.Application.DTOs;
using Elrond.Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace Elrond.API.Controllers;

/// <summary>
/// Link do convite (público): abrir mostra quem é e registra o clique; aceitar cria a senha.
/// Mesmo limite de tentativas do login.
/// </summary>
[ApiController]
[AllowAnonymous]
[Route("api/convite")]
[EnableRateLimiting("login")]
public class ConviteController(ConviteService convite) : ControllerBase
{
    [HttpGet("{token}")]
    public async Task<IActionResult> Abrir(string token)
    {
        var r = await convite.AbrirAsync(token);
        return r.IsSuccess ? Ok(r.Value) : BadRequest(r.Error);
    }

    [HttpPost("{token}")]
    public async Task<IActionResult> Aceitar(string token, [FromBody] AceitarConviteDto dto)
    {
        var r = await convite.AceitarAsync(token, dto.Senha);
        return r.IsSuccess ? Ok(new { email = r.Value }) : BadRequest(r.Error);
    }
}

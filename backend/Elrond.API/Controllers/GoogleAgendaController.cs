using Elrond.API.Security;
using Elrond.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Elrond.API.Controllers;

/// <summary>
/// Ligação da Agenda com o Google Agenda de cada usuário. O retorno do Google é aberto pelo
/// navegador (sem o token do ELROND): quem ele é vem do estado assinado no pedido de conexão.
/// </summary>
[ApiController]
[Authorize]
[Route("api/integracoes/google")]
public class GoogleAgendaController(IGoogleAgendaService google, UsuarioContexto usuario, IConfiguration config) : ControllerBase
{
    [HttpGet("status")]
    public async Task<IActionResult> Status() =>
        await usuario.AtualAsync() is { } eu ? Ok(await google.StatusAsync(eu.Id.ToString())) : Unauthorized();

    /// <summary>Endereço do Google para autorizar (a tela redireciona o navegador para ele).</summary>
    [HttpGet("conectar")]
    public async Task<IActionResult> Conectar()
    {
        if (await usuario.AtualAsync() is not { } eu) return Unauthorized();
        var r = google.UrlConectar(eu.Id.ToString(), eu.Email);
        return r.IsSuccess ? Ok(new { url = r.Value }) : BadRequest(r.Error);
    }

    [AllowAnonymous]
    [HttpGet("retorno")]
    public async Task<IActionResult> Retorno([FromQuery] string? code, [FromQuery] string? state, [FromQuery] string? error)
    {
        var agenda = $"{(config["App:UrlPublica"] ?? string.Empty).TrimEnd('/')}/agenda";
        if (!string.IsNullOrEmpty(error) || string.IsNullOrEmpty(code) || string.IsNullOrEmpty(state))
            return Redirect($"{agenda}?google=erro&motivo={Uri.EscapeDataString(error == "access_denied" ? "Você cancelou a autorização no Google." : "O Google não concluiu a autorização.")}");
        var r = await google.ConcluirConexaoAsync(code, state);
        return Redirect(r.IsSuccess ? $"{agenda}?google=conectado" : $"{agenda}?google=erro&motivo={Uri.EscapeDataString(r.Error!)}");
    }

    [HttpPost("desconectar")]
    public async Task<IActionResult> Desconectar()
    {
        if (await usuario.AtualAsync() is not { } eu) return Unauthorized();
        await google.DesconectarAsync(eu.Id.ToString());
        return NoContent();
    }

    [HttpPost("sincronizar")]
    public async Task<IActionResult> Sincronizar()
    {
        if (await usuario.AtualAsync() is not { } eu) return Unauthorized();
        var r = await google.SincronizarUsuarioAsync(eu.Id.ToString());
        return r.IsSuccess ? Ok(new { enviados = r.Value }) : BadRequest(r.Error);
    }

    /// <summary>Muda um evento pessoal do Google pela Agenda do ELROND.</summary>
    [HttpPut("eventos/{eventId}")]
    public async Task<IActionResult> AlterarEvento(string eventId, [FromBody] EventoGoogleDto dto)
    {
        if (await usuario.AtualAsync() is not { } eu) return Unauthorized();
        var r = await google.AlterarEventoGoogleAsync(eu.Id.ToString(), eventId, dto);
        return r.IsSuccess ? NoContent() : BadRequest(r.Error);
    }

    [HttpDelete("eventos/{eventId}")]
    public async Task<IActionResult> ExcluirEvento(string eventId)
    {
        if (await usuario.AtualAsync() is not { } eu) return Unauthorized();
        var r = await google.ExcluirEventoGoogleAsync(eu.Id.ToString(), eventId);
        return r.IsSuccess ? NoContent() : BadRequest(r.Error);
    }

    /// <summary>Eventos da agenda pessoal (só o dono vê), para a semana/mês da tela.</summary>
    [HttpGet("ocupado")]
    public async Task<IActionResult> Ocupado([FromQuery] string de, [FromQuery] string ate) =>
        await usuario.AtualAsync() is { } eu ? Ok(await google.OcupadoAsync(eu.Id.ToString(), de ?? string.Empty, ate ?? string.Empty)) : Unauthorized();
}

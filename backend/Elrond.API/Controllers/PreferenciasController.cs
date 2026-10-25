using System.Text.Json;
using Elrond.API.Security;
using Elrond.Application.Interfaces;
using Elrond.Domain.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Elrond.API.Controllers;

/// <summary>
/// Preferências de quem está logado: o layout do dashboard (blocos, ordem e tamanho). O padrão do ambiente
/// (o que todo mundo vê até personalizar) só Gestor ou Admin define.
/// </summary>
[ApiController]
[Authorize]
[Route("api/preferencias")]
public class PreferenciasController(UsuarioContexto usuario, IUsuarioRepository usuarios, ICrudRepository<ConfiguracaoSistema> configuracoes, IAuditoriaService auditoria) : ControllerBase
{
    public sealed record LayoutDto(string Layout);
    private const int Maximo = 20_000;

    [HttpGet("dashboard")]
    public async Task<IActionResult> Dashboard()
    {
        var u = await usuario.AtualAsync();
        if (u is null) return Unauthorized();
        var padrao = (await configuracoes.GetByIdAsync(ConfiguracaoSistema.IdPadrao))?.DashboardPadrao ?? string.Empty;
        return Ok(new { meu = u.Dashboard, padrao });
    }

    [HttpPut("dashboard")]
    public async Task<IActionResult> Salvar([FromBody] LayoutDto dto)
    {
        if (Invalido(dto.Layout) is { } erro) return BadRequest(erro);
        var u = await usuario.AtualAsync();
        if (u is null) return Unauthorized();
        u.DefinirDashboard(dto.Layout);
        await usuarios.SaveAsync();
        return NoContent();
    }

    /// <summary>Volta ao padrão do ambiente.</summary>
    [HttpDelete("dashboard")]
    public async Task<IActionResult> Restaurar()
    {
        var u = await usuario.AtualAsync();
        if (u is null) return Unauthorized();
        u.DefinirDashboard(null);
        await usuarios.SaveAsync();
        return NoContent();
    }

    [HttpPut("dashboard/padrao")]
    public async Task<IActionResult> SalvarPadrao([FromBody] LayoutDto dto)
    {
        if (!await usuario.EhGestorAsync()) return StatusCode(StatusCodes.Status403Forbidden, "Só Gestor ou Admin definem o dashboard padrão do ambiente.");
        if (Invalido(dto.Layout) is { } erro) return BadRequest(erro);
        var c = await configuracoes.GetByIdAsync(ConfiguracaoSistema.IdPadrao);
        if (c is null)
        {
            c = new ConfiguracaoSistema { MenusDesligados = ConfiguracaoSistema.DesligadosPorPadrao.ToList(), DashboardPadrao = dto.Layout };
            await configuracoes.AddAsync(c);
        }
        else
        {
            c.DashboardPadrao = dto.Layout;
            await configuracoes.UpdateAsync(c.Id, c);
        }
        var quem = await usuario.QuemAsync();
        await auditoria.RegistrarAsync("editar", "ConfiguracaoSistema", c.Id, $"{quem.Nome} definiu o dashboard padrão do ambiente");
        return NoContent();
    }

    /// <summary>JSON pequeno e válido (a tela confere os blocos; aqui só o formato).</summary>
    private static string? Invalido(string? layout)
    {
        if (string.IsNullOrWhiteSpace(layout)) return "Layout vazio.";
        if (layout.Length > Maximo) return "Layout grande demais.";
        try { using var _ = JsonDocument.Parse(layout); return null; }
        catch (JsonException) { return "Layout inválido."; }
    }
}

using Elrond.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Elrond.API.Controllers;

/// <summary>
/// Situação do ambiente: versão publicada (App__Versao, posta pelo deploy) e se o banco responde,
/// com a última migration aplicada. O deploy só segue para o próximo ambiente quando esta rota
/// devolve a versão nova. Anônima, sem dado de negócio.
/// </summary>
[ApiController]
[AllowAnonymous]
[Route("api/saude")]
public class SaudeController(AppDbContext db, IConfiguration config) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Get(CancellationToken ct)
    {
        var versao = config["App:Versao"] ?? string.Empty;
        try
        {
            var migrations = await db.Database.GetAppliedMigrationsAsync(ct);
            return Ok(new { ok = true, versao, migration = migrations.LastOrDefault() ?? string.Empty });
        }
        catch (Exception)
        {
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new { ok = false, versao, migration = string.Empty });
        }
    }
}

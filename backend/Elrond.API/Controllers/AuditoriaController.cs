using Elrond.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Elrond.API.Controllers;

/// <summary>Consulta da trilha de auditoria (quem fez o quê). Só leitura; a gravação é feita pelos serviços.</summary>
[ApiController]
[Route("api/auditoria")]
[Authorize(Policy = "func:/cadastros/auditoria")]
public class AuditoriaController : ControllerBase
{
    private readonly IAuditoriaService _auditoria;
    public AuditoriaController(IAuditoriaService auditoria) => _auditoria = auditoria;

    /// <summary>Últimos registros (mais recentes primeiro). Filtros opcionais por entidade, ação, usuário e id do registro.</summary>
    [HttpGet]
    public async Task<IActionResult> Listar(
        [FromQuery] int limite = 300,
        [FromQuery] string? entidade = null,
        [FromQuery] string? acao = null,
        [FromQuery] string? usuario = null,
        [FromQuery] string? entidadeId = null) =>
        Ok(await _auditoria.ListarAsync(limite, entidade, usuario, acao, entidadeId));
}

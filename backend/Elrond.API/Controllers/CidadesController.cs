using Elrond.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Elrond.API.Controllers;

/// <summary>Consulta de municípios (base IBGE) para autocomplete de endereço.</summary>
[ApiController]
[Authorize]
[Route("api/cidades")]
public class CidadesController : ControllerBase
{
    private readonly ICidadeRepository _cidades;

    public CidadesController(ICidadeRepository cidades) => _cidades = cidades;

    [HttpGet]
    public async Task<IActionResult> Buscar([FromQuery] string q = "", [FromQuery] int limite = 20, CancellationToken ct = default)
    {
        var lim = Math.Clamp(limite, 1, 50);
        var lista = await _cidades.BuscarAsync(q, lim, ct);
        return Ok(lista.Select(c => new { id = c.Id, nome = c.Nome, uf = c.Uf }));
    }
}

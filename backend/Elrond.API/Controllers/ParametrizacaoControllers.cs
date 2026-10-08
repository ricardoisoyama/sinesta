using Elrond.Application.DTOs;
using Elrond.Application.Interfaces;
using Elrond.Domain.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Elrond.API.Controllers;

/// <summary>
/// Campos de "Dados da operação" por empresa. Leitura liberada a quem está logado (a Precificação
/// monta o bloco com eles); gravação exige a tela Parametrizações › Dados da Operação (PermissaoPorRota).
/// </summary>
[ApiController]
[Authorize]
[Route("api/campos-operacao")]
public class CamposOperacaoController(IParametrizacaoService service) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Listar([FromQuery] string empresaId) =>
        string.IsNullOrWhiteSpace(empresaId) ? BadRequest("Informe a empresa.") : Ok(await service.CamposAsync(empresaId));

    /// <summary>Grava a lista inteira da empresa (a tela salva sozinha). Remover = enviar com status "inativo".</summary>
    [HttpPut("{empresaId}")]
    public async Task<IActionResult> Salvar(string empresaId, [FromBody] List<CampoOperacao> campos)
    {
        var r = await service.SalvarCamposAsync(empresaId, campos ?? new());
        return r.IsSuccess ? Ok(r.Value) : BadRequest(r.Error);
    }
}

/// <summary>Ficha Técnica por empresa: fichas (pastas), cada uma com suas colunas e itens com os valores.</summary>
[ApiController]
[Authorize]
[Route("api/fichas-tecnicas")]
public class FichasTecnicasController(IParametrizacaoService service) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Listar([FromQuery] string empresaId) =>
        string.IsNullOrWhiteSpace(empresaId) ? BadRequest("Informe a empresa.") : Ok(await service.FichasAsync(empresaId));

    /// <summary>Grava colunas e fichas da empresa numa transação; o total de cada ficha é calculado aqui.</summary>
    [HttpPut("{empresaId}")]
    public async Task<IActionResult> Salvar(string empresaId, [FromBody] SalvarFichasDto dto)
    {
        var r = await service.SalvarFichasAsync(empresaId, dto ?? new SalvarFichasDto(null, null, null));
        return r.IsSuccess ? Ok(r.Value) : BadRequest(r.Error);
    }
}

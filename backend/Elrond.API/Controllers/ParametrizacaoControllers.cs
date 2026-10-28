using Elrond.Application.DTOs;
using Elrond.Application.Interfaces;
using Elrond.Domain.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Elrond.API.Controllers;

/// <summary>
/// "Dados da operação" (valem para todas as empresas): os tipos de operação (Transporte, Armazenagem...) e os
/// campos de cada um. Leitura liberada a quem está logado (o Pricing monta o bloco com eles); gravação exige a
/// tela Parametrizações › Dados da Operação (PermissaoPorRota).
/// </summary>
[ApiController]
[Authorize]
[Route("api/campos-operacao")]
public class CamposOperacaoController(IParametrizacaoService service) : ControllerBase
{
    /// <summary>O ?empresaId= da versão anterior da tela é aceito e ignorado.</summary>
    [HttpGet]
    public async Task<IActionResult> Listar() => Ok(await service.DadosOperacaoAsync());

    /// <summary>Grava tipos e campos (a tela salva sozinha). Remover = enviar com status "inativo". A rota com a empresa é a da tela antiga.</summary>
    [HttpPut]
    [HttpPut("{empresaIdAntigo}")]
    public async Task<IActionResult> Salvar([FromBody] DadosOperacaoDto dados)
    {
        var r = await service.SalvarDadosOperacaoAsync(dados ?? new DadosOperacaoDto(null, null));
        return r.IsSuccess ? Ok(r.Value) : BadRequest(r.Error);
    }
}

/// <summary>Ficha Técnica (vale para todas as empresas): fichas (pastas), cada uma com suas colunas e itens com os valores.</summary>
[ApiController]
[Authorize]
[Route("api/fichas-tecnicas")]
public class FichasTecnicasController(IParametrizacaoService service) : ControllerBase
{
    /// <summary>O ?empresaId= da versão anterior da tela é aceito e ignorado.</summary>
    [HttpGet]
    public async Task<IActionResult> Listar() => Ok(await service.FichasAsync());

    /// <summary>Grava colunas e fichas numa transação; o total de cada ficha é calculado aqui. A rota com a empresa é a da tela antiga.</summary>
    [HttpPut]
    [HttpPut("{empresaIdAntigo}")]
    public async Task<IActionResult> Salvar([FromBody] SalvarFichasDto dto)
    {
        var r = await service.SalvarFichasAsync(dto ?? new SalvarFichasDto(null, null, null));
        return r.IsSuccess ? Ok(r.Value) : BadRequest(r.Error);
    }
}

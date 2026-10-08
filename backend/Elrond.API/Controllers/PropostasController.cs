using Elrond.API.Security;
using Elrond.Application.DTOs;
using Elrond.Application.Interfaces;
using Elrond.Domain.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Elrond.API.Controllers;

/// <summary>Propostas: o controller só traduz HTTP; as regras estão no IPropostaService.</summary>
[ApiController]
[Authorize]
[Route("api/propostas")]
public class PropostasController : ControllerBase
{
    private readonly ICrudRepository<Proposta> _repo;
    private readonly IPropostaService _service;
    private readonly ICarteiraService _carteira;
    private readonly UsuarioContexto _usuario;

    public PropostasController(ICrudRepository<Proposta> repo, IPropostaService service, ICarteiraService carteira, UsuarioContexto usuario)
    {
        _repo = repo;
        _service = service;
        _carteira = carteira;
        _usuario = usuario;
    }

    /// <summary>Vendedor vê só as propostas da própria carteira; gestor vê todas.</summary>
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var visao = await _carteira.VisaoAsync(await _usuario.QuemAsync());
        var propostas = await _repo.GetAllAsync();
        return Ok(propostas.Where(visao.VeProposta).OrderByDescending(p => p.Numero));
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(string id)
    {
        var p = await _repo.GetByIdAsync(id);
        if (p is null) return NotFound();
        var visao = await _carteira.VisaoAsync(await _usuario.QuemAsync());
        return visao.VeProposta(p) ? Ok(p) : NotFound();
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CriarPropostaDto dto)
    {
        var r = await _service.CriarAsync(dto, await _usuario.QuemAsync());
        return r.IsSuccess ? Ok(r.Value) : BadRequest(r.Error);
    }

    /// <summary>Edita uma proposta em rascunho (reabre na Precificação): itens e condições, com as mesmas regras da criação.</summary>
    [HttpPut("{id}")]
    public async Task<IActionResult> Update(string id, [FromBody] CriarPropostaDto dto)
    {
        var r = await _service.AtualizarAsync(id, dto, await _usuario.QuemAsync());
        return r.IsSuccess ? Ok(r.Value) : BadRequest(r.Error);
    }

    /// <summary>Lança o custo realizado de cada item (alimenta o RPO). Só o custo real muda por aqui.</summary>
    [HttpPatch("{id}/itens")]
    public async Task<IActionResult> AtualizarItens(string id, [FromBody] List<ItemProposta> itens)
    {
        var r = await _service.AtualizarCustoRealAsync(id, itens);
        return r.IsSuccess ? Ok(r.Value) : BadRequest(r.Error);
    }

    [HttpPatch("{id}/status")]
    public async Task<IActionResult> SetStatus(string id, [FromBody] StatusPropostaDto dto)
    {
        var r = await _service.AlterarStatusAsync(id, dto.Status, await _usuario.QuemAsync());
        return r.IsSuccess ? Ok(r.Value) : BadRequest(r.Error);
    }

    /// <summary>Assina a aprovação do usuário logado (aprovação simultânea de todos os exigidos).</summary>
    [HttpPost("{id}/aprovar")]
    [Authorize(Policy = "func:/propostas/aprovar")]
    public async Task<IActionResult> Aprovar(string id)
    {
        var r = await _service.AprovarAsync(id, await _usuario.QuemAsync());
        if (r.IsSuccess) return Ok(r.Value);
        return r.Error!.Contains("aprovadores") ? Forbid() : BadRequest(r.Error);
    }
}

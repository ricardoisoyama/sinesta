using Elrond.API.Security;
using Elrond.Application.DTOs;
using Elrond.Application.Interfaces;
using Elrond.Application.Services;
using Elrond.Domain.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Elrond.API.Controllers;

/// <summary>Carteiras (contas bancárias, caixa, cartão). Gravar exige a tela Caixa.</summary>
[Route("api/financeiro/carteiras")]
public class CarteirasController(ICrudRepository<Carteira> repo) : CrudControllerBase<Carteira>(repo);

/// <summary>"De/para" da conciliação. Gravar exige a tela Conciliação.</summary>
[Route("api/financeiro/regras-conciliacao")]
public class RegrasConciliacaoController(ICrudRepository<RegraConciliacao> repo) : CrudControllerBase<RegraConciliacao>(repo);

/// <summary>Lançamentos a pagar e a receber. O controller só traduz HTTP; as regras estão no serviço.</summary>
[ApiController]
[Authorize]
[Route("api/financeiro/movimentos")]
public class MovimentosController(IFinanceiroService service, UsuarioContexto usuario) : ControllerBase
{
    private const string PermissaoAprovar = "/financeiro/aprovar";

    [HttpGet]
    public async Task<IActionResult> Listar() => Ok(await service.ListarAsync());

    /// <summary>Cria o lançamento (com parcelas). Nasce pendente de aprovação.</summary>
    [HttpPost]
    public async Task<IActionResult> Criar([FromBody] NovoMovimentoDto dto)
    {
        var r = await service.CriarAsync(dto, await usuario.QuemAsync());
        return r.IsSuccess ? Ok(r.Value) : BadRequest(r.Error);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Atualizar(string id, [FromBody] Movimento dados)
    {
        var r = await service.AtualizarAsync(id, dados);
        return r.IsSuccess ? Ok(r.Value) : BadRequest(r.Error);
    }

    /// <summary>Transferência entre contas (as duas pernas nascem juntas e pendentes de aprovação).</summary>
    [HttpPost("transferencia")]
    public async Task<IActionResult> Transferir([FromBody] TransferenciaDto dto)
    {
        var r = await service.TransferirAsync(dto, await usuario.QuemAsync());
        return r.IsSuccess ? Ok(r.Value) : BadRequest(r.Error);
    }

    [HttpPost("liquidar")]
    public async Task<IActionResult> Liquidar([FromBody] BaixaDto dto)
    {
        var r = await service.LiquidarAsync(dto, await usuario.QuemAsync());
        return r.IsSuccess ? Ok(r.Value) : BadRequest(r.Error);
    }

    [HttpPost("{id}/estornar")]
    public async Task<IActionResult> Estornar(string id)
    {
        var r = await service.EstornarAsync(id, await usuario.QuemAsync());
        return r.IsSuccess ? Ok(r.Value) : BadRequest(r.Error);
    }

    [HttpPost("cancelar")]
    public async Task<IActionResult> Cancelar([FromBody] IdsDto dto)
    {
        var r = await service.CancelarAsync(dto, await usuario.QuemAsync());
        return r.IsSuccess ? Ok(r.Value) : BadRequest(r.Error);
    }

    /// <summary>Assina o lançamento (e as parcelas dele). Exige a permissão e estar na regra.</summary>
    [HttpPost("{id}/aprovar")]
    [Authorize(Policy = "func:" + PermissaoAprovar)]
    public async Task<IActionResult> Aprovar(string id)
    {
        var r = await service.AprovarAsync(id, await usuario.QuemAsync(), await usuario.PodeAsync(PermissaoAprovar));
        return r.IsSuccess ? Ok(r.Value) : BadRequest(r.Error);
    }

    [HttpPost("{id}/reprovar")]
    [Authorize(Policy = "func:" + PermissaoAprovar)]
    public async Task<IActionResult> Reprovar(string id, [FromBody] ReprovarMovimentoDto dto)
    {
        var r = await service.ReprovarAsync(id, dto?.Motivo ?? string.Empty, await usuario.QuemAsync(), await usuario.PodeAsync(PermissaoAprovar));
        return r.IsSuccess ? Ok(r.Value) : BadRequest(r.Error);
    }
}

/// <summary>Conciliação bancária: linhas do extrato (.ofx) e o vínculo com os lançamentos.</summary>
[ApiController]
[Authorize]
[Route("api/financeiro/conciliacao")]
public class ConciliacaoController(IFinanceiroService service, ExtratoBancoService extratoBanco, UsuarioContexto usuario) : ControllerBase
{
    public record BuscarDoBancoDto(string CarteiraId, string? De, string? Ate);

    /// <summary>Contas do Caixa com extrato pela API (mostram o botão "Buscar do banco").</summary>
    [HttpGet("contas-com-extrato")]
    public async Task<IActionResult> ContasComExtrato() => Ok(await extratoBanco.ContasAsync());

    /// <summary>Lê o extrato pela API do banco e grava como o OFX (sem duplicar o que já veio).</summary>
    [HttpPost("buscar-banco")]
    public async Task<IActionResult> BuscarDoBanco([FromBody] BuscarDoBancoDto dto, CancellationToken ct)
    {
        var r = await extratoBanco.BuscarAsync(dto.CarteiraId, dto.De, dto.Ate, await usuario.QuemAsync(), ct);
        return r.IsSuccess ? Ok(r.Value) : BadRequest(r.Error);
    }

    [HttpGet]
    public async Task<IActionResult> Extrato([FromQuery] string carteiraId) =>
        string.IsNullOrWhiteSpace(carteiraId) ? BadRequest("Informe a carteira.") : Ok(await service.ExtratoAsync(carteiraId));

    /// <summary>Grava as linhas lidas do .ofx; o FITID repetido é ignorado (não duplica).</summary>
    [HttpPost("importar")]
    public async Task<IActionResult> Importar([FromBody] ImportarExtratoDto dto)
    {
        var r = await service.ImportarAsync(dto, await usuario.QuemAsync());
        return r.IsSuccess ? Ok(r.Value) : BadRequest(r.Error);
    }

    [HttpPost("vincular")]
    public async Task<IActionResult> Vincular([FromBody] VincularExtratoDto dto)
    {
        var r = await service.VincularAsync(dto, await usuario.QuemAsync());
        return r.IsSuccess ? Ok(r.Value) : BadRequest(r.Error);
    }

    [HttpPost("criar")]
    public async Task<IActionResult> Criar([FromBody] CriarDoExtratoDto dto)
    {
        var r = await service.CriarDoExtratoAsync(dto, await usuario.QuemAsync());
        return r.IsSuccess ? Ok(r.Value) : BadRequest(r.Error);
    }

    [HttpPost("{linhaId}/desfazer")]
    public async Task<IActionResult> Desfazer(string linhaId)
    {
        var r = await service.DesfazerAsync(linhaId, await usuario.QuemAsync());
        return r.IsSuccess ? Ok(r.Value) : BadRequest(r.Error);
    }

    [HttpPost("{linhaId}/ignorar")]
    public async Task<IActionResult> Ignorar(string linhaId)
    {
        var r = await service.IgnorarAsync(linhaId, await usuario.QuemAsync());
        return r.IsSuccess ? Ok(r.Value) : BadRequest(r.Error);
    }
}

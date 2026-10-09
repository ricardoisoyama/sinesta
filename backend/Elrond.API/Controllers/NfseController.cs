using Elrond.Application.DTOs;
using Elrond.Application.Interfaces;
using Elrond.Infrastructure.Integracoes.NfeIo;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Elrond.API.Controllers;

/// <summary>
/// Motor de NFS-e: emissão, consulta, cancelamento e PDF/XML. Só para quem tem a permissão
/// especial "/fiscal/nfse" (desligada por padrão, inclusive para gestor).
/// </summary>
[ApiController]
[Route("api/fiscal/nfse")]
[Authorize(Policy = "func:" + Permissao)]
public class NfseController(INfseService nfse) : ControllerBase
{
    public const string Permissao = "/fiscal/nfse";

    /// <summary>Emite uma NFS-e. Volta na hora com a nota "em processamento"; o resultado da prefeitura chega depois.</summary>
    [HttpPost]
    public async Task<IActionResult> Emitir([FromBody] PedidoNfseDto pedido, CancellationToken ct)
    {
        var r = await nfse.EmitirAsync(pedido, ct);
        return r.IsSuccess ? Ok(r.Value) : BadRequest(r.Error);
    }

    [HttpGet]
    public async Task<IActionResult> Listar([FromQuery] string? empresaId, [FromQuery] int quantidade = 50, CancellationToken ct = default) =>
        Ok(await nfse.ListarAsync(empresaId, quantidade, ct));

    [HttpGet("{id}")]
    public async Task<IActionResult> Obter(string id, CancellationToken ct) =>
        await nfse.ObterAsync(id, ct) is { } nota ? Ok(nota) : NotFound();

    /// <summary>Pergunta ao provedor agora (sem esperar o acompanhamento automático).</summary>
    [HttpPost("{id}/consultar")]
    public async Task<IActionResult> Consultar(string id, CancellationToken ct)
    {
        var r = await nfse.AtualizarAsync(id, ct);
        return r.IsSuccess ? Ok(r.Value) : BadRequest(r.Error);
    }

    [HttpPost("{id}/cancelar")]
    public async Task<IActionResult> Cancelar(string id, [FromBody] CancelamentoNfseDto pedido, CancellationToken ct)
    {
        var r = await nfse.CancelarAsync(id, pedido.Motivo, ct);
        return r.IsSuccess ? Ok(r.Value) : BadRequest(r.Error);
    }

    [HttpGet("{id}/pdf")]
    public Task<IActionResult> Pdf(string id, CancellationToken ct) => Arquivo(id, TipoArquivoNfse.Pdf, ct);

    [HttpGet("{id}/xml")]
    public Task<IActionResult> Xml(string id, CancellationToken ct) => Arquivo(id, TipoArquivoNfse.Xml, ct);

    private async Task<IActionResult> Arquivo(string id, TipoArquivoNfse tipo, CancellationToken ct)
    {
        var r = await nfse.BaixarAsync(id, tipo, ct);
        return r.IsSuccess ? File(r.Value!.Conteudo, r.Value.TipoConteudo, r.Value.NomeArquivo) : BadRequest(r.Error);
    }

    // ── Configuração fiscal da empresa (implantação) ──

    [HttpGet("empresas/{empresaId}/configuracao")]
    public async Task<IActionResult> ObterConfiguracao(string empresaId, CancellationToken ct) =>
        await nfse.ObterConfiguracaoAsync(empresaId, ct) is { } c ? Ok(c) : NotFound();

    [HttpPut("empresas/{empresaId}/configuracao")]
    public async Task<IActionResult> SalvarConfiguracao(string empresaId, [FromBody] ConfiguracaoFiscalDto configuracao, CancellationToken ct)
    {
        var r = await nfse.SalvarConfiguracaoAsync(empresaId, configuracao, ct);
        return r.IsSuccess ? Ok(r.Value) : BadRequest(r.Error);
    }
}

/// <summary>
/// Avisos da NFE.io (webhook). Anônimo, mas só aceita corpo assinado com o segredo da conta.
/// Respostas: 200 = recebido (inclusive aviso repetido ou de nota desconhecida); 401 = assinatura
/// inválida (a NFE.io não repete); 500 = falha nossa (a NFE.io tenta de novo).
/// </summary>
[ApiController]
[AllowAnonymous]
[Route("api/integracoes/nfeio/aviso")]
public class NfeIoAvisoController(NfeIoAvisos avisos, INfseService nfse, ILogger<NfeIoAvisoController> log) : ControllerBase
{
    private const int TamanhoMaximo = 2 * 1024 * 1024;

    [HttpPost]
    [RequestSizeLimit(TamanhoMaximo)]
    public async Task<IActionResult> Receber(CancellationToken ct)
    {
        using var memoria = new MemoryStream();
        await Request.Body.CopyToAsync(memoria, ct);
        var corpo = memoria.ToArray();

        if (!avisos.AssinaturaValida(corpo, Request.Headers["X-Hub-Signature"]))
        {
            log.LogWarning("Aviso da NFE.io com assinatura inválida recusado (IP {Ip}).", HttpContext.Connection.RemoteIpAddress);
            return Unauthorized();
        }

        AvisoNfse? aviso;
        try
        {
            aviso = NfeIoAvisos.Interpretar(corpo, Request.Headers["X-Hook-Id"]);
        }
        catch (System.Text.Json.JsonException)
        {
            log.LogWarning("Aviso da NFE.io com corpo ilegível ignorado.");
            return Ok();
        }
        // Teste de cadastro do webhook (ping) e eventos que não são de nota de serviço.
        if (aviso is null) return Ok();

        await nfse.ProcessarAvisoAsync(aviso, ct);
        return Ok();
    }
}

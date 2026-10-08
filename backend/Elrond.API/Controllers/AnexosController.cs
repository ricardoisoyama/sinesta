using System.Security.Claims;
using Elrond.API.Security;
using Elrond.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Elrond.API.Controllers;

/// <summary>
/// Documentos anexados aos cadastros (cliente, fornecedor). Exige a permissão da tela
/// dona do cadastro (Clientes ou Fornecedores) para ver, enviar, abrir e excluir.
/// </summary>
[ApiController]
[Authorize]
[Route("api/anexos")]
public class AnexosController : ControllerBase
{
    private static readonly Dictionary<string, string> FuncionalidadePorEntidade = new()
    {
        ["cliente"] = "/cadastros/clientes",
        ["fornecedor"] = "/cadastros/fornecedores",
    };

    private readonly IAnexoService _anexos;
    private readonly UsuarioContexto _usuario;
    private readonly IAuditoriaService _auditoria;

    public AnexosController(IAnexoService anexos, UsuarioContexto usuario, IAuditoriaService auditoria)
    {
        _anexos = anexos;
        _usuario = usuario;
        _auditoria = auditoria;
    }

    private async Task<bool> PodeAsync(string entidade) =>
        FuncionalidadePorEntidade.TryGetValue(entidade, out var chave) && await _usuario.PodeAsync(chave);

    private ObjectResult SemPermissao() =>
        StatusCode(StatusCodes.Status403Forbidden, "Você não tem permissão para os documentos deste cadastro.");

    /// <summary>Lista os anexos de um registro (ex.: GET api/anexos/cliente/&lt;id&gt;).</summary>
    [HttpGet("{entidade}/{entidadeId}")]
    public async Task<IActionResult> Listar(string entidade, string entidadeId)
    {
        if (!await PodeAsync(entidade)) return SemPermissao();
        return Ok(await _anexos.ListarAsync(entidade, entidadeId));
    }

    /// <summary>Envia um arquivo (multipart, campo "arquivo"). Aceita PDF, Word, Excel e JPG até 12 MB.</summary>
    [HttpPost("{entidade}/{entidadeId}")]
    [RequestSizeLimit(13 * 1024 * 1024)]
    [RequestFormLimits(MultipartBodyLengthLimit = 13 * 1024 * 1024)]
    public async Task<IActionResult> Enviar(string entidade, string entidadeId, IFormFile? arquivo)
    {
        if (!await PodeAsync(entidade)) return SemPermissao();
        if (arquivo is null) return BadRequest("Nenhum arquivo enviado.");
        var quem = User.FindFirstValue(ClaimTypes.Name) ?? User.FindFirstValue(ClaimTypes.Email) ?? string.Empty;

        await using var stream = arquivo.OpenReadStream();
        var r = await _anexos.EnviarAsync(entidade, entidadeId, arquivo.FileName, arquivo.ContentType, arquivo.Length, stream, quem);
        if (!r.IsSuccess) return BadRequest(r.Error);
        await _auditoria.RegistrarAsync("anexo", entidade == "cliente" ? "Cliente" : "Fornecedor", entidadeId,
            $"Anexo \"{r.Value!.Nome}\" enviado ({r.Value.Tamanho / 1024} KB)");
        return Ok(r.Value);
    }

    /// <summary>Conteúdo do arquivo. PDF e imagem abrem no navegador; os demais baixam.</summary>
    [HttpGet("{id}/conteudo")]
    public async Task<IActionResult> Conteudo(string id)
    {
        var r = await _anexos.AbrirAsync(id);
        if (!r.IsSuccess || r.Value is null) return NotFound(r.Error);
        var (anexo, conteudo) = r.Value;
        if (!await PodeAsync(anexo.Entidade))
        {
            await conteudo.DisposeAsync();
            return SemPermissao();
        }

        // O tipo vem da extensão (conferida no envio), nunca do navegador; nosniff impede
        // o navegador de "adivinhar" outro tipo e executar o conteúdo.
        Response.Headers["X-Content-Type-Options"] = "nosniff";
        var inline = anexo.Tipo == "image/jpeg" || anexo.Tipo == "application/pdf";
        if (inline)
        {
            Response.Headers.ContentDisposition = $"inline; filename=\"{Uri.EscapeDataString(anexo.Nome)}\"";
            return File(conteudo, anexo.Tipo);
        }
        return File(conteudo, anexo.Tipo, anexo.Nome);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Excluir(string id)
    {
        var aberto = await _anexos.AbrirAsync(id);
        Domain.Entities.Anexo? anexo = null;
        if (aberto.IsSuccess && aberto.Value is not null)
        {
            await aberto.Value.Conteudo.DisposeAsync();
            anexo = aberto.Value.Anexo;
            if (!await PodeAsync(anexo.Entidade)) return SemPermissao();
        }
        var r = await _anexos.ExcluirAsync(id);
        if (!r.IsSuccess) return NotFound(r.Error);
        if (anexo is not null)
            await _auditoria.RegistrarAsync("anexo-excluido", anexo.Entidade == "cliente" ? "Cliente" : "Fornecedor", anexo.EntidadeId,
                $"Anexo \"{anexo.Nome}\" excluído");
        return NoContent();
    }
}

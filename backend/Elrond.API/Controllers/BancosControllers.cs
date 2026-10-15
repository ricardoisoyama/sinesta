using Elrond.Application.Interfaces;
using Elrond.Application.Services;
using Elrond.Domain.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Elrond.API.Controllers;

/// <summary>
/// Implantação da integração bancária de uma empresa (Client ID/Secret, certificado, recursos,
/// ligar/desligar). Permissão ESPECIAL, desligada para todos: quem ativa é a nossa equipe.
/// Nunca devolve segredos.
/// </summary>
[ApiController]
[Route("api/integracoes-bancarias")]
[Authorize(Policy = "func:" + Permissao)]
public class IntegracoesBancariasController(IIntegracaoBancariaService integracoes) : ControllerBase
{
    public const string Permissao = "/financeiro/integracao-bancaria";

    [HttpGet]
    public async Task<IActionResult> Listar([FromQuery] string? empresaId) => Ok(await integracoes.ListarAsync(empresaId));

    [HttpPut("{empresaId}")]
    public async Task<IActionResult> Configurar(string empresaId, [FromBody] ConfigurarIntegracaoDto dto)
    {
        var r = await integracoes.ConfigurarAsync(empresaId, dto);
        return r.IsSuccess ? Ok(r.Value) : BadRequest(r.Error);
    }
}

/// <summary>
/// Página PROVISÓRIA de testes de boleto (/boleto): lista as faturas da SIIMP (só leitura) e emite
/// o boleto da parcela pelo banco da empresa. Os dados do boleto vêm da SIIMP no servidor (a tela
/// não informa valor nem pagador). Permissão especial "/financeiro/boleto-teste".
/// </summary>
[ApiController]
[Route("api/boleto-teste")]
[Authorize(Policy = "func:" + Permissao)]
public class BoletoTesteController(ISiimp siimp, ICobrancaService cobrancas, IIntegracaoBancariaService integracoes, ICrudRepository<Empresa> empresas) : ControllerBase
{
    public const string Permissao = "/financeiro/boleto-teste";
    private const string Origem = "siimp-fatura";

    /// <summary>Empresas com integração de cobrança ativa (as que podem emitir aqui).</summary>
    [HttpGet("empresas")]
    public async Task<IActionResult> Empresas()
    {
        var ativas = (await integracoes.ListarAsync()).Where(i => i.Ativa && i.Recursos.Contains(IntegracaoBancaria.RecursoCobranca)).ToList();
        var nomes = (await empresas.GetAllAsync()).ToDictionary(e => e.Id, e => e.Nome);
        return Ok(ativas.Select(i => new { empresaId = i.EmpresaId, empresa = nomes.GetValueOrDefault(i.EmpresaId, i.EmpresaId), i.Banco, i.Ambiente, i.CertificadoValidoAte }));
    }

    [HttpGet("faturas")]
    public async Task<IActionResult> Faturas([FromQuery] string de, [FromQuery] string ate, CancellationToken ct)
    {
        if (!DateOnly.TryParseExact(de, "yyyy-MM-dd", out var d1) || !DateOnly.TryParseExact(ate, "yyyy-MM-dd", out var d2) || d2 < d1)
            return BadRequest("Informe o período (de e até, aaaa-mm-dd).");
        var r = await siimp.FaturasAsync(de, ate, ct);
        return r.Erro.Length > 0 ? BadRequest(r.Erro) : Ok(r.Dados);
    }

    /// <summary>Fatura com parcelas, documentos, pagador (com endereço) e os boletos já gerados para ela.</summary>
    [HttpGet("faturas/{id:long}")]
    public async Task<IActionResult> Fatura(long id, [FromQuery] string? empresaId, CancellationToken ct)
    {
        var f = await siimp.FaturaAsync(id, ct);
        if (f.Erro.Length > 0) return BadRequest(f.Erro);
        var pessoa = f.Dados!.PagadorId > 0 ? await siimp.PessoaAsync(f.Dados.PagadorId, ct) : RespostaSiimp<PessoaSiimp>.Falha("Fatura sem pagador.");
        var boletos = string.IsNullOrEmpty(empresaId) ? new List<CobrancaBancaria>() : await cobrancas.ListarAsync(empresaId, Origem, id.ToString());
        return Ok(new { fatura = f.Dados, pagador = pessoa.Dados, erroPagador = pessoa.Erro, boletos });
    }

    public sealed record GerarBoletoDto(string EmpresaId, string? Vencimento);

    /// <summary>Gera o boleto de uma parcela. Vencimento opcional: só para testar faturas já vencidas.</summary>
    [HttpPost("faturas/{id:long}/parcelas/{parcelaId:long}/boleto")]
    public async Task<IActionResult> Gerar(long id, long parcelaId, [FromBody] GerarBoletoDto dto, CancellationToken ct)
    {
        var f = await siimp.FaturaAsync(id, ct);
        if (f.Erro.Length > 0) return BadRequest(f.Erro);
        var fatura = f.Dados!;
        if (fatura.Parcelas.FirstOrDefault(p => p.Id == parcelaId) is not { } parcela) return BadRequest("Parcela não encontrada nesta fatura.");
        var pessoa = await siimp.PessoaAsync(fatura.PagadorId, ct);
        if (pessoa.Erro.Length > 0) return BadRequest($"Não foi possível ler o pagador na SIIMP: {pessoa.Erro}");
        var p = pessoa.Dados!;

        var docs = string.Join(", ", fatura.Documentos.Select(d => $"{d.Tipo} {d.Numero}"));
        var mensagens = new List<string> { $"Fatura {fatura.Numero} · parcela {parcela.Numero}/{fatura.Parcelas.Count}" };
        if (docs.Length > 0) mensagens.Add($"Ref.: {docs}");
        var pedido = new NovaCobranca(
            parcela.Valor - parcela.Desconto,
            string.IsNullOrWhiteSpace(dto.Vencimento) ? parcela.Vencimento : dto.Vencimento!,
            new PagadorCobranca(p.Documento, p.Nome, p.Rua, p.Numero, p.Complemento, p.Bairro, p.Cidade, p.Uf, p.Cep, p.Email, p.Telefone),
            mensagens);
        var origem = new OrigemCobranca(Origem, fatura.Id.ToString(), parcela.Id.ToString(), $"Fatura {fatura.Numero} · parcela {parcela.Numero}/{fatura.Parcelas.Count}");

        var r = await cobrancas.EmitirAsync(dto.EmpresaId, origem, pedido, ct);
        return r.IsSuccess ? Ok(r.Value) : BadRequest(r.Error);
    }

    [HttpGet("cobrancas")]
    public async Task<IActionResult> Cobrancas([FromQuery] string empresaId) => Ok(await cobrancas.ListarAsync(empresaId, Origem));

    [HttpPost("cobrancas/{id}/atualizar")]
    public async Task<IActionResult> Atualizar(string id, CancellationToken ct)
    {
        var r = await cobrancas.AtualizarAsync(id, ct);
        return r.IsSuccess ? Ok(r.Value) : BadRequest(r.Error);
    }

    [HttpGet("cobrancas/{id}/pdf")]
    public async Task<IActionResult> Pdf(string id, CancellationToken ct)
    {
        var r = await cobrancas.PdfAsync(id, ct);
        return r.IsSuccess ? File(r.Value!, "application/pdf", $"boleto-{id}.pdf") : BadRequest(r.Error);
    }

    public sealed record CancelarDto(string? Motivo);

    [HttpPost("cobrancas/{id}/cancelar")]
    public async Task<IActionResult> Cancelar(string id, [FromBody] CancelarDto dto, CancellationToken ct)
    {
        var r = await cobrancas.CancelarAsync(id, dto.Motivo ?? string.Empty, ct);
        return r.IsSuccess ? Ok(r.Value) : BadRequest(r.Error);
    }
}

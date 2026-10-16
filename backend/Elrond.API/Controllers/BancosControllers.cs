using System.Collections.Concurrent;
using Elrond.Application.Interfaces;
using Elrond.Application.Services;
using Elrond.Domain.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Elrond.API.Controllers;

/// <summary>
/// Implantação da integração bancária de uma empresa (Client ID/Secret, certificado, recursos,
/// ligar/desligar). Permissão ADMINISTRATIVA: só o perfil Admin (a nossa equipe).
/// Nunca devolve segredos.
/// </summary>
[ApiController]
[Route("api/integracoes-bancarias")]
[Authorize(Policy = "func:" + Permissao)]
public class IntegracoesBancariasController(IIntegracaoBancariaService integracoes) : ControllerBase
{
    public const string Permissao = "/administrativo/integracoes";

    [HttpGet]
    public async Task<IActionResult> Listar([FromQuery] string? empresaId) => Ok(await integracoes.ListarAsync(empresaId));

    /// <summary>Bancos que o motor sabe usar e o que cada um oferece.</summary>
    [HttpGet("bancos")]
    public IActionResult Bancos() => Ok(integracoes.Bancos());

    [HttpPut("{empresaId}")]
    public async Task<IActionResult> Configurar(string empresaId, [FromBody] ConfigurarIntegracaoDto dto)
    {
        var r = await integracoes.ConfigurarAsync(empresaId, dto);
        return r.IsSuccess ? Ok(r.Value) : BadRequest(r.Error);
    }

    /// <summary>Confere certificado e credenciais gravados com uma chamada de leitura ao banco.</summary>
    [HttpPost("{integracaoId}/testar")]
    public async Task<IActionResult> Testar(string integracaoId, CancellationToken ct)
    {
        var r = await integracoes.TestarAsync(integracaoId, ct);
        return r.IsSuccess ? Ok(new { mensagem = r.Value }) : BadRequest(r.Error);
    }
}

/// <summary>
/// Página PROVISÓRIA de testes de boleto (/boleto): lista as faturas da SIIMP (só leitura) e emite
/// o boleto da parcela pelo banco da empresa. Os dados do boleto vêm da SIIMP no servidor (a tela
/// não informa valor nem pagador). Permissão administrativa "/financeiro/boleto-teste" (só Admin).
/// </summary>
[ApiController]
[Route("api/boleto-teste")]
[Authorize(Policy = "func:" + Permissao)]
public class BoletoTesteController(ISiimp siimp, ICobrancaService cobrancas, IIntegracaoBancariaService integracoes, ICrudRepository<Empresa> empresas) : ControllerBase
{
    public const string Permissao = "/financeiro/boleto-teste";
    private const string Origem = "siimp-fatura";
    private const string OrigemTeste = "boleto-teste";

    private async Task<bool> EmProducaoAsync(string empresaId) =>
        (await integracoes.ListarAsync(empresaId)).Any(i => i.Ativa && i.Ambiente == "producao" && i.Recursos.Contains(IntegracaoBancaria.RecursoCobranca));

    /// <summary>Empresas com integração de cobrança ativa (as que podem emitir aqui).</summary>
    [HttpGet("empresas")]
    public async Task<IActionResult> Empresas()
    {
        var ativas = (await integracoes.ListarAsync()).Where(i => i.Ativa && i.Recursos.Contains(IntegracaoBancaria.RecursoCobranca)).ToList();
        var nomes = (await empresas.GetAllAsync()).ToDictionary(e => e.Id, e => e.Nome);
        return Ok(ativas.Select(i => new { empresaId = i.EmpresaId, empresa = nomes.GetValueOrDefault(i.EmpresaId, i.EmpresaId), i.Banco, i.Ambiente, i.CertificadoValidoAte }));
    }

    /// <summary>Faturas da SIIMP emitidas pela empresa escolhida (o CNPJ do emitente tem de ser o dela).</summary>
    [HttpGet("faturas")]
    public async Task<IActionResult> Faturas([FromQuery] string empresaId, [FromQuery] string de, [FromQuery] string ate, CancellationToken ct)
    {
        if (!DateOnly.TryParseExact(de, "yyyy-MM-dd", out var d1) || !DateOnly.TryParseExact(ate, "yyyy-MM-dd", out var d2) || d2 < d1)
            return BadRequest("Informe o período (de e até, aaaa-mm-dd).");
        if (await CnpjDaEmpresaAsync(empresaId) is not { Length: > 0 } cnpj) return BadRequest("Empresa sem CNPJ no cadastro.");
        var r = await siimp.FaturasAsync(de, ate, ct);
        if (r.Erro.Length > 0) return BadRequest(r.Erro);
        var daEmpresa = new List<FaturaSiimpResumo>();
        foreach (var grupo in r.Dados!.GroupBy(f => f.EmitenteId))
        {
            var doc = await CnpjDoEmitenteAsync(grupo.Key, ct);
            if (doc.Erro.Length > 0) return BadRequest(doc.Erro);
            if (doc.Dados == cnpj) daEmpresa.AddRange(grupo);
        }
        return Ok(daEmpresa);
    }

    /// <summary>Fatura com parcelas, documentos, pagador (com endereço) e os boletos já gerados para ela.</summary>
    [HttpGet("faturas/{id:long}")]
    public async Task<IActionResult> Fatura(long id, [FromQuery] string? empresaId, CancellationToken ct)
    {
        var f = await siimp.FaturaAsync(id, ct);
        if (f.Erro.Length > 0) return BadRequest(f.Erro);
        if (!string.IsNullOrEmpty(empresaId) && await OutraEmpresaAsync(f.Dados!, empresaId, ct) is { Length: > 0 } erro) return BadRequest(erro);
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
        // Em produção esta página não emite boleto de fatura da SIIMP (seria cobrança real a cliente real):
        // só o boleto de teste, contra quem está testando.
        if (await EmProducaoAsync(dto.EmpresaId))
            return BadRequest("A integração desta empresa está em produção: aqui só o boleto de teste está liberado. Faturas da SIIMP geram boleto quando o faturamento for para o ELROND.");
        if (await OutraEmpresaAsync(fatura, dto.EmpresaId, ct) is { Length: > 0 } erro) return BadRequest(erro);
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

    public sealed record BoletoTesteDto(
        string EmpresaId, string Nome, string Documento, string Rua, string Numero, string? Complemento, string Bairro,
        string Cidade, string Uf, string Cep, string? Email, string? Telefone, decimal Valor, string Vencimento);

    /// <summary>
    /// Boleto de TESTE, sem fatura: o pagador é quem está testando (o próprio CPF). Serve para provar o
    /// ciclo inteiro (emitir, consultar, PDF, cancelar) inclusive em produção. Valor mínimo do banco.
    /// </summary>
    [HttpPost("teste")]
    public async Task<IActionResult> Teste([FromBody] BoletoTesteDto dto, CancellationToken ct)
    {
        if (dto.Valor > 50) return BadRequest("Boleto de teste vai até R$ 50,00.");
        var pedido = new NovaCobranca(
            dto.Valor,
            dto.Vencimento,
            new PagadorCobranca(dto.Documento, dto.Nome, dto.Rua, dto.Numero, dto.Complemento ?? string.Empty, dto.Bairro, dto.Cidade, dto.Uf, dto.Cep, dto.Email ?? string.Empty, dto.Telefone ?? string.Empty),
            new List<string> { "Boleto de teste do ELROND", "Pode ser cancelado: não é cobrança de serviço" });
        // Cada teste é uma origem própria (não trava o próximo teste como "parcela já tem boleto").
        var origem = new OrigemCobranca(OrigemTeste, Guid.NewGuid().ToString("N"), "1", $"Boleto de teste · {dto.Nome}");
        var r = await cobrancas.EmitirAsync(dto.EmpresaId, origem, pedido, ct);
        return r.IsSuccess ? Ok(r.Value) : BadRequest(r.Error);
    }

    /// <summary>Boletos da página: os das faturas da SIIMP e os de teste.</summary>
    [HttpGet("cobrancas")]
    public async Task<IActionResult> Cobrancas([FromQuery] string empresaId) =>
        Ok((await cobrancas.ListarAsync(empresaId, Origem)).Concat(await cobrancas.ListarAsync(empresaId, OrigemTeste)).OrderByDescending(c => c.SeuNumero));

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

    // ── fatura × empresa: o boleto sai na conta da empresa que EMITIU a fatura, nunca de outra ──

    // CNPJ de uma pessoa da SIIMP não muda; guarda para não gastar o limite de 60 req/min.
    private static readonly ConcurrentDictionary<long, string> CnpjEmitentes = new();

    private static string Digitos(string? s) => new((s ?? string.Empty).Where(char.IsDigit).ToArray());

    private async Task<string> CnpjDaEmpresaAsync(string empresaId) =>
        Digitos((await empresas.GetByIdAsync(empresaId))?.Cnpj);

    private async Task<RespostaSiimp<string>> CnpjDoEmitenteAsync(long emitenteId, CancellationToken ct)
    {
        if (emitenteId <= 0) return RespostaSiimp<string>.Ok(string.Empty);
        if (CnpjEmitentes.TryGetValue(emitenteId, out var guardado)) return RespostaSiimp<string>.Ok(guardado);
        var p = await siimp.PessoaAsync(emitenteId, ct);
        if (p.Erro.Length > 0) return RespostaSiimp<string>.Falha($"Não foi possível ler a empresa emitente na SIIMP: {p.Erro}");
        return RespostaSiimp<string>.Ok(CnpjEmitentes[emitenteId] = Digitos(p.Dados!.Documento));
    }

    /// <summary>Mensagem de erro quando a fatura foi emitida por outra empresa (vazia quando confere).</summary>
    private async Task<string> OutraEmpresaAsync(FaturaSiimp fatura, string empresaId, CancellationToken ct)
    {
        var cnpj = await CnpjDaEmpresaAsync(empresaId);
        if (cnpj.Length == 0) return "Empresa sem CNPJ no cadastro.";
        var emitente = await CnpjDoEmitenteAsync(fatura.EmitenteId, ct);
        if (emitente.Erro.Length > 0) return emitente.Erro;
        return emitente.Dados == cnpj ? string.Empty : $"A fatura {fatura.Numero} foi emitida por outra empresa (CNPJ {emitente.Dados}); escolha essa empresa para gerar o boleto.";
    }
}

using Elrond.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Elrond.API.Controllers;

/// <summary>
/// Consultas públicas para preencher cadastros: CNPJ (base aberta da Receita) e CEP. Só leitura,
/// para quem está logado; o servidor consulta as fontes (o navegador não sai do sistema).
/// </summary>
[ApiController]
[Authorize]
[Route("api/consultas")]
public class ConsultasController(IConsultaPublicaService consultas) : ControllerBase
{
    [HttpGet("cnpj/{cnpj}")]
    public async Task<IActionResult> Cnpj(string cnpj, CancellationToken ct) => Responder(await consultas.CnpjAsync(cnpj, ct));

    [HttpGet("cep/{cep}")]
    public async Task<IActionResult> Cep(string cep, CancellationToken ct) => Responder(await consultas.CepAsync(cep, ct));

    private IActionResult Responder<T>(ConsultaResposta<T> r) =>
        r.Dados is not null ? Ok(r.Dados) : Problem(detail: r.Erro, statusCode: r.Status);
}

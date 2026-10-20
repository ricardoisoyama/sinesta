using System.Net;
using System.Net.Http.Json;
using Elrond.Application.Interfaces;
using Microsoft.Extensions.Logging;

namespace Elrond.Infrastructure.Bancos.Inter;

/// <summary>
/// Cobrança (Boleto com Pix) pela API v3 do Inter. A emissão é assíncrona: devolve o
/// codigoSolicitacao e a linha digitável/Pix chegam na consulta. Classificação das respostas:
/// 2xx aceito; 400/403/404/422 recusado (dado ou credencial); 429, 5xx, tempo e rede = incerto.
/// </summary>
public sealed class InterCobranca(InterConexao conexao, ILogger<InterCobranca> log) : ICobrancaBancaria
{
    private const string Base = "/cobranca/v3/cobrancas";

    public async Task<EnvioBanco> EmitirAsync(CredencialBanco c, PedidoCobranca pedido, CancellationToken ct = default)
    {
        try
        {
            using var resp = await conexao.EnviarAsync(c, HttpMethod.Post, Base, InterMapeador.Pedido(pedido), ct);
            var corpo = await resp.Content.ReadAsStringAsync(ct);
            if (resp.IsSuccessStatusCode)
            {
                var r = System.Text.Json.JsonSerializer.Deserialize<InterEmitirResposta>(corpo, InterJson.Opcoes);
                return r?.CodigoSolicitacao is { Length: > 0 } id ? EnvioBanco.Aceito(id) : EnvioBanco.Incerto("o Inter aceitou mas não devolveu o código da cobrança");
            }
            if (Recusa(resp.StatusCode)) return EnvioBanco.Recusado(InterMapeador.Erro(corpo, (int)resp.StatusCode));
            return EnvioBanco.Incerto(InterMapeador.Erro(corpo, (int)resp.StatusCode));
        }
        catch (InterIndisponivel e) when (e.Recusa)
        {
            return EnvioBanco.Recusado(e.Message);
        }
        catch (Exception e) when (e is InterIndisponivel or HttpRequestException or TaskCanceledException)
        {
            log.LogWarning(e, "Emissão no Inter sem confirmação (seu número {SeuNumero})", pedido.SeuNumero);
            return EnvioBanco.Incerto(e is TaskCanceledException ? "o Inter demorou demais para responder" : e.Message);
        }
    }

    public async Task<ConsultaBanco> ConsultarAsync(CredencialBanco c, string idBanco, CancellationToken ct = default) =>
        await ConsultarAsync(async () =>
        {
            using var resp = await conexao.EnviarAsync(c, HttpMethod.Get, $"{Base}/{Uri.EscapeDataString(idBanco)}", null, ct);
            if (resp.StatusCode == HttpStatusCode.NotFound) return ConsultaBanco.Inexistente();
            if (!resp.IsSuccessStatusCode) return ConsultaBanco.Falhou(InterMapeador.Erro(await resp.Content.ReadAsStringAsync(ct), (int)resp.StatusCode));
            var r = await resp.Content.ReadFromJsonAsync<InterCobrancaResposta>(InterJson.Opcoes, ct);
            return r is null ? ConsultaBanco.Falhou("resposta vazia") : ConsultaBanco.Encontrada(InterMapeador.Situacao(r));
        });

    public async Task<ConsultaBanco> ConsultarPorSeuNumeroAsync(CredencialBanco c, string seuNumero, string vencimento, CancellationToken ct = default) =>
        await ConsultarAsync(async () =>
        {
            var caminho = $"{Base}?dataInicial={vencimento}&dataFinal={vencimento}&filtrarDataPor=VENCIMENTO&seuNumero={Uri.EscapeDataString(seuNumero)}";
            using var resp = await conexao.EnviarAsync(c, HttpMethod.Get, caminho, null, ct);
            if (!resp.IsSuccessStatusCode) return ConsultaBanco.Falhou(InterMapeador.Erro(await resp.Content.ReadAsStringAsync(ct), (int)resp.StatusCode));
            var r = await resp.Content.ReadFromJsonAsync<InterCobrancasResposta>(InterJson.Opcoes, ct);
            var achada = r?.Cobrancas?.FirstOrDefault(x => x.Cobranca?.SeuNumero == seuNumero);
            if (achada?.Cobranca?.CodigoSolicitacao is not { Length: > 0 } id) return ConsultaBanco.Inexistente();
            // Achou pelo seu número: consulta pelo código para ter o boleto e o Pix completos.
            return await ConsultarAsync(c, id, ct) is { Situacao: not null } completa ? completa : ConsultaBanco.Encontrada(InterMapeador.Situacao(achada));
        });

    public async Task<byte[]?> PdfAsync(CredencialBanco c, string idBanco, CancellationToken ct = default)
    {
        try
        {
            using var resp = await conexao.EnviarAsync(c, HttpMethod.Get, $"{Base}/{Uri.EscapeDataString(idBanco)}/pdf", null, ct);
            if (!resp.IsSuccessStatusCode) return null;
            var r = await resp.Content.ReadFromJsonAsync<InterPdfResposta>(InterJson.Opcoes, ct);
            return string.IsNullOrEmpty(r?.Pdf) ? null : Convert.FromBase64String(r.Pdf);
        }
        catch (Exception e) when (e is InterIndisponivel or HttpRequestException or TaskCanceledException or FormatException)
        {
            log.LogWarning(e, "PDF do boleto {IdBanco} indisponível", idBanco);
            return null;
        }
    }

    public async Task<EnvioBanco> CancelarAsync(CredencialBanco c, string idBanco, string motivo, CancellationToken ct = default)
    {
        try
        {
            using var resp = await conexao.EnviarAsync(c, HttpMethod.Post, $"{Base}/{Uri.EscapeDataString(idBanco)}/cancelar", new InterCancelar(motivo), ct);
            if (resp.IsSuccessStatusCode) return EnvioBanco.Aceito(idBanco);
            var corpo = await resp.Content.ReadAsStringAsync(ct);
            return Recusa(resp.StatusCode) ? EnvioBanco.Recusado(InterMapeador.Erro(corpo, (int)resp.StatusCode)) : EnvioBanco.Incerto(InterMapeador.Erro(corpo, (int)resp.StatusCode));
        }
        catch (InterIndisponivel e) when (e.Recusa)
        {
            return EnvioBanco.Recusado(e.Message);
        }
        catch (Exception e) when (e is InterIndisponivel or HttpRequestException or TaskCanceledException)
        {
            return EnvioBanco.Incerto(e is TaskCanceledException ? "o Inter demorou demais para responder" : e.Message);
        }
    }

    /// <summary>PUT /cobrancas/webhook: o Inter passa a chamar a URL em pagamento, cancelamento e expiração.</summary>
    public async Task<string?> RegistrarAvisoAsync(CredencialBanco c, string url, CancellationToken ct = default)
    {
        try
        {
            using var resp = await conexao.EnviarAsync(c, HttpMethod.Put, $"{Base}/webhook", new InterWebhook(url), ct);
            return resp.IsSuccessStatusCode ? null : InterMapeador.Erro(await resp.Content.ReadAsStringAsync(ct), (int)resp.StatusCode);
        }
        catch (Exception e) when (e is InterIndisponivel or HttpRequestException or TaskCanceledException)
        {
            log.LogWarning(e, "Cadastro do aviso (webhook) no Inter falhou");
            return e is TaskCanceledException ? "o Inter demorou demais para responder." : e.Message;
        }
    }

    private static bool Recusa(HttpStatusCode s) => s is HttpStatusCode.BadRequest or HttpStatusCode.Forbidden or HttpStatusCode.NotFound
        or HttpStatusCode.UnprocessableEntity or HttpStatusCode.Unauthorized or HttpStatusCode.Conflict;

    private async Task<ConsultaBanco> ConsultarAsync(Func<Task<ConsultaBanco>> consulta)
    {
        try
        {
            return await consulta();
        }
        catch (Exception e) when (e is InterIndisponivel or HttpRequestException or TaskCanceledException or System.Text.Json.JsonException)
        {
            log.LogWarning(e, "Consulta de cobrança no Inter falhou");
            return ConsultaBanco.Falhou(e is TaskCanceledException ? "o Inter demorou demais para responder" : e.Message);
        }
    }
}

/// <summary>O módulo Inter: cobrança, extrato e pagamento Pix (o saldo só no teste de conexão).</summary>
public sealed class InterModulo(InterCobranca cobranca, InterExtrato extrato, InterPagamento pagamento, InterConexao conexao, ILogger<InterModulo> log) : IBancoModulo
{
    public string Codigo => "inter";
    public string Nome => "Banco Inter";
    public IReadOnlyList<string> Recursos => [Domain.Entities.IntegracaoBancaria.RecursoCobranca, Domain.Entities.IntegracaoBancaria.RecursoExtrato, Domain.Entities.IntegracaoBancaria.RecursoSaldo, Domain.Entities.IntegracaoBancaria.RecursoPagamento];
    public ICobrancaBancaria? Cobranca => cobranca;
    public IExtratoBancario? Extrato => extrato;
    public IPagamentoBancario? Pagamento => pagamento;

    public IReadOnlyList<AvisoCobranca> LerAviso(string corpo) => InterMapeador.Aviso(corpo);

    /// <summary>Consulta o saldo (só leitura): exige token (credenciais) e mTLS (certificado) válidos.</summary>
    public async Task<string?> TestarConexaoAsync(CredencialBanco c, CancellationToken ct = default)
    {
        try
        {
            using var resp = await conexao.EnviarAsync(c, HttpMethod.Get, "/banking/v2/saldo", null, ct);
            if (resp.IsSuccessStatusCode) return null;
            if (resp.StatusCode == HttpStatusCode.Forbidden)
                return "O certificado e as credenciais foram aceitos, mas a integração no Inter não libera a consulta de saldo e extrato (escopo extrato.read).";
            return InterMapeador.Erro(await resp.Content.ReadAsStringAsync(ct), (int)resp.StatusCode);
        }
        catch (Exception e) when (e is InterIndisponivel or HttpRequestException or TaskCanceledException or System.Security.Cryptography.CryptographicException)
        {
            log.LogWarning(e, "Teste de conexão com o Inter falhou");
            return e is TaskCanceledException ? "o Inter demorou demais para responder." : e.Message;
        }
    }
}

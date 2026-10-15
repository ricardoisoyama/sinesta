using System.Collections.Concurrent;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Security.Cryptography;
using System.Security.Cryptography.X509Certificates;
using System.Text;
using System.Text.Json.Serialization;
using Elrond.Application.Interfaces;

namespace Elrond.Infrastructure.Bancos.Inter;

/// <summary>Endereços da API do Inter (produção e sandbox).</summary>
public sealed class InterOpcoes
{
    public string UrlProducao { get; init; } = "https://cdpj.partners.bancointer.com.br";
    public string UrlSandbox { get; init; } = "https://cdpj-sandbox.partners.uatinter.co";
    public string Url(string ambiente) => ambiente == "producao" ? UrlProducao : UrlSandbox;
}

/// <summary>
/// Conexões com o Inter: um HttpClient por integração (o mTLS exige o certificado DELA em toda
/// chamada, inclusive no token) e o token OAuth reaproveitado até perto de vencer (vale 60 min e
/// o Inter só deixa gerar 5 por minuto). Trocar o certificado da integração gera conexão nova.
/// </summary>
public sealed class InterConexao(InterOpcoes opcoes, TimeProvider relogio) : IDisposable
{
    /// <summary>Escopos pedidos no token (a integração no Inter precisa ter todos marcados).</summary>
    public const string Escopos = "boleto-cobranca.read boleto-cobranca.write extrato.read";

    private sealed record Cliente(HttpClient Http, string Impressao);
    private sealed record Token(string Valor, DateTimeOffset VenceEm);

    private readonly ConcurrentDictionary<string, Cliente> _clientes = new();
    private readonly ConcurrentDictionary<string, Token> _tokens = new();
    private readonly ConcurrentDictionary<string, SemaphoreSlim> _travas = new();

    /// <summary>
    /// Envia uma requisição com o certificado e o token da integração (token e conta corrente vão
    /// na própria requisição, nunca no cliente compartilhado). Token recusado (401): gera outro e
    /// tenta uma vez mais.
    /// </summary>
    public async Task<HttpResponseMessage> EnviarAsync(CredencialBanco c, HttpMethod metodo, string caminho, object? corpo, CancellationToken ct)
    {
        var http = Http(c);
        for (var tentativa = 1; ; tentativa++)
        {
            using var req = new HttpRequestMessage(metodo, caminho);
            req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", await TokenAsync(c, http, ct));
            if (c.ContaCorrente.Length > 0) req.Headers.Add("x-conta-corrente", c.ContaCorrente);
            if (corpo is not null) req.Content = JsonContent.Create(corpo, options: InterJson.Opcoes);
            var resp = await http.SendAsync(req, ct);
            if (resp.StatusCode != System.Net.HttpStatusCode.Unauthorized || tentativa > 1) return resp;
            resp.Dispose();
            _tokens.TryRemove(c.IntegracaoId, out _);
        }
    }

    private HttpClient Http(CredencialBanco c)
    {
        var impressao = Convert.ToHexString(SHA256.HashData([.. c.Certificado, .. c.Chave]));
        if (_clientes.TryGetValue(c.IntegracaoId, out var atual) && atual.Impressao == impressao) return atual.Http;

        using var pem = X509Certificate2.CreateFromPem(Encoding.UTF8.GetString(c.Certificado), Encoding.UTF8.GetString(c.Chave));
        // Exporta e reimporta: no Windows o TLS não usa chave efêmera vinda direto do PEM.
        var certificado = X509CertificateLoader.LoadPkcs12(pem.Export(X509ContentType.Pkcs12), null);
        var handler = new SocketsHttpHandler { PooledConnectionLifetime = TimeSpan.FromMinutes(5) };
        handler.SslOptions.ClientCertificates = new X509CertificateCollection { certificado };
        var http = new HttpClient(handler) { BaseAddress = new Uri(opcoes.Url(c.Ambiente)), Timeout = TimeSpan.FromSeconds(40) };
        http.DefaultRequestHeaders.UserAgent.ParseAdd("ELROND/1.0 (+https://elrond.sinesta.com.br)");
        http.DefaultRequestHeaders.Accept.ParseAdd("application/json");

        _clientes[c.IntegracaoId] = new Cliente(http, impressao);
        _tokens.TryRemove(c.IntegracaoId, out _);
        if (atual is not null) atual.Http.Dispose();
        return http;
    }

    private async Task<string> TokenAsync(CredencialBanco c, HttpClient http, CancellationToken ct)
    {
        if (Valido(c.IntegracaoId) is { } pronto) return pronto;
        var trava = _travas.GetOrAdd(c.IntegracaoId, _ => new SemaphoreSlim(1, 1));
        await trava.WaitAsync(ct);
        try
        {
            if (Valido(c.IntegracaoId) is { } outro) return outro; // outra chamada gerou enquanto esperava
            using var form = new FormUrlEncodedContent(new Dictionary<string, string>
            {
                ["client_id"] = c.ClientId,
                ["client_secret"] = c.ClientSecret,
                ["grant_type"] = "client_credentials",
                ["scope"] = Escopos,
            });
            using var resp = await http.PostAsync("/oauth/v2/token", form, ct);
            if (!resp.IsSuccessStatusCode)
                throw new InterIndisponivel(resp.StatusCode is System.Net.HttpStatusCode.BadRequest or System.Net.HttpStatusCode.Unauthorized
                    ? "o Inter recusou as credenciais (Client ID/Secret ou certificado). Confira a integração."
                    : $"o Inter não gerou o token (HTTP {(int)resp.StatusCode}).", recusa: resp.StatusCode is System.Net.HttpStatusCode.BadRequest or System.Net.HttpStatusCode.Unauthorized);
            var t = await resp.Content.ReadFromJsonAsync<RespostaToken>(ct) ?? throw new InterIndisponivel("resposta do token vazia.");
            // Renova 2 minutos antes de vencer.
            var token = new Token(t.AccessToken, relogio.GetUtcNow().AddSeconds(Math.Max(60, t.ExpiresIn - 120)));
            _tokens[c.IntegracaoId] = token;
            return token.Valor;
        }
        finally
        {
            trava.Release();
        }
    }

    private string? Valido(string integracaoId) =>
        _tokens.TryGetValue(integracaoId, out var t) && t.VenceEm > relogio.GetUtcNow() ? t.Valor : null;

    private sealed record RespostaToken(
        [property: JsonPropertyName("access_token")] string AccessToken,
        [property: JsonPropertyName("expires_in")] int ExpiresIn);

    public void Dispose()
    {
        foreach (var c in _clientes.Values) c.Http.Dispose();
        foreach (var t in _travas.Values) t.Dispose();
    }
}

/// <summary>Não deu para falar com o Inter (token, rede). <see cref="Recusa"/> = credencial errada (não adianta repetir).</summary>
public sealed class InterIndisponivel(string mensagem, bool recusa = false) : Exception(mensagem)
{
    public bool Recusa { get; } = recusa;
}

using System.Net;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;

namespace Elrond.Infrastructure.Integracoes.Google;

/// <summary>Erro devolvido pelo Google (status HTTP + corpo, para a mensagem e para o diagnóstico).</summary>
public sealed class GoogleApiException(HttpStatusCode status, string corpo) : Exception($"Google respondeu {(int)status}: {corpo}")
{
    public HttpStatusCode Status { get; } = status;
    public string Corpo { get; } = corpo;
    /// <summary>A autorização foi revogada ou venceu: o usuário precisa conectar de novo.</summary>
    public bool AutorizacaoPerdida => Corpo.Contains("invalid_grant", StringComparison.Ordinal) || Status == HttpStatusCode.Unauthorized;
}

/// <summary>Chamadas ao Google usadas pela Agenda (OAuth e eventos da agenda principal).</summary>
public interface IGoogleApi
{
    Task<JsonDocument> TrocarCodigoAsync(string code);
    Task<JsonDocument> RenovarAsync(string refreshToken);
    Task RevogarAsync(string token);
    Task<string> EmailAsync(string accessToken);
    /// <summary>Cria o evento (manda o convite aos convidados) e devolve o id e o link do Meet, se houver.</summary>
    Task<(string Id, string LinkReuniao)> InserirEventoAsync(string accessToken, JsonObject evento);
    /// <summary>Link do Meet do evento atualizado (vazio sem Meet); null quando ele não existe mais no Google.</summary>
    Task<string?> AtualizarEventoAsync(string accessToken, string eventId, JsonObject evento);
    Task ExcluirEventoAsync(string accessToken, string eventId);
    /// <summary>Lista eventos da agenda principal com os filtros da API (todas as páginas).</summary>
    Task<List<JsonElement>> ListarAsync(string accessToken, IReadOnlyDictionary<string, string> filtros);
}

public sealed class GoogleApi(HttpClient http, GoogleOpcoes opcoes) : IGoogleApi
{
    private const string Token = "https://oauth2.googleapis.com/token";
    private const string Eventos = "https://www.googleapis.com/calendar/v3/calendars/primary/events";
    // conferenceDataVersion=1 aceita o pedido de sala do Meet; sendUpdates=all manda convite e atualização aos convidados.
    private const string Gravacao = "conferenceDataVersion=1&sendUpdates=all";

    public Task<JsonDocument> TrocarCodigoAsync(string code) => PostForm(Token, new()
    {
        ["code"] = code,
        ["client_id"] = opcoes.ClientId,
        ["client_secret"] = opcoes.ClientSecret,
        ["redirect_uri"] = opcoes.RetornoUrl,
        ["grant_type"] = "authorization_code",
    });

    public Task<JsonDocument> RenovarAsync(string refreshToken) => PostForm(Token, new()
    {
        ["refresh_token"] = refreshToken,
        ["client_id"] = opcoes.ClientId,
        ["client_secret"] = opcoes.ClientSecret,
        ["grant_type"] = "refresh_token",
    });

    public async Task RevogarAsync(string token)
    {
        // Revogar é cortesia: se o Google já tinha revogado, segue a desconexão.
        try
        {
            using var r = await http.PostAsync("https://oauth2.googleapis.com/revoke", new FormUrlEncodedContent(new Dictionary<string, string> { ["token"] = token }));
        }
        catch (HttpRequestException)
        {
        }
    }

    public async Task<string> EmailAsync(string accessToken)
    {
        using var req = Requisicao(HttpMethod.Get, "https://openidconnect.googleapis.com/v1/userinfo", accessToken);
        using var doc = await Enviar(req);
        return doc.RootElement.TryGetProperty("email", out var e) ? e.GetString() ?? string.Empty : string.Empty;
    }

    public async Task<(string Id, string LinkReuniao)> InserirEventoAsync(string accessToken, JsonObject evento)
    {
        using var req = Requisicao(HttpMethod.Post, $"{Eventos}?{Gravacao}", accessToken, evento);
        using var doc = await Enviar(req);
        return (doc.RootElement.GetProperty("id").GetString()!, LinkDe(doc.RootElement));
    }

    private static string LinkDe(JsonElement ev) =>
        ev.TryGetProperty("hangoutLink", out var h) && h.ValueKind == JsonValueKind.String ? h.GetString() ?? string.Empty : string.Empty;

    public async Task<string?> AtualizarEventoAsync(string accessToken, string eventId, JsonObject evento)
    {
        try
        {
            // PATCH: muda só os campos enviados (lembretes postos no Google ficam).
            using var req = Requisicao(HttpMethod.Patch, $"{Eventos}/{Uri.EscapeDataString(eventId)}?{Gravacao}", accessToken, evento);
            using var doc = await Enviar(req);
            // Evento apagado no Google volta como "cancelled": trata como inexistente.
            if (doc.RootElement.TryGetProperty("status", out var st) && st.GetString() == "cancelled") return null;
            return LinkDe(doc.RootElement);
        }
        catch (GoogleApiException e) when (e.Status is HttpStatusCode.NotFound or HttpStatusCode.Gone)
        {
            return null;
        }
    }

    public async Task ExcluirEventoAsync(string accessToken, string eventId)
    {
        try
        {
            using var req = Requisicao(HttpMethod.Delete, $"{Eventos}/{Uri.EscapeDataString(eventId)}", accessToken);
            using var r = await http.SendAsync(req);
            if (!r.IsSuccessStatusCode && r.StatusCode is not (HttpStatusCode.NotFound or HttpStatusCode.Gone))
                throw new GoogleApiException(r.StatusCode, await r.Content.ReadAsStringAsync());
        }
        catch (GoogleApiException e) when (e.Status is HttpStatusCode.NotFound or HttpStatusCode.Gone)
        {
        }
    }

    public async Task<List<JsonElement>> ListarAsync(string accessToken, IReadOnlyDictionary<string, string> filtros)
    {
        var saida = new List<JsonElement>();
        string? pagina = null;
        for (var n = 0; n < 20; n++)
        {
            var query = filtros.Select(kv => $"{Uri.EscapeDataString(kv.Key)}={Uri.EscapeDataString(kv.Value)}").ToList();
            query.Add("maxResults=250");
            if (pagina is not null) query.Add($"pageToken={Uri.EscapeDataString(pagina)}");
            using var req = Requisicao(HttpMethod.Get, $"{Eventos}?{string.Join("&", query)}", accessToken);
            using var doc = await Enviar(req);
            if (doc.RootElement.TryGetProperty("items", out var itens))
                saida.AddRange(itens.EnumerateArray().Select(i => i.Clone()));
            pagina = doc.RootElement.TryGetProperty("nextPageToken", out var p) ? p.GetString() : null;
            if (pagina is null) break;
        }
        return saida;
    }

    private static HttpRequestMessage Requisicao(HttpMethod metodo, string url, string accessToken, JsonObject? corpo = null)
    {
        var req = new HttpRequestMessage(metodo, url);
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
        if (corpo is not null) req.Content = new StringContent(corpo.ToJsonString(), Encoding.UTF8, "application/json");
        return req;
    }

    private async Task<JsonDocument> PostForm(string url, Dictionary<string, string> campos)
    {
        using var req = new HttpRequestMessage(HttpMethod.Post, url) { Content = new FormUrlEncodedContent(campos) };
        return await Enviar(req);
    }

    private async Task<JsonDocument> Enviar(HttpRequestMessage req)
    {
        using var r = await http.SendAsync(req);
        var texto = await r.Content.ReadAsStringAsync();
        if (!r.IsSuccessStatusCode) throw new GoogleApiException(r.StatusCode, texto);
        return JsonDocument.Parse(texto.Length == 0 ? "{}" : texto);
    }
}

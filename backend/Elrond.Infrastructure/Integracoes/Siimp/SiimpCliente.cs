using System.Globalization;
using System.Text.Json;
using Elrond.Application.Interfaces;
using Microsoft.Extensions.Logging;

namespace Elrond.Infrastructure.Integracoes.Siimp;

/// <summary>Endereço do cliente na SIIMP (subdomínio) e token do usuário de integração.</summary>
public sealed class SiimpOpcoes
{
    public string Url { get; init; } = string.Empty;
    public string Token { get; init; } = string.Empty;
}

/// <summary>
/// Cliente da API REST da SIIMP, SÓ LEITURA (faturas e pessoas). Respostas no envelope
/// {data, success, message, errors}; erro de negócio pode vir com HTTP 200 e success=false.
/// Limite da SIIMP: 60 requisições por minuto.
/// </summary>
public sealed class SiimpCliente(HttpClient http, SiimpOpcoes opcoes, ILogger<SiimpCliente> log) : ISiimp
{
    public bool Configurado => opcoes.Url.Length > 0 && opcoes.Token.Length > 0;

    public async Task<RespostaSiimp<IReadOnlyList<FaturaSiimpResumo>>> FaturasAsync(string emitidasDe, string emitidasAte, CancellationToken ct = default)
    {
        var r = await GetAsync($"/invoices/search?invoice_issued_at_from={emitidasDe}&invoice_issued_at_to={emitidasAte}", ct);
        if (r.Erro.Length > 0) return RespostaSiimp<IReadOnlyList<FaturaSiimpResumo>>.Falha(r.Erro);
        var lista = r.Dados.EnumerateArray().Select(f => new FaturaSiimpResumo(
            Long(f, "id"), Long(f, "invoice_number"), Int(f, "invoice_status"), Dec(f, "total"), Str(f, "maturity"), Int(f, "payment_form"), Str(f, "created_at"))).ToList();
        return RespostaSiimp<IReadOnlyList<FaturaSiimpResumo>>.Ok(lista);
    }

    public async Task<RespostaSiimp<FaturaSiimp>> FaturaAsync(long id, CancellationToken ct = default)
    {
        var r = await GetAsync($"/invoices/search?id={id}", ct);
        if (r.Erro.Length > 0) return RespostaSiimp<FaturaSiimp>.Falha(r.Erro);
        if (r.Dados.GetArrayLength() == 0) return RespostaSiimp<FaturaSiimp>.Falha("Fatura não encontrada na SIIMP.");
        var f = r.Dados[0];
        var cliente = f.TryGetProperty("customer", out var c) && c.ValueKind == JsonValueKind.Object ? c : default;
        var parcelas = Lista(f, "parcels").Select(p => new ParcelaSiimp(Long(p, "id"), Int(p, "number"), Dec(p, "value"), Dec(p, "discount"), Str(p, "maturity"), Int(p, "status"))).ToList();
        var documentos = Lista(f, "documents").Select(d => new DocumentoSiimp(
            Long(d, "cte_id") > 0 ? "CT-e" : Long(d, "income_id") > 0 ? "Minuta" : "NF", Str(d, "number"), Str(d, "serie"), Str(d, "key"), Dec(d, "total"))).ToList();
        var carteira = f.TryGetProperty("wallet", out var w) && w.ValueKind == JsonValueKind.Object ? Str(w, "description") : string.Empty;
        return RespostaSiimp<FaturaSiimp>.Ok(new FaturaSiimp(
            Long(f, "id"), Long(f, "invoice_number"), Int(f, "invoice_status"), Dec(f, "total"), Str(f, "maturity"), Int(f, "payment_form"),
            cliente.ValueKind == JsonValueKind.Object ? Long(cliente, "id") : 0,
            cliente.ValueKind == JsonValueKind.Object ? Str(cliente, "name") : string.Empty,
            cliente.ValueKind == JsonValueKind.Object ? (Str(cliente, "cnpj") is { Length: > 0 } cnpj ? cnpj : Str(cliente, "cpf")) : string.Empty,
            carteira, Str(f, "invoice_obs"), parcelas, documentos));
    }

    public async Task<RespostaSiimp<PessoaSiimp>> PessoaAsync(long id, CancellationToken ct = default)
    {
        var r = await GetAsync($"/people/search?id={id}", ct);
        if (r.Erro.Length > 0) return RespostaSiimp<PessoaSiimp>.Falha(r.Erro);
        if (r.Dados.GetArrayLength() == 0) return RespostaSiimp<PessoaSiimp>.Falha("Pessoa não encontrada na SIIMP.");
        var p = r.Dados[0];
        var e = p.TryGetProperty("main_address", out var a) && a.ValueKind == JsonValueKind.Object ? a : default;
        string End(string campo) => e.ValueKind == JsonValueKind.Object ? Str(e, campo) : string.Empty;
        string Sub(string obj, string campo) => e.ValueKind == JsonValueKind.Object && e.TryGetProperty(obj, out var o) && o.ValueKind == JsonValueKind.Object ? Str(o, campo) : string.Empty;
        var fone = Str(p, "cellphone") is { Length: > 0 } cel ? cel : Str(p, "phone");
        return RespostaSiimp<PessoaSiimp>.Ok(new PessoaSiimp(
            Long(p, "id"), Str(p, "name"), Str(p, "cnpj") is { Length: > 0 } cnpj ? cnpj : Str(p, "cpf"), Str(p, "email"), fone,
            End("street"), End("number"), End("complement"), End("district"), Sub("city", "name"), Sub("state", "uf"), End("zipcode")));
    }

    // ── envelope da SIIMP ──

    private sealed record Envelope(JsonElement Dados, string Erro);

    private async Task<Envelope> GetAsync(string caminho, CancellationToken ct)
    {
        if (!Configurado) return new Envelope(default, "A SIIMP não está configurada neste ambiente (Siimp__Url e Siimp__Token).");
        try
        {
            using var req = new HttpRequestMessage(HttpMethod.Get, opcoes.Url.TrimEnd('/') + caminho);
            req.Headers.Add("X-Api-Key", opcoes.Token);
            using var resp = await http.SendAsync(req, ct);
            var corpo = await resp.Content.ReadAsStringAsync(ct);
            using var doc = JsonDocument.Parse(corpo);
            var raiz = doc.RootElement;
            var sucesso = raiz.TryGetProperty("success", out var s) && s.ValueKind == JsonValueKind.True;
            if (!resp.IsSuccessStatusCode || !sucesso)
                return new Envelope(default, $"A SIIMP recusou: {(raiz.TryGetProperty("message", out var m) ? m.GetString() : $"HTTP {(int)resp.StatusCode}")}");
            var dados = raiz.TryGetProperty("data", out var d) && d.ValueKind == JsonValueKind.Array ? d.Clone() : JsonDocument.Parse("[]").RootElement.Clone();
            return new Envelope(dados, string.Empty);
        }
        catch (Exception e) when (e is HttpRequestException or TaskCanceledException or JsonException)
        {
            log.LogWarning(e, "Consulta à SIIMP falhou ({Caminho})", caminho.Split('?')[0]);
            return new Envelope(default, e is TaskCanceledException ? "A SIIMP demorou demais para responder." : "Não foi possível falar com a SIIMP agora.");
        }
    }

    private static IEnumerable<JsonElement> Lista(JsonElement o, string nome) =>
        o.TryGetProperty(nome, out var v) && v.ValueKind == JsonValueKind.Array ? v.EnumerateArray() : Enumerable.Empty<JsonElement>();

    private static string Str(JsonElement o, string nome) =>
        o.TryGetProperty(nome, out var v) ? v.ValueKind switch
        {
            JsonValueKind.String => v.GetString() ?? string.Empty,
            JsonValueKind.Number => v.GetRawText(),
            _ => string.Empty,
        } : string.Empty;

    private static long Long(JsonElement o, string nome) => long.TryParse(Str(o, nome), NumberStyles.Integer, CultureInfo.InvariantCulture, out var n) ? n : 0;
    private static int Int(JsonElement o, string nome) => (int)Long(o, nome);
    private static decimal Dec(JsonElement o, string nome) => decimal.TryParse(Str(o, nome), NumberStyles.Number, CultureInfo.InvariantCulture, out var d) ? d : 0m;
}

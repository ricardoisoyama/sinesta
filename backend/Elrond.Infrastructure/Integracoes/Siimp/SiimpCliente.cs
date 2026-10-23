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
/// Cliente da API REST da SIIMP, SÓ LEITURA (faturas, pessoas, CT-es e minutas). Respostas no envelope
/// {data, success, total, message}; erro de negócio pode vir com HTTP 200 e success=false.
/// Limite da SIIMP: 60 requisições por minuto. As chamadas saem uma por vez, com intervalo mínimo;
/// estourou o limite (a SIIMP devolve uma página HTML), espera e tenta de novo.
/// </summary>
public sealed class SiimpCliente(HttpClient http, SiimpOpcoes opcoes, ILogger<SiimpCliente> log) : ISiimp
{
    private static readonly TimeSpan Intervalo = TimeSpan.FromMilliseconds(1100);
    private static readonly TimeSpan EsperaNoLimite = TimeSpan.FromSeconds(30);
    private const int MaxPaginas = 200;
    private readonly SemaphoreSlim _fila = new(1, 1);
    private DateTime _ultima = DateTime.MinValue;

    public bool Configurado => opcoes.Url.Length > 0 && opcoes.Token.Length > 0;

    public async Task<RespostaSiimp<IReadOnlyList<DocumentoTransporteSiimp>>> DocumentosTransporteAsync(string criadosDe, string criadosAte, CancellationToken ct = default)
    {
        var ctes = await TodasAsync($"/ctes/search?created_from={criadosDe}&created_to={criadosAte}", ct);
        if (ctes.Erro.Length > 0) return RespostaSiimp<IReadOnlyList<DocumentoTransporteSiimp>>.Falha(ctes.Erro);
        var minutas = await TodasAsync($"/incomes/search?created_from={criadosDe}&created_to={criadosAte}", ct);
        if (minutas.Erro.Length > 0) return RespostaSiimp<IReadOnlyList<DocumentoTransporteSiimp>>.Falha(minutas.Erro);
        var lista = new List<DocumentoTransporteSiimp>();
        foreach (var c in ctes.Itens)
        {
            var dono = Obj(c, "owner");
            var tomador = Obj(c, "customer");
            var trecho = string.Join(" → ", new[] { Str(Obj(c, "sender"), "name"), Str(Obj(c, "addressee"), "name") }.Where(x => x.Length > 0));
            lista.Add(new DocumentoTransporteSiimp("cte", Long(c, "id"), Str(c, "number"), Str(c, "serie"), Str(c, "key"), Int(c, "status"),
                Data(Str(c, "created_at")), Data(Str(c, "issued_at")), Long(dono, "id"), Str(dono, "name"), Long(tomador, "id"), Str(tomador, "name"),
                Dec(Obj(c, "totals"), "total"), trecho, string.Empty));
        }
        foreach (var m in minutas.Itens)
        {
            var solicitante = Obj(m, "requestor");
            lista.Add(new DocumentoTransporteSiimp("minuta", Long(m, "id"), Str(m, "number"), Str(m, "serie"), string.Empty, Int(m, "status"),
                Data(Str(m, "created_at")), Data(Str(m, "created_at")), Long(m, "owner_id"), string.Empty, Long(solicitante, "id"), Str(solicitante, "name"),
                Dec(Obj(m, "totals"), "total"), Str(m, "obs"), Str(Obj(m, "nfse"), "number")));
        }
        return RespostaSiimp<IReadOnlyList<DocumentoTransporteSiimp>>.Ok(lista);
    }

    public async Task<RespostaSiimp<IReadOnlyList<FaturaSiimpResumo>>> FaturasParaConferirAsync(string desde, CancellationToken ct = default)
    {
        var cadastradas = await TodasAsync("/invoices/search?status=0", ct);
        if (cadastradas.Erro.Length > 0) return RespostaSiimp<IReadOnlyList<FaturaSiimpResumo>>.Falha(cadastradas.Erro);
        var emitidas = await TodasAsync($"/invoices/search?invoice_issued_at_from={desde}", ct);
        if (emitidas.Erro.Length > 0) return RespostaSiimp<IReadOnlyList<FaturaSiimpResumo>>.Falha(emitidas.Erro);
        var lista = cadastradas.Itens.Concat(emitidas.Itens).Select(Resumo).GroupBy(f => f.Id).Select(g => g.First()).ToList();
        return RespostaSiimp<IReadOnlyList<FaturaSiimpResumo>>.Ok(lista);
    }

    public async Task<RespostaSiimp<DetalheTransporteSiimp>> DetalheTransporteAsync(string tipo, long id, CancellationToken ct = default)
    {
        var minuta = tipo == "minuta";
        var r = await GetAsync(minuta ? $"/incomes/search?id={id}" : $"/ctes/search?id={id}", ct);
        if (r.Erro.Length > 0) return RespostaSiimp<DetalheTransporteSiimp>.Falha(r.Erro);
        if (r.Dados.GetArrayLength() == 0) return RespostaSiimp<DetalheTransporteSiimp>.Falha($"{(minuta ? "Minuta" : "CT-e")} não encontrado na SIIMP.");
        var d = r.Dados[0];
        var totais = Obj(d, "totals");
        var componentes = Obj(totais, "components");
        var carga = Obj(d, "cargo");
        var nfs = new List<NfTransporteSiimp>();
        foreach (var nf in Lista(d, "nfs"))
        {
            var emissao = Data(Str(nf, "issued_at"));
            // A minuta não traz a data da NF: busca a NF (uma chamada por NF, só quando falta).
            if (emissao.Length == 0 && Long(nf, "id") is > 0 and var nfId)
            {
                var b = await GetAsync($"/nfs/search?id={nfId}", ct);
                if (b.Erro.Length == 0 && b.Dados.GetArrayLength() > 0) emissao = Data(Str(b.Dados[0], "issued_at"));
            }
            nfs.Add(new NfTransporteSiimp(Long(nf, "id"), Str(nf, "serie"), Str(nf, "number"), emissao, Dec(nf, "weight"), Dec(nf, "total")));
        }
        var nfse = Obj(d, "nfse");
        return RespostaSiimp<DetalheTransporteSiimp>.Ok(new DetalheTransporteSiimp(
            minuta ? "minuta" : "cte", Long(d, "id"), Dec(totais, "total"), Dec(carga, "weight"), Dec(carga, "value"),
            Dec(componentes, "gris"), Dec(componentes, "insurance"), Dec(componentes, "toll"), minuta ? 0m : Dec(d, "icms"),
            Long(nfse, "id"), Str(nfse, "number"), Long(Obj(d, "classifications"), "costcenter"), nfs));
    }

    public async Task<RespostaSiimp<IReadOnlyDictionary<long, long>>> UltimasFaturasAsync(string desde, CancellationToken ct = default)
    {
        var maiores = new Dictionary<long, long>();
        // Cadastradas (ainda sem emissão) já têm número; as demais pela data de emissão.
        foreach (var caminho in new[] { "/invoices/search?status=0", $"/invoices/search?invoice_issued_at_from={desde}" })
        {
            var r = await TodasAsync(caminho, ct);
            if (r.Erro.Length > 0) return RespostaSiimp<IReadOnlyDictionary<long, long>>.Falha(r.Erro);
            foreach (var f in r.Itens)
            {
                var dono = Long(f, "owner_id");
                var numero = Long(f, "invoice_number");
                if (dono > 0 && numero > maiores.GetValueOrDefault(dono)) maiores[dono] = numero;
            }
        }
        return RespostaSiimp<IReadOnlyDictionary<long, long>>.Ok(maiores);
    }

    public Task<RespostaSiimp<ArquivoSiimp>> DacteAsync(long cteId, CancellationToken ct = default) =>
        ArquivoAsync($"/ctes/dacte?id={cteId}&layout=0", ct);

    public Task<RespostaSiimp<ArquivoSiimp>> NfsePdfAsync(long nfseId, CancellationToken ct = default) =>
        ArquivoAsync($"/nfses/print?ids={nfseId}", ct);

    /// <summary>Arquivo binário (PDF): mesma fila e intervalo das consultas; resposta que não é PDF vira erro.</summary>
    private async Task<RespostaSiimp<ArquivoSiimp>> ArquivoAsync(string caminho, CancellationToken ct)
    {
        if (!Configurado) return RespostaSiimp<ArquivoSiimp>.Falha("A SIIMP não está configurada neste ambiente (Siimp__Url e Siimp__Token).");
        for (var tentativa = 1; ; tentativa++)
        {
            await _fila.WaitAsync(ct);
            byte[] corpo;
            string tipo;
            int status;
            try
            {
                var falta = _ultima + Intervalo - DateTime.UtcNow;
                if (falta > TimeSpan.Zero) await Task.Delay(falta, ct);
                using var req = new HttpRequestMessage(HttpMethod.Get, opcoes.Url.TrimEnd('/') + caminho);
                req.Headers.Add("X-Api-Key", opcoes.Token);
                using var resp = await http.SendAsync(req, ct);
                corpo = await resp.Content.ReadAsByteArrayAsync(ct);
                tipo = resp.Content.Headers.ContentType?.MediaType ?? string.Empty;
                status = (int)resp.StatusCode;
                _ultima = DateTime.UtcNow;
            }
            catch (Exception e) when (e is HttpRequestException or TaskCanceledException)
            {
                log.LogWarning(e, "Arquivo da SIIMP falhou ({Caminho})", caminho.Split('?')[0]);
                return RespostaSiimp<ArquivoSiimp>.Falha(e is TaskCanceledException ? "A SIIMP demorou demais para responder." : "Não foi possível falar com a SIIMP agora.");
            }
            finally
            {
                _fila.Release();
            }
            if (status == 200 && corpo.Length > 4 && corpo[0] == '%' && corpo[1] == 'P' && corpo[2] == 'D' && corpo[3] == 'F')
                return RespostaSiimp<ArquivoSiimp>.Ok(new ArquivoSiimp(corpo, "application/pdf"));
            // HTML = limite de chamadas: espera e tenta de novo (como nas consultas).
            if (tipo.Contains("html", StringComparison.OrdinalIgnoreCase) && tentativa < 3)
            {
                await Task.Delay(EsperaNoLimite, ct);
                continue;
            }
            return RespostaSiimp<ArquivoSiimp>.Falha($"A SIIMP não devolveu o PDF (HTTP {status}).");
        }
    }

    private static FaturaSiimpResumo Resumo(JsonElement f) =>
        new(Long(f, "id"), Long(f, "invoice_number"), Int(f, "invoice_status"), Dec(f, "total"), Str(f, "maturity"), Int(f, "payment_form"), Str(f, "created_at"), Long(f, "owner_id"));

    private static string Data(string s) => s.Length >= 10 ? s[..10] : s;
    private static JsonElement Obj(JsonElement o, string nome) =>
        o.ValueKind == JsonValueKind.Object && o.TryGetProperty(nome, out var v) && v.ValueKind == JsonValueKind.Object ? v : default;

    public async Task<RespostaSiimp<IReadOnlyList<FaturaSiimpResumo>>> FaturasAsync(string emitidasDe, string emitidasAte, CancellationToken ct = default)
    {
        var r = await GetAsync($"/invoices/search?invoice_issued_at_from={emitidasDe}&invoice_issued_at_to={emitidasAte}", ct);
        if (r.Erro.Length > 0) return RespostaSiimp<IReadOnlyList<FaturaSiimpResumo>>.Falha(r.Erro);
        var lista = r.Dados.EnumerateArray().Select(Resumo).ToList();
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
            Long(d, "cte_id") > 0 ? "CT-e" : Long(d, "income_id") > 0 ? "Minuta" : "NF", Str(d, "number"), Str(d, "serie"), Str(d, "key"), Dec(d, "total"),
            Long(d, "cte_id"), Long(d, "income_id"))).ToList();
        var carteira = f.TryGetProperty("wallet", out var w) && w.ValueKind == JsonValueKind.Object ? Str(w, "description") : string.Empty;
        return RespostaSiimp<FaturaSiimp>.Ok(new FaturaSiimp(
            Long(f, "id"), Long(f, "invoice_number"), Int(f, "invoice_status"), Dec(f, "total"), Str(f, "maturity"), Int(f, "payment_form"),
            cliente.ValueKind == JsonValueKind.Object ? Long(cliente, "id") : 0,
            cliente.ValueKind == JsonValueKind.Object ? Str(cliente, "name") : string.Empty,
            cliente.ValueKind == JsonValueKind.Object ? (Str(cliente, "cnpj") is { Length: > 0 } cnpj ? cnpj : Str(cliente, "cpf")) : string.Empty,
            carteira, Str(f, "invoice_obs"), parcelas, documentos, Long(f, "owner_id")));
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

    private sealed record Envelope(JsonElement Dados, string Erro, long Total = 0);
    private sealed record Paginas(List<JsonElement> Itens, string Erro);

    /// <summary>Todas as páginas de uma busca (a SIIMP informa o total; página vazia também encerra).</summary>
    private async Task<Paginas> TodasAsync(string caminho, CancellationToken ct)
    {
        var itens = new List<JsonElement>();
        for (var pagina = 1; pagina <= MaxPaginas; pagina++)
        {
            var r = await GetAsync($"{caminho}{(caminho.Contains('?') ? "&" : "?")}page={pagina}", ct);
            if (r.Erro.Length > 0) return new Paginas(itens, r.Erro);
            var lote = r.Dados.EnumerateArray().ToList();
            itens.AddRange(lote);
            if (lote.Count == 0 || itens.Count >= r.Total) break;
        }
        return new Paginas(itens, string.Empty);
    }

    private async Task<Envelope> GetAsync(string caminho, CancellationToken ct)
    {
        if (!Configurado) return new Envelope(default, "A SIIMP não está configurada neste ambiente (Siimp__Url e Siimp__Token).");
        for (var tentativa = 1; ; tentativa++)
        {
            var r = await UmaVezAsync(caminho, ct);
            if (r is not null) return r;
            // Resposta que não é JSON: a SIIMP devolve uma página HTML quando o limite de chamadas estoura.
            if (tentativa >= 3) return new Envelope(default, "A SIIMP está limitando as consultas agora. Tente de novo em alguns minutos.");
            log.LogInformation("SIIMP no limite de chamadas ({Caminho}); esperando para tentar de novo", caminho.Split('?')[0]);
            await Task.Delay(EsperaNoLimite, ct);
        }
    }

    /// <summary>Uma chamada, respeitando o intervalo entre chamadas. Null = a resposta não era JSON (limite).</summary>
    private async Task<Envelope?> UmaVezAsync(string caminho, CancellationToken ct)
    {
        await _fila.WaitAsync(ct);
        try
        {
            var falta = _ultima + Intervalo - DateTime.UtcNow;
            if (falta > TimeSpan.Zero) await Task.Delay(falta, ct);
            using var req = new HttpRequestMessage(HttpMethod.Get, opcoes.Url.TrimEnd('/') + caminho);
            req.Headers.Add("X-Api-Key", opcoes.Token);
            using var resp = await http.SendAsync(req, ct);
            var corpo = await resp.Content.ReadAsStringAsync(ct);
            _ultima = DateTime.UtcNow;
            JsonDocument doc;
            try { doc = JsonDocument.Parse(corpo); }
            catch (JsonException) { return null; }
            using (doc)
            {
                var raiz = doc.RootElement;
                var sucesso = raiz.TryGetProperty("success", out var s) && s.ValueKind == JsonValueKind.True;
                if (!resp.IsSuccessStatusCode || !sucesso)
                    return new Envelope(default, $"A SIIMP recusou: {(raiz.TryGetProperty("message", out var m) ? m.GetString() : $"HTTP {(int)resp.StatusCode}")}");
                var dados = raiz.TryGetProperty("data", out var d) && d.ValueKind == JsonValueKind.Array ? d.Clone() : JsonDocument.Parse("[]").RootElement.Clone();
                var total = raiz.TryGetProperty("total", out var t) && t.TryGetInt64(out var n) ? n : dados.GetArrayLength();
                return new Envelope(dados, string.Empty, total);
            }
        }
        catch (Exception e) when (e is HttpRequestException or TaskCanceledException)
        {
            log.LogWarning(e, "Consulta à SIIMP falhou ({Caminho})", caminho.Split('?')[0]);
            return new Envelope(default, e is TaskCanceledException ? "A SIIMP demorou demais para responder." : "Não foi possível falar com a SIIMP agora.");
        }
        finally
        {
            _fila.Release();
        }
    }

    private static IEnumerable<JsonElement> Lista(JsonElement o, string nome) =>
        o.ValueKind == JsonValueKind.Object && o.TryGetProperty(nome, out var v) && v.ValueKind == JsonValueKind.Array ? v.EnumerateArray() : Enumerable.Empty<JsonElement>();

    private static string Str(JsonElement o, string nome) =>
        o.ValueKind == JsonValueKind.Object && o.TryGetProperty(nome, out var v) ? v.ValueKind switch
        {
            JsonValueKind.String => v.GetString() ?? string.Empty,
            JsonValueKind.Number => v.GetRawText(),
            _ => string.Empty,
        } : string.Empty;

    private static long Long(JsonElement o, string nome) => long.TryParse(Str(o, nome), NumberStyles.Integer, CultureInfo.InvariantCulture, out var n) ? n : 0;
    private static int Int(JsonElement o, string nome) => (int)Long(o, nome);
    private static decimal Dec(JsonElement o, string nome) => decimal.TryParse(Str(o, nome), NumberStyles.Number, CultureInfo.InvariantCulture, out var d) ? d : 0m;
}

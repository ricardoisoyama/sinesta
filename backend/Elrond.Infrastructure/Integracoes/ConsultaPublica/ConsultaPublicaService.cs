using System.Globalization;
using System.Net;
using System.Text.Json;
using Elrond.Application.Interfaces;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;

namespace Elrond.Infrastructure.Integracoes.ConsultaPublica;

/// <summary>
/// CNPJ e CEP em fontes públicas e gratuitas, sempre pelo servidor (o navegador só fala com o
/// próprio sistema). CNPJ: CNPJá aberta (5/min por IP, nomes bem escritos e e-mail) e, se ela
/// falhar, BrasilAPI. CEP: ViaCEP e, se falhar, BrasilAPI. Respostas ficam em cache para não
/// gastar o limite das fontes. A cidade sai no formato da base do sistema pelo código IBGE.
/// </summary>
public sealed class ConsultaPublicaService(HttpClient http, IMemoryCache cache, ICidadeRepository cidades, ILogger<ConsultaPublicaService> log)
    : IConsultaPublicaService
{
    private static readonly TimeSpan CacheCnpj = TimeSpan.FromHours(24);
    private static readonly TimeSpan CacheCep = TimeSpan.FromDays(30);
    private static readonly TimeSpan CacheNaoAchou = TimeSpan.FromHours(1);
    private const string Indisponivel = "A consulta está indisponível agora (as fontes públicas não responderam ou o limite de consultas por minuto acabou). Tente de novo em 1 minuto ou preencha à mão.";

    private static string Digitos(string? s) => new((s ?? string.Empty).Where(char.IsDigit).ToArray());

    // ══════════════════════════ CNPJ ══════════════════════════

    /// <summary>Confere os dois dígitos verificadores do CNPJ.</summary>
    public static bool CnpjValido(string d)
    {
        if (d.Length != 14 || d.Distinct().Count() == 1) return false;
        int Dv(string baseNum, int[] pesos)
        {
            var soma = baseNum.Select((c, i) => (c - '0') * pesos[i]).Sum();
            var r = soma % 11;
            return r < 2 ? 0 : 11 - r;
        }
        var d1 = Dv(d[..12], new[] { 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2 });
        var d2 = Dv(d[..12] + d1, new[] { 6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2 });
        return d[12] - '0' == d1 && d[13] - '0' == d2;
    }

    public async Task<ConsultaResposta<CnpjConsultaDto>> CnpjAsync(string cnpj, CancellationToken ct = default)
    {
        var d = Digitos(cnpj);
        if (!CnpjValido(d)) return ConsultaResposta<CnpjConsultaDto>.Falha(400, "CNPJ inválido: confira os 14 números.");
        if (cache.TryGetValue($"cnpj:{d}", out ConsultaResposta<CnpjConsultaDto>? guardada) && guardada is not null) return guardada;

        var (dados, achouCnpja) = await Tentar(() => CnpjaAsync(d, ct), "CNPJá");
        bool? achou = achouCnpja;
        if (dados is null)
        {
            // CNPJ recém-aberto pode estar numa base e não na outra: só é "não existe" se as duas disserem.
            var (b, achouBrasil) = await Tentar(() => BrasilApiCnpjAsync(d, ct), "BrasilAPI");
            dados = b;
            achou = achouCnpja == false && achouBrasil == false ? false : null;
        }

        ConsultaResposta<CnpjConsultaDto> r;
        if (dados is not null)
        {
            // Regime: a CNPJá diz Simples/MEI; o Lucro Presumido/Real vem do histórico da BrasilAPI.
            if (dados.Regime.Length == 0 && dados.Fonte.StartsWith("CNPJá"))
            {
                var (b, _) = await Tentar(() => BrasilApiCnpjAsync(d, ct), "BrasilAPI (regime)");
                if (b is { Regime.Length: > 0 }) dados = dados with { Regime = b.Regime };
            }
            r = ConsultaResposta<CnpjConsultaDto>.Ok(dados);
            cache.Set($"cnpj:{d}", r, CacheCnpj);
        }
        else if (achou == false)
        {
            r = ConsultaResposta<CnpjConsultaDto>.Falha(404, "CNPJ não encontrado na base da Receita Federal.");
            cache.Set($"cnpj:{d}", r, CacheNaoAchou);
        }
        else r = ConsultaResposta<CnpjConsultaDto>.Falha(503, Indisponivel);
        return r;
    }

    /// <summary>Roda uma fonte: (dados, true) achou; (null, false) a fonte disse que não existe; (null, null) falhou.</summary>
    private async Task<(T? Dados, bool? Achou)> Tentar<T>(Func<Task<(T?, bool?)>> fonte, string nome) where T : class
    {
        try
        {
            return await fonte();
        }
        catch (Exception e) when (e is HttpRequestException or TaskCanceledException or JsonException or KeyNotFoundException or InvalidOperationException)
        {
            log.LogWarning("Consulta pública ({Fonte}) falhou: {Erro}", nome, e.Message);
            return (null, null);
        }
    }

    private async Task<(CnpjConsultaDto?, bool?)> CnpjaAsync(string d, CancellationToken ct)
    {
        using var resp = await http.GetAsync($"https://open.cnpja.com/office/{d}", ct);
        if (resp.StatusCode is HttpStatusCode.NotFound or HttpStatusCode.BadRequest) return (null, false);
        if (!resp.IsSuccessStatusCode) return (null, null);
        using var doc = JsonDocument.Parse(await resp.Content.ReadAsStringAsync(ct));
        var j = doc.RootElement;
        var empresa = j.GetProperty("company");
        var end = j.GetProperty("address");
        var simples = Bool(empresa, "simples", "optant");
        var mei = Bool(empresa, "simei", "optant");
        var fone = Primeiro(j, "phones");
        var email = Primeiro(j, "emails");
        var ibge = Texto(end, "municipality");
        var cidade = await CidadeAsync(ibge, Texto(end, "city"), Texto(end, "state"), ct);
        return (new CnpjConsultaDto(
            Cnpj: d,
            RazaoSocial: Texto(empresa, "name"),
            NomeFantasia: Texto(j, "alias"),
            Situacao: Texto(j.GetProperty("status"), "text"),
            Abertura: Texto(j, "founded"),
            Porte: Texto(empresa.GetProperty("size"), "text"),
            NaturezaJuridica: Texto(empresa.GetProperty("nature"), "text"),
            OptanteSimples: simples,
            OptanteMei: mei,
            Regime: mei == true ? "MEI" : simples == true ? "Simples Nacional" : string.Empty,
            Cep: FormatarCep(Texto(end, "zip")),
            Logradouro: Texto(end, "street"),
            Numero: Texto(end, "number"),
            Complemento: Texto(end, "details"),
            Bairro: Texto(end, "district"),
            Cidade: cidade,
            Uf: Texto(end, "state"),
            Telefone: fone is { } f ? FormatarTelefone(Texto(f, "area") + Texto(f, "number")) : string.Empty,
            Email: email is { } e ? Texto(e, "address").ToLowerInvariant() : string.Empty,
            AtividadePrincipal: j.TryGetProperty("mainActivity", out var at) ? Texto(at, "text") : string.Empty,
            Fonte: "CNPJá (base aberta da Receita Federal)",
            AtualizadoEm: Texto(j, "updated")), true);
    }

    private async Task<(CnpjConsultaDto?, bool?)> BrasilApiCnpjAsync(string d, CancellationToken ct)
    {
        using var resp = await http.GetAsync($"https://brasilapi.com.br/api/cnpj/v1/{d}", ct);
        if (resp.StatusCode is HttpStatusCode.NotFound or HttpStatusCode.BadRequest) return (null, false);
        if (!resp.IsSuccessStatusCode) return (null, null);
        using var doc = JsonDocument.Parse(await resp.Content.ReadAsStringAsync(ct));
        var j = doc.RootElement;
        var simples = j.TryGetProperty("opcao_pelo_simples", out var s) && s.ValueKind == JsonValueKind.True ? true : s.ValueKind == JsonValueKind.False ? false : (bool?)null;
        var mei = j.TryGetProperty("opcao_pelo_mei", out var m) && m.ValueKind == JsonValueKind.True ? true : m.ValueKind == JsonValueKind.False ? false : (bool?)null;
        // Último regime declarado (ex.: LUCRO REAL em 2024).
        var regimeDeclarado = string.Empty;
        if (j.TryGetProperty("regime_tributario", out var reg) && reg.ValueKind == JsonValueKind.Array)
        {
            var ultimo = reg.EnumerateArray().OrderBy(x => x.TryGetProperty("ano", out var a) && a.TryGetInt32(out var n) ? n : 0).LastOrDefault();
            if (ultimo.ValueKind == JsonValueKind.Object) regimeDeclarado = Nome(Texto(ultimo, "forma_de_tributacao"));
        }
        var ibge = Texto(j, "codigo_municipio_ibge");
        var cidade = await CidadeAsync(ibge, Nome(Texto(j, "municipio")), Texto(j, "uf"), ct);
        var tipoLog = Texto(j, "descricao_tipo_de_logradouro");
        var logradouro = Texto(j, "logradouro");
        return (new CnpjConsultaDto(
            Cnpj: d,
            RazaoSocial: Texto(j, "razao_social"),
            NomeFantasia: Nome(Texto(j, "nome_fantasia")),
            Situacao: Nome(Texto(j, "descricao_situacao_cadastral")),
            Abertura: Texto(j, "data_inicio_atividade"),
            Porte: Nome(Texto(j, "porte")),
            NaturezaJuridica: Texto(j, "natureza_juridica"),
            OptanteSimples: simples,
            OptanteMei: mei,
            Regime: mei == true ? "MEI" : simples == true ? "Simples Nacional" : regimeDeclarado,
            Cep: FormatarCep(Texto(j, "cep")),
            Logradouro: Nome($"{tipoLog} {logradouro}".Trim()),
            Numero: Texto(j, "numero"),
            Complemento: Nome(Texto(j, "complemento")),
            Bairro: Nome(Texto(j, "bairro")),
            Cidade: cidade,
            Uf: Texto(j, "uf"),
            Telefone: FormatarTelefone(Texto(j, "ddd_telefone_1")),
            Email: Texto(j, "email").ToLowerInvariant(),
            AtividadePrincipal: Texto(j, "cnae_fiscal_descricao"),
            Fonte: "BrasilAPI (base aberta da Receita Federal)",
            AtualizadoEm: string.Empty), true);
    }

    // ══════════════════════════ CEP ══════════════════════════

    public async Task<ConsultaResposta<CepConsultaDto>> CepAsync(string cep, CancellationToken ct = default)
    {
        var d = Digitos(cep);
        if (d.Length != 8) return ConsultaResposta<CepConsultaDto>.Falha(400, "CEP inválido: são 8 números.");
        if (cache.TryGetValue($"cep:{d}", out ConsultaResposta<CepConsultaDto>? guardada) && guardada is not null) return guardada;

        var (dados, achou) = await Tentar(() => ViaCepAsync(d, ct), "ViaCEP");
        // BrasilAPI só quando o ViaCEP falhou: se ele disse que o CEP não existe, vale isso
        // (a base da BrasilAPI devolve endereço para CEPs inventados, como 99999999).
        if (dados is null && achou is null) (dados, achou) = await Tentar(() => BrasilApiCepAsync(d, ct), "BrasilAPI");

        ConsultaResposta<CepConsultaDto> r;
        if (dados is not null)
        {
            r = ConsultaResposta<CepConsultaDto>.Ok(dados);
            cache.Set($"cep:{d}", r, CacheCep);
        }
        else if (achou == false)
        {
            r = ConsultaResposta<CepConsultaDto>.Falha(404, "CEP não encontrado.");
            cache.Set($"cep:{d}", r, CacheNaoAchou);
        }
        else r = ConsultaResposta<CepConsultaDto>.Falha(503, Indisponivel);
        return r;
    }

    private async Task<(CepConsultaDto?, bool?)> ViaCepAsync(string d, CancellationToken ct)
    {
        using var resp = await http.GetAsync($"https://viacep.com.br/ws/{d}/json/", ct);
        if (resp.StatusCode == HttpStatusCode.BadRequest) return (null, false);
        if (!resp.IsSuccessStatusCode) return (null, null);
        using var doc = JsonDocument.Parse(await resp.Content.ReadAsStringAsync(ct));
        var j = doc.RootElement;
        // CEP que não existe volta 200 com {"erro": true}.
        if (j.TryGetProperty("erro", out var erro) && (erro.ValueKind == JsonValueKind.True || erro.GetString() == "true")) return (null, false);
        var ibge = Texto(j, "ibge");
        return (new CepConsultaDto(
            Cep: FormatarCep(d),
            Logradouro: Texto(j, "logradouro"),
            Observacao: Texto(j, "complemento"),
            Bairro: Texto(j, "bairro"),
            Cidade: await CidadeAsync(ibge, Texto(j, "localidade"), Texto(j, "uf"), ct),
            Uf: Texto(j, "uf"),
            Ibge: ibge,
            Fonte: "ViaCEP"), true);
    }

    private async Task<(CepConsultaDto?, bool?)> BrasilApiCepAsync(string d, CancellationToken ct)
    {
        using var resp = await http.GetAsync($"https://brasilapi.com.br/api/cep/v2/{d}", ct);
        if (resp.StatusCode == HttpStatusCode.NotFound) return (null, false);
        if (!resp.IsSuccessStatusCode) return (null, null);
        using var doc = JsonDocument.Parse(await resp.Content.ReadAsStringAsync(ct));
        var j = doc.RootElement;
        var ibge = j.TryGetProperty("ibge", out var ib) ? Texto(ib, "city") : string.Empty;
        return (new CepConsultaDto(
            Cep: FormatarCep(d),
            Logradouro: Texto(j, "street"),
            Observacao: string.Empty,
            Bairro: Texto(j, "neighborhood"),
            Cidade: await CidadeAsync(ibge, Texto(j, "city"), Texto(j, "state"), ct),
            Uf: Texto(j, "state"),
            Ibge: ibge,
            Fonte: "BrasilAPI"), true);
    }

    // ══════════════════════════ apoio ══════════════════════════

    /// <summary>"Cidade - UF" pela base do sistema (código IBGE); sem código, monta com o que a fonte mandou.</summary>
    private async Task<string> CidadeAsync(string ibge, string nome, string uf, CancellationToken ct)
    {
        if (ibge.Length > 0 && await cidades.PorIbgeAsync(ibge, ct) is { } c) return $"{c.Nome} - {c.Uf}";
        return nome.Length > 0 && uf.Length > 0 ? $"{nome} - {uf}" : string.Empty;
    }

    private static string Texto(JsonElement e, string prop) =>
        e.ValueKind == JsonValueKind.Object && e.TryGetProperty(prop, out var v)
            ? v.ValueKind switch
            {
                JsonValueKind.String => (v.GetString() ?? string.Empty).Trim(),
                JsonValueKind.Number => v.GetRawText(),
                _ => string.Empty,
            }
            : string.Empty;

    private static bool? Bool(JsonElement e, string obj, string prop) =>
        e.TryGetProperty(obj, out var o) && o.ValueKind == JsonValueKind.Object && o.TryGetProperty(prop, out var v)
            ? v.ValueKind == JsonValueKind.True ? true : v.ValueKind == JsonValueKind.False ? false : null
            : null;

    private static JsonElement? Primeiro(JsonElement e, string lista) =>
        e.TryGetProperty(lista, out var l) && l.ValueKind == JsonValueKind.Array && l.GetArrayLength() > 0 ? l[0] : null;

    private static string FormatarCep(string cep)
    {
        var d = Digitos(cep);
        return d.Length == 8 ? $"{d[..5]}-{d[5..]}" : d;
    }

    /// <summary>"1164237319" → "(11) 6423-7319"; 11 dígitos → "(11) 96423-7319".</summary>
    public static string FormatarTelefone(string fone)
    {
        var d = Digitos(fone);
        return d.Length switch
        {
            10 => $"({d[..2]}) {d[2..6]}-{d[6..]}",
            11 => $"({d[..2]}) {d[2..7]}-{d[7..]}",
            _ => d,
        };
    }

    private static readonly HashSet<string> Minusculas = new(StringComparer.OrdinalIgnoreCase) { "de", "da", "do", "das", "dos", "e", "em", "a", "o" };

    /// <summary>"DOUTOR LUIS ARROBAS MARTINS" → "Doutor Luis Arrobas Martins" (a BrasilAPI manda tudo em maiúsculas).</summary>
    public static string Nome(string texto)
    {
        if (string.IsNullOrWhiteSpace(texto)) return string.Empty;
        var cultura = CultureInfo.GetCultureInfo("pt-BR");
        var palavras = texto.Trim().ToLower(cultura).Split(' ', StringSplitOptions.RemoveEmptyEntries);
        return string.Join(' ', palavras.Select((p, i) => i > 0 && Minusculas.Contains(p) ? p : char.ToUpper(p[0], cultura) + p[1..]));
    }
}

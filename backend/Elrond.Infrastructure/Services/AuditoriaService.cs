using System.Text.Json;
using System.Text.Json.Serialization;
using Elrond.Application.DTOs;
using Elrond.Application.Interfaces;
using Elrond.Domain.Entities;
using Elrond.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Elrond.Infrastructure.Services;

/// <summary>
/// Grava a trilha de auditoria na tabela `auditoria`. Para edições, guarda só os campos
/// de primeiro nível que mudaram (de → para); textos muito longos (ex.: logo em base64)
/// viram um marcador para a tabela não inchar.
/// </summary>
public class AuditoriaService : IAuditoriaService
{
    private static readonly JsonSerializerOptions Json = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        DefaultIgnoreCondition = JsonIgnoreCondition.Never,
    };
    private const int TamanhoMaximoDoValor = 400;

    private readonly AppDbContext _db;
    private readonly IUsuarioAtualProvider _usuario;

    public AuditoriaService(AppDbContext db, IUsuarioAtualProvider usuario)
    {
        _db = db;
        _usuario = usuario;
    }

    public async Task RegistrarAsync(string acao, string entidade, string entidadeId, string descricao,
        object? antes = null, object? depois = null, UsuarioAtual? quem = null)
    {
        quem ??= await _usuario.QuemAsync();
        var registro = new RegistroAuditoria
        {
            Id = Guid.NewGuid().ToString(),
            Em = DateTime.UtcNow.ToString("o"),
            UsuarioId = quem.Id,
            UsuarioNome = quem.Nome,
            Acao = acao,
            Entidade = entidade,
            EntidadeId = entidadeId,
            Descricao = descricao,
            Alteracoes = Diferencas(antes, depois),
            Ip = _usuario.Ip,
        };
        _db.Auditoria.Add(registro);
        await _db.SaveChangesAsync();
        // Não deixa o registro preso no tracker (o repositório genérico limpa o tracker em updates).
        _db.Entry(registro).State = EntityState.Detached;
    }

    public async Task<List<RegistroAuditoria>> ListarAsync(int limite, string? entidade = null, string? usuario = null, string? acao = null, string? entidadeId = null)
    {
        var q = _db.Auditoria.AsNoTracking().AsQueryable();
        if (!string.IsNullOrWhiteSpace(entidade)) q = q.Where(a => a.Entidade == entidade);
        if (!string.IsNullOrWhiteSpace(acao)) q = q.Where(a => a.Acao == acao);
        if (!string.IsNullOrWhiteSpace(entidadeId)) q = q.Where(a => a.EntidadeId == entidadeId);
        if (!string.IsNullOrWhiteSpace(usuario))
        {
            var u = usuario.Trim().ToLower();
            q = q.Where(a => a.UsuarioNome.ToLower().Contains(u));
        }
        return await q.OrderByDescending(a => a.Em).Take(Math.Clamp(limite, 1, 2000)).ToListAsync();
    }

    /// <summary>JSON { campo: { de, para } } só com o que mudou. Sem "antes" (criação) devolve "{}".</summary>
    public static string Diferencas(object? antes, object? depois)
    {
        if (antes is null || depois is null) return "{}";
        using var a = JsonDocument.Parse(JsonSerializer.Serialize(antes, antes.GetType(), Json));
        using var d = JsonDocument.Parse(JsonSerializer.Serialize(depois, depois.GetType(), Json));
        if (a.RootElement.ValueKind != JsonValueKind.Object || d.RootElement.ValueKind != JsonValueKind.Object) return "{}";

        var mudancas = new Dictionary<string, object>();
        var nomes = a.RootElement.EnumerateObject().Select(p => p.Name)
            .Union(d.RootElement.EnumerateObject().Select(p => p.Name));
        foreach (var nome in nomes)
        {
            var temA = a.RootElement.TryGetProperty(nome, out var va);
            var temD = d.RootElement.TryGetProperty(nome, out var vd);
            if (temA && temD && Iguais(va, vd)) continue;
            var ta = temA ? va.GetRawText() : "null";
            var td = temD ? vd.GetRawText() : "null";
            if (ta == td) continue;
            mudancas[nome] = new { de = Resumo(ta), para = Resumo(td) };
        }
        return JsonSerializer.Serialize(mudancas, Json);
    }

    /// <summary>
    /// Igualdade por valor: o registro lido do banco vem com decimais "0.000000" e o payload com "0";
    /// sem isso todo campo numérico apareceria como alterado.
    /// </summary>
    private static bool Iguais(JsonElement x, JsonElement y)
    {
        // Nulo, "", [] e objeto só com valores vazios são a mesma coisa: cadastros antigos têm
        // colunas novas nulas e o front manda o bloco em branco — isso não é alteração.
        if (Vazio(x) && Vazio(y)) return true;
        if (x.ValueKind != y.ValueKind)
            return false;
        switch (x.ValueKind)
        {
            case JsonValueKind.Number:
                return x.TryGetDecimal(out var dx) && y.TryGetDecimal(out var dy) ? dx == dy : x.GetRawText() == y.GetRawText();
            case JsonValueKind.String:
                return x.GetString() == y.GetString();
            case JsonValueKind.Array:
                if (x.GetArrayLength() != y.GetArrayLength()) return false;
                using (var ex = x.EnumerateArray())
                using (var ey = y.EnumerateArray())
                {
                    while (ex.MoveNext() && ey.MoveNext())
                        if (!Iguais(ex.Current, ey.Current)) return false;
                }
                return true;
            case JsonValueKind.Object:
                var px = x.EnumerateObject().ToDictionary(p => p.Name, p => p.Value);
                var py = y.EnumerateObject().ToDictionary(p => p.Name, p => p.Value);
                if (px.Count != py.Count) return false;
                foreach (var (k, v) in px)
                    if (!py.TryGetValue(k, out var w) || !Iguais(v, w)) return false;
                return true;
            default:
                return true; // true/false/null: mesmo ValueKind = mesmo valor
        }
    }

    private static bool Vazio(JsonElement e) => e.ValueKind switch
    {
        JsonValueKind.Null or JsonValueKind.Undefined => true,
        JsonValueKind.String => string.IsNullOrWhiteSpace(e.GetString()),
        JsonValueKind.Array => e.GetArrayLength() == 0,
        JsonValueKind.Object => e.EnumerateObject().All(p => Vazio(p.Value)),
        _ => false,
    };

    private static object? Resumo(string raw)
    {
        if (raw.Length > TamanhoMaximoDoValor) return $"(texto longo, {raw.Length} caracteres)";
        return JsonSerializer.Deserialize<JsonElement>(raw);
    }
}

/// <summary>
/// Número da proposta. Empresa com prefixo próprio (ex.: SIN) usa o contador dela
/// (SIN-0001, SIN-0002...); sem prefixo, a sequência única do sistema (PROP-0001...).
/// Os dois são atômicos no Postgres: duas propostas ao mesmo tempo nunca repetem o número.
/// </summary>
public class PropostaNumerador : IPropostaNumerador
{
    private readonly AppDbContext _db;
    public PropostaNumerador(AppDbContext db) => _db = db;

    public async Task<string> ProximoAsync(string? empresaId = null)
    {
        var empresa = string.IsNullOrEmpty(empresaId) ? null : await _db.Set<Empresa>().AsNoTracking().FirstOrDefaultAsync(e => e.Id == empresaId);
        if (empresa is { PropostaPrefixo.Length: > 0 })
        {
            // INSERT ... ON CONFLICT ... RETURNING: incrementa e devolve numa operação só.
            // ToListAsync (e não FirstAsync) para o EF não embrulhar o INSERT num SELECT.
            var n = (await _db.Database.SqlQueryRaw<long>(
                "INSERT INTO proposta_numeracao (\"EmpresaId\", \"Ultimo\") VALUES ({0}, 1) " +
                "ON CONFLICT (\"EmpresaId\") DO UPDATE SET \"Ultimo\" = proposta_numeracao.\"Ultimo\" + 1 RETURNING \"Ultimo\" AS \"Value\"",
                empresa.Id).ToListAsync()).First();
            return Formatar(empresa.PropostaPrefixo, empresa.PropostaDigitos, n);
        }
        var seq = await _db.Database.SqlQueryRaw<long>("SELECT nextval('propostas_numero_seq') AS \"Value\"").FirstAsync();
        return $"PROP-{seq:D4}";
    }

    public async Task<long> EmitidasAsync(string empresaId) =>
        (await _db.Set<NumeracaoProposta>().AsNoTracking().FirstOrDefaultAsync(n => n.EmpresaId == empresaId))?.Ultimo ?? 0;

    public static string Formatar(string prefixo, int digitos, long n) =>
        $"{prefixo}-{n.ToString("D" + Math.Clamp(digitos, 3, 8))}";
}

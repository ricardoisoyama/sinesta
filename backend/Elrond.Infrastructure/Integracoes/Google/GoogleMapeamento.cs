using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using Elrond.Domain.Entities;

namespace Elrond.Infrastructure.Integracoes.Google;

/// <summary>
/// Tradução ELROND ↔ evento do Google Agenda. Tudo no horário de Brasília: o ELROND guarda
/// "yyyy-MM-ddTHH:mm" local e o Google recebe a hora com o fuso America/Sao_Paulo.
/// Os eventos levam uma marca privada (elrond=1, origem e id) para a volta saber de quem são.
/// </summary>
public static class GoogleMapeamento
{
    public const string Fuso = "America/Sao_Paulo";
    public const string Marca = "elrond";

    private static readonly TimeZoneInfo? FusoInfo = AcharFuso();
    private static readonly string[] NomesTipo = { "reuniao:Reunião", "ligacao:Ligação", "visita:Visita", "tarefa:Tarefa", "outro:Outro" };

    private static TimeZoneInfo? AcharFuso()
    {
        foreach (var id in new[] { Fuso, "E. South America Standard Time" })
        {
            try
            {
                return TimeZoneInfo.FindSystemTimeZoneById(id);
            }
            catch (Exception)
            {
                // tenta o próximo nome (Linux usa IANA, Windows usa o nome próprio)
            }
        }
        return null;
    }

    /// <summary>Horário de Brasília "yyyy-MM-ddTHH:mm" de um instante qualquer.</summary>
    public static string ParaLocal(DateTimeOffset instante)
    {
        // Sem a base de fusos no servidor, Brasília é UTC−3 (sem horário de verão desde 2019).
        var local = FusoInfo is null ? instante.ToOffset(TimeSpan.FromHours(-3)) : TimeZoneInfo.ConvertTime(instante, FusoInfo);
        return local.ToString("yyyy-MM-dd'T'HH:mm", CultureInfo.InvariantCulture);
    }

    public static JsonObject EventoDeCompromisso(Compromisso c, string urlPublica)
    {
        var tipo = NomesTipo.Select(t => t.Split(':')).FirstOrDefault(t => t[0] == c.Tipo)?[1] ?? "Compromisso";
        var titulo = $"{(c.Concluido ? "✔ " : string.Empty)}{c.Titulo}{(c.ClienteNome.Length > 0 ? $" · {c.ClienteNome}" : string.Empty)}";
        var descricao = string.Join("\n", new[]
        {
            c.Descricao,
            string.Empty,
            $"{tipo} marcada no ELROND.",
            urlPublica.Length > 0 ? $"{urlPublica.TrimEnd('/')}/agenda" : string.Empty,
        }.Where((l, i) => i > 0 || l.Length > 0)).Trim();
        var ev = Evento(titulo, descricao, c.Local, c.Inicio, c.Fim, c.DiaInteiro, "compromisso", c.Id, urlPublica, "/agenda");
        var convidados = c.Convidados.Where(e => e.Contains('@')).Select(e => e.Trim().ToLowerInvariant()).Distinct().ToList();
        if (convidados.Count > 0)
            ev["attendees"] = new JsonArray(convidados.Select(e => (JsonNode)new JsonObject { ["email"] = e }).ToArray());
        // Meet: o Google cria a sala na agenda do responsável (o mesmo requestId não cria duas).
        if (c.ComMeet)
            ev["conferenceData"] = new JsonObject
            {
                ["createRequest"] = new JsonObject { ["requestId"] = $"elrond-{c.Id}", ["conferenceSolutionKey"] = new JsonObject { ["type"] = "hangoutsMeet" } },
            };
        return ev;
    }

    /// <summary>Próxima ação do card: 30 minutos a partir do horário, ou o dia inteiro sem hora.</summary>
    public static JsonObject EventoDeAcaoCrm(Oportunidade o, string urlPublica)
    {
        var inicio = o.ProximaAcaoEm.Length >= 16 ? o.ProximaAcaoEm[..16] : o.ProximaAcaoEm[..Math.Min(10, o.ProximaAcaoEm.Length)];
        var diaInteiro = inicio.Length == 10;
        var fim = diaInteiro ? inicio : SomarMinutos(inicio, 30);
        var titulo = $"{o.ProximaAcao}{(o.Cliente.Length > 0 ? $" · {o.Cliente}" : string.Empty)}";
        var link = urlPublica.Length > 0 ? $"{urlPublica.TrimEnd('/')}/crm?op={o.Id}" : string.Empty;
        var descricao = string.Join("\n", new[] { o.ProximaAcaoDetalhe, string.Empty, "Próxima ação de um card do CRM no ELROND.", link }
            .Where((l, i) => i > 0 || l.Length > 0)).Trim();
        return Evento(titulo, descricao, string.Empty, inicio, fim, diaInteiro, "crm", o.Id, urlPublica, $"/crm?op={o.Id}");
    }

    private static JsonObject Evento(string titulo, string descricao, string local, string inicio, string fim, bool diaInteiro,
        string origem, string id, string urlPublica, string caminho)
    {
        var ev = new JsonObject
        {
            ["summary"] = titulo,
            ["description"] = descricao,
            ["start"] = Momento(inicio, diaInteiro, false),
            ["end"] = Momento(fim.Length > 0 ? fim : inicio, diaInteiro, true),
            ["extendedProperties"] = new JsonObject
            {
                ["private"] = new JsonObject { [Marca] = "1", ["elrondOrigem"] = origem, ["elrondId"] = id },
            },
        };
        if (local.Length > 0) ev["location"] = local;
        if (urlPublica.Length > 0) ev["source"] = new JsonObject { ["title"] = "ELROND", ["url"] = $"{urlPublica.TrimEnd('/')}{caminho}" };
        return ev;
    }

    /// <summary>start/end no formato do Google para um período do ELROND.</summary>
    public static (JsonObject Inicio, JsonObject Fim) Periodo(string inicio, string fim, bool diaInteiro) =>
        (Momento(inicio, diaInteiro, false), Momento(fim.Length > 0 ? fim : inicio, diaInteiro, true));

    private static JsonObject Momento(string valor, bool diaInteiro, bool ehFim)
    {
        if (diaInteiro)
        {
            // No Google o fim do dia inteiro é exclusivo: um evento de 12/10 termina em 13/10.
            var dia = DateOnly.ParseExact(valor[..10], "yyyy-MM-dd", CultureInfo.InvariantCulture);
            return new JsonObject { ["date"] = (ehFim ? dia.AddDays(1) : dia).ToString("yyyy-MM-dd", CultureInfo.InvariantCulture) };
        }
        var hora = valor.Length >= 16 ? valor[..16] : $"{valor[..10]}T09:00";
        return new JsonObject { ["dateTime"] = $"{hora}:00", ["timeZone"] = Fuso };
    }

    /// <summary>Período de um evento do Google no formato do ELROND (null se não der para ler).</summary>
    public static (string Inicio, string Fim, bool DiaInteiro)? LerPeriodo(JsonElement evento)
    {
        if (!evento.TryGetProperty("start", out var ini) || !evento.TryGetProperty("end", out var fim)) return null;
        if (ini.TryGetProperty("date", out var dIni) && fim.TryGetProperty("date", out var dFim))
        {
            var a = DateOnly.ParseExact(dIni.GetString()!, "yyyy-MM-dd", CultureInfo.InvariantCulture);
            var b = DateOnly.ParseExact(dFim.GetString()!, "yyyy-MM-dd", CultureInfo.InvariantCulture).AddDays(-1);
            if (b < a) b = a;
            return (a.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture), b.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture), true);
        }
        if (ini.TryGetProperty("dateTime", out var tIni) && fim.TryGetProperty("dateTime", out var tFim)
            && DateTimeOffset.TryParse(tIni.GetString(), CultureInfo.InvariantCulture, DateTimeStyles.None, out var x)
            && DateTimeOffset.TryParse(tFim.GetString(), CultureInfo.InvariantCulture, DateTimeStyles.None, out var y))
        {
            var inicio = ParaLocal(x);
            var termino = ParaLocal(y);
            // Compromisso de horário fica dentro do dia (igual à tela da Agenda).
            if (termino[..10] != inicio[..10]) termino = $"{inicio[..10]}T23:59";
            return (inicio, termino, false);
        }
        return null;
    }

    /// <summary>Resumo do evento enviado: se não mudou, não chama o Google de novo.</summary>
    public static string Assinatura(JsonObject evento) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(evento.ToJsonString())))[..32];

    public static string SomarMinutos(string momento, int minutos)
    {
        var t = DateTime.ParseExact(momento[..16], "yyyy-MM-dd'T'HH:mm", CultureInfo.InvariantCulture).AddMinutes(minutos);
        var limite = DateTime.ParseExact($"{momento[..10]}T23:59", "yyyy-MM-dd'T'HH:mm", CultureInfo.InvariantCulture);
        return (t > limite ? limite : t).ToString("yyyy-MM-dd'T'HH:mm", CultureInfo.InvariantCulture);
    }
}

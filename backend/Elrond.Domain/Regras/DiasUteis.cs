namespace Elrond.Domain.Regras;

/// <summary>
/// Dia útil bancário: não é sábado, domingo, feriado nacional (fixos e os que dependem da Páscoa: Carnaval,
/// Sexta-feira Santa e Corpus Christi, dias sem expediente bancário) nem um feriado do cadastro (estadual,
/// municipal). Vencimento em dia não útil antecipa, posterga ou fica, conforme a regra.
/// </summary>
public static class DiasUteis
{
    public const string Manter = "manter";
    public const string Antecipar = "antecipar";
    public const string Postergar = "postergar";

    public static bool RegraValida(string v) => v is Manter or Antecipar or Postergar;

    private static readonly (int Mes, int Dia, string Nome)[] Fixos =
    [
        (1, 1, "Confraternização Universal"), (4, 21, "Tiradentes"), (5, 1, "Dia do Trabalho"), (9, 7, "Independência"),
        (10, 12, "Nossa Senhora Aparecida"), (11, 2, "Finados"), (11, 15, "Proclamação da República"),
        (11, 20, "Dia Nacional de Zumbi e da Consciência Negra"), (12, 25, "Natal"),
    ];

    /// <summary>Domingo de Páscoa (algoritmo de Meeus/Jones/Butcher, calendário gregoriano).</summary>
    public static DateOnly Pascoa(int ano)
    {
        int a = ano % 19, b = ano / 100, c = ano % 100, d = b / 4, e = b % 4, f = (b + 8) / 25, g = (b - f + 1) / 3;
        int h = (19 * a + b - d - g + 15) % 30, i = c / 4, k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = (a + 11 * h + 22 * l) / 451;
        var mes = (h + l - 7 * m + 114) / 31;
        var dia = (h + l - 7 * m + 114) % 31 + 1;
        return new DateOnly(ano, mes, dia);
    }

    /// <summary>Feriados nacionais e bancários do ano, com o nome.</summary>
    public static IReadOnlyList<(DateOnly Data, string Nome)> Nacionais(int ano)
    {
        var pascoa = Pascoa(ano);
        var lista = Fixos.Where(f => ano >= 2024 || f.Mes != 11 || f.Dia != 20) // Consciência Negra: nacional desde 2024
            .Select(f => (new DateOnly(ano, f.Mes, f.Dia), f.Nome)).ToList();
        lista.Add((pascoa.AddDays(-48), "Carnaval (segunda)"));
        lista.Add((pascoa.AddDays(-47), "Carnaval (terça)"));
        lista.Add((pascoa.AddDays(-2), "Sexta-feira Santa"));
        lista.Add((pascoa.AddDays(60), "Corpus Christi"));
        return lista.OrderBy(x => x.Item1).ToList();
    }

    private static readonly Dictionary<int, HashSet<DateOnly>> CacheNacionais = new();

    private static bool Nacional(DateOnly d)
    {
        HashSet<DateOnly> doAno;
        lock (CacheNacionais)
        {
            if (!CacheNacionais.TryGetValue(d.Year, out doAno!))
                CacheNacionais[d.Year] = doAno = Nacionais(d.Year).Select(x => x.Data).ToHashSet();
        }
        return doAno.Contains(d);
    }

    public static bool Util(DateOnly d, IReadOnlySet<DateOnly>? extras = null) =>
        d.DayOfWeek is not (DayOfWeek.Saturday or DayOfWeek.Sunday) && !Nacional(d) && !(extras?.Contains(d) ?? false);

    /// <summary>O próprio dia, se útil; senão o próximo dia útil.</summary>
    public static DateOnly ProximoUtil(DateOnly d, IReadOnlySet<DateOnly>? extras = null)
    {
        while (!Util(d, extras)) d = d.AddDays(1);
        return d;
    }

    /// <summary>O próprio dia, se útil; senão o dia útil anterior.</summary>
    public static DateOnly AnteriorUtil(DateOnly d, IReadOnlySet<DateOnly>? extras = null)
    {
        while (!Util(d, extras)) d = d.AddDays(-1);
        return d;
    }

    /// <summary>Vencimento em dia não útil: antecipar (dia útil anterior), postergar (próximo) ou manter.</summary>
    public static DateOnly Ajustar(DateOnly d, string regra, IReadOnlySet<DateOnly>? extras = null) => regra switch
    {
        Antecipar => AnteriorUtil(d, extras),
        Postergar => ProximoUtil(d, extras),
        _ => d,
    };

    /// <summary>
    /// Os feriados do cadastro como datas: o de "todo ano" vale em cada ano pedido (mesmo dia e mês);
    /// o outro, só na data dele. Datas inválidas ficam de fora.
    /// </summary>
    public static HashSet<DateOnly> Extras(IEnumerable<(string Data, bool TodoAno)> feriados, int anoDe, int anoAte)
    {
        var set = new HashSet<DateOnly>();
        foreach (var (data, todoAno) in feriados)
        {
            if (!DateOnly.TryParseExact(data, "yyyy-MM-dd", out var d)) continue;
            if (!todoAno) { set.Add(d); continue; }
            for (var ano = anoDe; ano <= anoAte; ano++)
                if (d.Month != 2 || d.Day != 29 || DateTime.IsLeapYear(ano)) set.Add(new DateOnly(ano, d.Month, d.Day));
        }
        return set;
    }
}

using Elrond.Domain.Common;

namespace Elrond.Domain.Entities;

/// <summary>
/// Hipótese de um cenário. Só existe no cenário: os cadastros não mudam.
/// novo-custo | reajuste-custos | variacao-meta | nova-receita | cortar-custo.
/// </summary>
public class HipoteseProjecao
{
    public string Id { get; set; } = string.Empty;
    public string Tipo { get; set; } = "novo-custo";
    public string Nome { get; set; } = string.Empty;
    /// <summary>R$/mês (novo custo, nova receita) ou fração (reajuste, variação da meta: 0,1 = 10%).</summary>
    public decimal Valor { get; set; }
    /// <summary>yyyy-MM a partir de quando vale.</summary>
    public string Inicio { get; set; } = string.Empty;
    /// <summary>yyyy-MM até quando vale (vazio = até o fim do horizonte).</summary>
    public string Fim { get; set; } = string.Empty;
    /// <summary>Cortar custo: a despesa fixa que sai.</summary>
    public string CustoId { get; set; } = string.Empty;
    public bool Ativa { get; set; } = true;
}

/// <summary>Cenário da projeção: um nome e as hipóteses sobre a base real (metas e despesas fixas).</summary>
public class CenarioProjecao : Rastreavel, IEntity, IInativavel
{
    public string Id { get; set; } = string.Empty;
    public string Nome { get; set; } = string.Empty;
    public List<HipoteseProjecao> Hipoteses { get; set; } = new();
    /// <summary>Variação do faturamento do cenário (fração, −0,3 a +0,3 na tela): fica gravada com ele.</summary>
    public decimal Sensibilidade { get; set; }
    /// <summary>Período projetado (aaaa-mm, meses fixos): é o "futuro" que o Pricing usa. Vazio = próximos 12 meses.</summary>
    public string PeriodoDe { get; set; } = string.Empty;
    public string PeriodoAte { get; set; } = string.Empty;
    public string Status { get; set; } = "ativo";

    /// <summary>Primeiro dia de cada mês do período (o gravado; sem ele, os 12 meses a partir de <paramref name="hoje"/>).</summary>
    public List<DateOnly> MesesDoPeriodo(DateOnly hoje)
    {
        static DateOnly? Mes(string chave) =>
            DateOnly.TryParseExact(chave + "-01", "yyyy-MM-dd", out var d) ? d : null;
        var de = Mes(PeriodoDe);
        var ate = Mes(PeriodoAte);
        if (de is null || ate is null || ate < de)
        {
            de = new DateOnly(hoje.Year, hoje.Month, 1);
            ate = de.Value.AddMonths(11);
        }
        var meses = new List<DateOnly>();
        for (var m = de.Value; m <= ate && meses.Count < MaxMeses; m = m.AddMonths(1)) meses.Add(m);
        return meses;
    }

    /// <summary>Período mais longo que a tela da Projeção mostra.</summary>
    public const int MaxMeses = 36;
}

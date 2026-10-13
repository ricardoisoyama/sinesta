using System.Globalization;
using Elrond.Domain.Common;

namespace Elrond.Domain.Entities;

/// <summary>
/// Meta de faturamento de uma empresa num ano, mês a mês. Além de acompanhar o realizado,
/// ela compõe o markup: o DF% é a despesa fixa mensal dividida pela base de preço da meta
/// (a média mensal do ano ou a meta do mês corrente, conforme <see cref="BasePreco"/>).
/// </summary>
public class Meta : Rastreavel, IEntity, IInativavel
{
    public const string BaseMedia = "media";
    public const string BaseMes = "mes";
    public const string AnualValor = "valor";
    public const string AnualAnoAnterior = "anoAnterior";

    public string Id { get; set; } = string.Empty;
    /// <summary>"ativo" | "inativo" (meta nunca é apagada; inativar tira da tela).</summary>
    public string Status { get; set; } = "ativo";
    public string Nome { get; set; } = string.Empty;
    /// <summary>Empresa da meta. Vazio nos cenários antigos (não entram no markup).</summary>
    public string EmpresaId { get; set; } = string.Empty;
    /// <summary>Valor anual: é o "mandante" e os 12 meses precisam somar exatamente ele.</summary>
    public decimal MetaAnual { get; set; }
    /// <summary>Meta de cada mês, janeiro a dezembro (R$). Vazio nos registros antigos.</summary>
    public List<decimal> ValoresMensais { get; set; } = new();
    /// <summary>Com mais de uma meta ativa da empresa no ano, esta é a que compõe o markup.</summary>
    public bool Principal { get; set; }
    /// <summary>Ano da meta. 0 nos registros antigos = ano corrente.</summary>
    public int Ano { get; set; }

    /// <summary>
    /// Base do DF% no preço: "media" = média mensal do ano (preço estável o ano todo);
    /// "mes" = meta do mês corrente (o preço muda a cada mês, como a planilha G58:G69).
    /// </summary>
    public string BasePreco { get; set; } = BaseMedia;
    /// <summary>Como os meses foram digitados: "valor" (R$) ou "percentual" (% do anual). Só para a tela; grava-se sempre R$.</summary>
    public string EntradaMeses { get; set; } = "valor";
    /// <summary>De onde vem o anual: "valor" (digitado) ou "anoAnterior" (meta do ano anterior + crescimento).</summary>
    public string OrigemAnual { get; set; } = AnualValor;
    /// <summary>Crescimento sobre o ano anterior (fração: 0,10 = 10%). Só com <see cref="OrigemAnual"/> = "anoAnterior".</summary>
    public decimal CrescimentoAnoAnterior { get; set; }
    /// <summary>Total da meta do ano anterior usado na conta (fotografia do momento em que salvou).</summary>
    public decimal BaseAnoAnterior { get; set; }

    /// <summary>Total que vale: a soma dos meses quando eles existem; senão o anual digitado.</summary>
    public decimal TotalDoAno => ValoresMensais is { Count: 12 } ? ValoresMensais.Sum() : MetaAnual;

    public bool UsaMedia => BasePreco == BaseMedia;

    /// <summary>Os 12 meses: os lançados ou, na meta antiga só com o anual, o ano dividido por igual.</summary>
    public List<decimal> Meses() =>
        ValoresMensais is { Count: 12 } ? ValoresMensais : Enumerable.Repeat(MetaAnual / 12m, 12).ToList();

    /// <summary>Faturamento que divide a DF no preço do mês (1–12): a média do ano ou a meta do mês.</summary>
    public decimal BaseDoMes(int mes) => UsaMedia ? TotalDoAno / 12m : Meses()[mes - 1];

    /// <summary>Anual de "X% sobre o ano anterior", arredondado em centavos.</summary>
    public static decimal AnualSobreAnterior(decimal totalAnterior, decimal crescimento) =>
        Math.Round(totalAnterior * (1m + crescimento), 2, MidpointRounding.AwayFromZero);

    private static readonly CultureInfo PtBr = CultureInfo.GetCultureInfo("pt-BR");
    private static string Brl(decimal v) => v.ToString("C", PtBr);

    /// <summary>Motivo para não salvar (valor anual e meses), ou null quando está tudo certo.</summary>
    public string? ConferirValores()
    {
        if (MetaAnual <= 0) return "Informe o valor anual da meta.";
        if (ValoresMensais is not { Count: 12 }) return null; // registro antigo, só com o anual
        var soma = ValoresMensais.Sum();
        var diferenca = Math.Round(MetaAnual - soma, 2);
        if (diferenca > 0) return $"Os meses somam {Brl(soma)}: faltam {Brl(diferenca)} para chegar ao valor anual de {Brl(MetaAnual)}.";
        if (diferenca < 0) return $"Os meses somam {Brl(soma)}: passaram {Brl(-diferenca)} do valor anual de {Brl(MetaAnual)}.";
        return null;
    }
}

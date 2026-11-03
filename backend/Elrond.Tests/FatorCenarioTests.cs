using Elrond.Application.Services;
using Elrond.Domain.Entities;

namespace Elrond.Tests;

/// <summary>Pricing por cenário da Projeção: DF e receita do mês com as hipóteses, na ordem da Projeção.</summary>
public class FatorCenarioTests
{
    private static HipoteseProjecao H(string tipo, decimal valor, string inicio = "2026-01", string fim = "", string custoId = "", bool ativa = true) =>
        new() { Id = Guid.NewGuid().ToString(), Tipo = tipo, Valor = valor, Inicio = inicio, Fim = fim, CustoId = custoId, Ativa = ativa };

    [Fact]
    public void Hipoteses_do_mes_mudam_df_e_receita_como_na_projecao()
    {
        var c = new CenarioProjecao
        {
            Nome = "Contratar supervisor",
            Sensibilidade = -0.10m,
            Hipoteses =
            [
                H("variacao-meta", 0.20m),           // receita 100 mil × 1,2 = 120 mil
                H("nova-receita", 10000m),          // + 10 mil = 130 mil; × 0,9 = 117 mil
                H("cortar-custo", 0, custoId: "aluguel"), // DF 20 mil − 5 mil = 15 mil
                H("reajuste-custos", 0.10m),        // × 1,1 = 16,5 mil
                H("novo-custo", 7800m),             // + 7,8 mil = 24,3 mil
                H("novo-custo", 9999m, inicio: "2027-01"), // ainda não começou
                H("novo-custo", 5000m, ativa: false),      // desligada
                H("custo-variavel", 3000m),         // só demonstrativo
            ],
        };
        var (df, receita, nota) = FatorService.AplicarCenario(c, 20000m, 100000m, new DateOnly(2026, 11, 3), id => id == "aluguel" ? 5000m : 0m);
        Assert.Equal(24300m, df);
        Assert.Equal(117000m, receita);
        Assert.Contains("5 hipótese(s)", nota);
    }
}

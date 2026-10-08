using Elrond.Domain.Pricing;

namespace Elrond.Tests;

/// <summary>
/// Porta os testes do `engine.test.ts` — trava os números REAIS da planilha "Matriz de Preço".
/// Prova que o motor .NET (fonte da verdade) bate com a planilha e com o front.
/// </summary>
public class PricingEngineTests
{
    // Tolerância no estilo do vitest toBeCloseTo(expected, digits): |a-e| < 0.5·10^-digits.
    private static void Close(decimal expected, decimal actual, int digits)
    {
        var tol = 0.5m / (decimal)Math.Pow(10, digits);
        Assert.True(Math.Abs(actual - expected) < tol,
            $"esperado {expected} ~ obtido {actual} (tol {tol})");
    }

    private static readonly DvParams Matriz = new(0.11m, 0m, 0m, 0.07m, 0.023m);
    private static readonly DvParams Filial = new(0.11m, 0m, 0.015m, 0.10m, 0.023m);

    [Fact]
    public void Dv_da_Matriz_203_com_ML_e_133_sem_ML()
    {
        Close(0.203m, PricingEngine.DvComML(Matriz), 6);
        Close(0.133m, PricingEngine.DvSemML(Matriz), 6);
    }

    [Fact]
    public void Fator_da_Matriz_aprox_1_3848()
    {
        var dfPct = PricingEngine.DfPercent(16845.795m, 225000m);
        Close(0.0748702m, dfPct, 6);
        var m = PricingEngine.Markup(dfPct, PricingEngine.DvComML(Matriz));
        Close(0.2778702m, m, 6);
        Close(1.3847926m, PricingEngine.Fator(m), 5);
    }

    [Fact]
    public void Fator_da_Filial_aprox_1_4831()
    {
        var dfPct = PricingEngine.DfPercent(17493.29m, 225000m);
        var m = PricingEngine.Markup(dfPct, PricingEngine.DvComML(Filial));
        Close(1.4831249m, PricingEngine.Fator(m), 5);
    }

    [Fact]
    public void PV_do_exemplo_da_planilha_aprox_295_06()
    {
        Close(295.0578m, PricingEngine.PrecoVenda(120m, 93.07m, 1.3847925954586005m), 3);
    }

    [Fact]
    public void Margem_do_exemplo_MCU_20_65_e_ML_7()
    {
        var pv = PricingEngine.PrecoVenda(120m, 93.07m, 1.3847925954586005m);
        var m = PricingEngine.Margem(pv, 120m + 93.07m, PricingEngine.DfPercent(16845.795m, 225000m), PricingEngine.DvSemML(Matriz));
        Close(20.65m, m.Mcu, 1);
        Close(0.07m, m.Ml, 3);
    }

    [Fact]
    public void Seguro_ad_valorem_300k_x_03pct_900()
    {
        Close(900m, PricingEngine.SeguroAdValorem(300000m, 0.003m), 6);
    }

    [Fact]
    public void GrossUp_ICMS_bate_com_a_planilha()
    {
        Close(2862.6364m, PricingEngine.GrossUp(2519.12m, 0.12m), 3); // ÷0,88
        Close(2708.7312m, PricingEngine.GrossUp(2519.12m, 0.07m), 3); // ÷0,93
    }

    [Fact]
    public void Cotacao_fiscal_CTe_preco_final_grossed_up()
    {
        Close(2862.6364m, PricingEngine.CotacaoFiscal(1619.12m, 900m, 0.12m, true).PrecoFinal, 3);
        Close(2708.7312m, PricingEngine.CotacaoFiscal(1619.12m, 900m, 0.07m, true).PrecoFinal, 3);
    }

    [Fact]
    public void BreakEven_Matriz_equilibrio_19430_e_alvo_21136()
    {
        Close(19430m, PricingEngine.ReceitaEquilibrio(16845.795m, 0.133m), 0);
        Close(21136.5m, PricingEngine.ReceitaAlvo(16845.795m, 0.203m), 0);
    }

    [Fact]
    public void Preco_reverso_volta_ao_mesmo_pv_que_gerou_o_preco_final()
    {
        var ida = PricingEngine.CotacaoFiscal(1000m, 50m, 0.12m, true);
        var volta = PricingEngine.PrecoParaMargem(ida.PrecoFinal, 50m, 0.12m, true, 1000m, 600m, 0.0748702m, 0.133m);

        Close(1000m, volta.PvPraticado, 6);
        Close(0m, volta.DescontoEfetivo, 6);
    }

    [Fact]
    public void Preco_reverso_sem_icms_tira_so_o_seguro()
    {
        var r = PricingEngine.PrecoParaMargem(1000m, 100m, 0m, false, 1200m, 600m, 0.0748702m, 0.133m);

        Close(900m, r.PvPraticado, 6);
        Close(0.25m, r.DescontoEfetivo, 6);
    }

    [Fact]
    public void Preco_reverso_recalcula_a_margem_sem_mexer_no_custo()
    {
        var r = PricingEngine.PrecoParaMargem(1000m, 0m, 0m, false, 1200m, 600m, 0.0748702m, 0.133m);

        // MCU = 1000 − 600 − (1000 × 7,487%) − (1000 × 13,3%)
        Close(192.13m, r.Margem.Mcu, 2);
        Close(0.19213m, r.Margem.Ml, 4);
    }

    [Fact]
    public void Preco_abaixo_do_custo_derruba_a_margem()
    {
        var r = PricingEngine.PrecoParaMargem(500m, 0m, 0m, false, 1200m, 600m, 0.0748702m, 0.133m);

        Assert.True(r.Margem.Ml < 0);
    }
    [Fact]
    public void Custo_em_percentual_do_preco_fecha_a_conta_algebrica()
    {
        // PV = (C + p·PV)·F: o percentual aplicado no PV tem que devolver o mesmo PV.
        var pv = PricingEngine.PrecoVendaComCustoPercentual(1000m, 0.02m, 1.25m);
        Close(pv, (1000m + 0.02m * pv) * 1.25m, 6);
        Assert.True(pv > 1000m * 1.25m);
        Close(1250m, PricingEngine.PrecoVendaComCustoPercentual(1000m, 0m, 1.25m), 6);
        Assert.Equal(0m, PricingEngine.PrecoVendaComCustoPercentual(1000m, 0.9m, 1.25m));
    }
}

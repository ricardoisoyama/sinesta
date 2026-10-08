namespace Elrond.Domain.Pricing;

/// <summary>Parâmetros de Despesa Variável (frações; 0,11 = 11%).</summary>
public readonly record struct DvParams(
    decimal Impostos,
    decimal Custos,
    decimal Comissoes,
    decimal Lucro,
    decimal DespFinanceira,
    /// <summary>Soma das "outras despesas" livres da empresa (fração).</summary>
    decimal Outras = 0m);

public readonly record struct MargemResult(
    decimal CustoTotal,
    decimal DfReais,
    decimal DvReais,
    decimal Mcu,
    decimal Ml);

public readonly record struct CotacaoFiscalResult(
    decimal BaseIcms,
    decimal FreteComIcms,
    decimal IcmsValor,
    decimal PrecoFinal);

/// <summary>Resultado do caminho inverso: do preço final de volta para a margem.</summary>
public readonly record struct PrecoReversoResult(
    decimal PvPraticado,
    decimal DescontoEfetivo,
    MargemResult Margem);

/// <summary>
/// Motor de precificação (portado de `frontend/src/features/pricing/engine.ts`).
/// Funções PURAS. Cadeia: DF% + DV → markup → fator → PV → margem. É a FONTE DA VERDADE do preço.
/// </summary>
public static class PricingEngine
{
    /// <summary>DV total (com ML/lucro).</summary>
    public static decimal DvComML(DvParams p) =>
        p.Impostos + p.Custos + p.Comissoes + p.Lucro + p.DespFinanceira + p.Outras;

    /// <summary>DV sem o lucro (ML).</summary>
    public static decimal DvSemML(DvParams p) => DvComML(p) - p.Lucro;

    /// <summary>Representatividade da DF sobre a receita estimada (DF ÷ receita).</summary>
    public static decimal DfPercent(decimal totalDf, decimal receitaEstimada) =>
        receitaEstimada > 0 ? totalDf / receitaEstimada : 0m;

    /// <summary>Markup% = DF% + DV.</summary>
    public static decimal Markup(decimal dfPct, decimal dvPct) => dfPct + dvPct;

    /// <summary>Fator = 1 / (1 − markup). Retorna 0 se markup ≥ 1 (inviável).</summary>
    public static decimal Fator(decimal markupPct) => markupPct < 1 ? 1m / (1m - markupPct) : 0m;

    /// <summary>PV = (custo logístico + outros custos) × fator.</summary>
    public static decimal PrecoVenda(decimal custoLogistico, decimal outrosCustos, decimal fator) =>
        (custoLogistico + outrosCustos) * fator;

    /// <summary>
    /// PV quando parte do custo é um percentual do próprio preço (ex.: seguro cobrado em % da
    /// NF do serviço). É circular, mas fecha em conta: PV = (C + p·PV)·F ⇒ PV = C·F ÷ (1 − p·F).
    /// Devolve 0 quando p·F ≥ 1 (inviável).
    /// </summary>
    public static decimal PrecoVendaComCustoPercentual(decimal custoFixoReais, decimal percentualDoPreco, decimal fator)
    {
        var divisor = 1m - percentualDoPreco * fator;
        return divisor > 0 ? custoFixoReais * fator / divisor : 0m;
    }

    /// <summary>Decompõe o PV em custo, DF, DV e margem. MCU = PV − custo − PV·DF% − PV·DVsemML; ML = MCU/PV.</summary>
    public static MargemResult Margem(decimal pv, decimal custoTotal, decimal dfPct, decimal dvSemMLPct)
    {
        var dfReais = pv * dfPct;
        var dvReais = pv * dvSemMLPct;
        var mcu = pv - custoTotal - dfReais - dvReais;
        var ml = pv > 0 ? mcu / pv : 0m;
        return new MargemResult(custoTotal, dfReais, dvReais, mcu, ml);
    }

    /// <summary>Seguro ad valorem = NF × alíquota.</summary>
    public static decimal SeguroAdValorem(decimal nf, decimal aliquota) => nf * aliquota;

    /// <summary>Gross-up de ICMS: valor ÷ (1 − alíquota) ("imposto por dentro").</summary>
    public static decimal GrossUp(decimal valor, decimal aliquotaIcms) =>
        aliquotaIcms > 0 && aliquotaIcms < 1 ? valor / (1m - aliquotaIcms) : valor;

    /// <summary>Receita de equilíbrio (resultado = 0): DF ÷ (1 − DV sem ML).</summary>
    public static decimal ReceitaEquilibrio(decimal df, decimal dvSemMLPct) =>
        dvSemMLPct < 1 ? df / (1m - dvSemMLPct) : 0m;

    /// <summary>Receita para atingir a margem de lucro alvo: DF ÷ (1 − DV com ML).</summary>
    public static decimal ReceitaAlvo(decimal df, decimal dvComMLPct) =>
        dvComMLPct < 1 ? df / (1m - dvComMLPct) : 0m;

    /// <summary>
    /// Compõe o preço final com impostos. Com ICMS: gross-up sobre (frete + seguro). Sem: frete + seguro.
    /// </summary>
    public static CotacaoFiscalResult CotacaoFiscal(decimal pv, decimal seguro, decimal aliquotaIcms, bool aplicaIcms)
    {
        if (aplicaIcms)
        {
            var baseIcms = pv + seguro;
            var freteComIcms = GrossUp(baseIcms, aliquotaIcms);
            return new CotacaoFiscalResult(baseIcms, freteComIcms, freteComIcms - baseIcms, freteComIcms);
        }

        return new CotacaoFiscalResult(pv, pv, 0m, pv + seguro);
    }

    /// <summary>
    /// Caminho inverso: parte do preço final aceito pelo cliente e volta até a margem,
    /// sem alterar custo, lucro e desconto informados.
    ///   com ICMS: PV = precoFinal × (1 − alíquota) − seguro
    ///   sem ICMS: PV = precoFinal − seguro
    /// </summary>
    public static PrecoReversoResult PrecoParaMargem(
        decimal precoFinal,
        decimal seguro,
        decimal aliquotaIcms,
        bool aplicaIcms,
        decimal pvCalculado,
        decimal custoTotal,
        decimal dfPct,
        decimal dvSemMLPct)
    {
        var baseSemImposto = aplicaIcms ? precoFinal * (1m - aliquotaIcms) : precoFinal;
        var pvPraticado = Math.Max(0m, baseSemImposto - seguro);
        var descontoEfetivo = pvCalculado > 0 ? 1m - pvPraticado / pvCalculado : 0m;
        return new PrecoReversoResult(
            pvPraticado,
            descontoEfetivo,
            Margem(pvPraticado, custoTotal, dfPct, dvSemMLPct));
    }
}

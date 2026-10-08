using Elrond.Application.Services;
using Elrond.Domain.Entities;

namespace Elrond.Tests;

/// <summary>Motor do fator: mesma conta da planilha "Matriz de Preço - BM" (aba PV_Matriz, linha 5).</summary>
public class FatorTests
{
    private static readonly DateOnly Hoje = new(2026, 10, 1);

    private static Empresa Empresa() => new()
    {
        Id = "bm",
        Nome = "BM",
        Regime = "Lucro Presumido",
        // Sem cadastro tributário: vale o percentual da DV (10,5% na linha 5 da planilha).
        Dv = new DvEmpresa { Impostos = 0.105m, Comissoes = 0.005m, Lucro = 0.05m, DespFinanceira = 0.023m },
    };

    private static Meta MetaMensal(decimal valor, string empresa = "bm", int ano = 2026) => new()
    {
        Id = $"meta-{empresa}-{ano}-{valor}",
        Nome = "Meta",
        EmpresaId = empresa,
        Ano = ano,
        ValoresMensais = Enumerable.Repeat(valor, 12).ToList(),
    };

    private static CustoFixo Fixo(decimal valor, string inicio = "", string fim = "") => new()
    {
        Id = Guid.NewGuid().ToString(),
        UnidadeId = "bm",
        Descricao = "Fixos",
        ValorMensal = valor,
        Tipo = "recorrente",
        Status = "ativo",
        DataInicio = inicio,
        DataFim = fim,
    };

    private static void Perto(decimal esperado, decimal real, decimal tol = 0.0001m) =>
        Assert.True(Math.Abs(esperado - real) <= tol, $"esperado {esperado}, veio {real}");

    [Fact]
    public void Reproduz_a_linha_5_da_planilha()
    {
        var r = FatorService.Calcular(Empresa(), "bm", new[] { Fixo(73319.526m) }, new[] { MetaMensal(565000m) }, Hoje, 0.005m);

        Assert.True(r.Pronto);
        Perto(0.129769m, r.DfPct, 0.000001m);   // 73.319,53 ÷ 565.000
        Perto(0.133m, r.DvSemLucro, 0.000001m);  // 10,5% + 0,5% + 2,3%
        Perto(0.312769m, r.Markup, 0.000001m);   // DF + DV + lucro
        Perto(1.4551m, r.Fator);                 // C5 da planilha
    }

    [Fact]
    public void Custo_que_ainda_nao_comecou_entra_e_o_que_terminou_sai()
    {
        var custos = new[] { Fixo(1000m), Fixo(500m, inicio: "2027-03-01"), Fixo(800m, fim: "2026-08-31") };
        var r = FatorService.Calcular(Empresa(), "bm", custos, new[] { MetaMensal(10000m) }, Hoje, 0.005m);
        Assert.Equal(1500m, r.TotalDf);
        Assert.Equal(2, r.CustosNaDf);
    }

    private static Meta MetaDaPlanilha()
    {
        // Metas mensais da planilha (E58:E69).
        var meta = MetaMensal(0m);
        meta.ValoresMensais = new List<decimal> { 499636.62m, 537853.22m, 537853.22m, 537853.22m, 565000, 565000, 565000, 565000, 565000, 565000, 565000, 565000 };
        return meta;
    }

    [Fact]
    public void Df_e_o_do_mes_corrente_igual_a_linha_do_mes_na_planilha()
    {
        var fixos = new[] { Fixo(73319.526m) };
        // Outubro: 73.319,53 ÷ 565.000 (G67, igual a G64 de julho, que a PV_Matriz usa).
        var out_ = FatorService.Calcular(Empresa(), "bm", fixos, new[] { MetaDaPlanilha() }, Hoje, 0.005m);
        Perto(0.12976907m, out_.DfPct, 0.0000001m);
        Assert.Equal(10, out_.Mes);
        Assert.Equal(565000m, out_.FaturamentoMensal);
        // Janeiro: 73.319,53 ÷ 499.636,62 (G58).
        var jan = FatorService.Calcular(Empresa(), "bm", fixos, new[] { MetaDaPlanilha() }, new DateOnly(2026, 1, 15), 0.005m);
        Perto(0.14674570m, jan.DfPct, 0.0000001m);
        Assert.True(jan.Fator > out_.Fator);
    }

    [Fact]
    public void Mes_corrente_sem_meta_bloqueia_e_explica()
    {
        var meta = MetaMensal(0m);
        meta.ValoresMensais = new List<decimal> { 10000, 10000, 10000, 10000, 10000, 10000, 10000, 10000, 10000, 0, 10000, 10000 };
        var r = FatorService.Calcular(Empresa(), "bm", new[] { Fixo(1000m) }, new[] { meta }, Hoje, 0.005m);
        Assert.False(r.Pronto);
        Assert.Contains("outubro", r.Aviso!);
    }

    [Fact]
    public void Lucro_da_linha_muda_o_fator_e_o_da_empresa_fica_como_piso()
    {
        var fixos = new[] { Fixo(73319.526m) };
        var metas = new[] { MetaMensal(565000m) };
        // Linha 11 da PV_Matriz (BM): impostos 16,5%, comissão 1%, lucro 10%, desp. fin. 2,3% → fator 1,7475.
        var e = Empresa();
        e.Dv.Impostos = 0.165m;
        e.Dv.Lucro = 0.07m;
        var r = FatorService.Calcular(e, "bm", fixos, metas, Hoje, 0m, comissoes: 0.01m, lucro: 0.10m);
        Perto(0.10m, r.Lucro, 0m);
        Perto(0.07m, r.LucroPadrao, 0m);
        Perto(1.74754623m, r.Fator, 0.0000001m);
        Perto(7189.82m, Math.Round(4114.24m * r.Fator, 2), 0m);
        // Sem lucro informado vale o da empresa.
        var padrao = FatorService.Calcular(e, "bm", fixos, metas, Hoje, 0m);
        Assert.Equal(0.07m, padrao.Lucro);
    }

    [Fact]
    public void Sem_meta_nao_ha_fator_e_explica_o_motivo()
    {
        var r = FatorService.Calcular(Empresa(), "bm", new[] { Fixo(1000m) }, Array.Empty<Meta>(), Hoje, 0.005m);
        Assert.False(r.Pronto);
        Assert.Equal(0m, r.Fator);
        Assert.Contains("meta", r.Aviso!, StringComparison.OrdinalIgnoreCase);

        // Meta de outra empresa ou de outro ano não serve.
        var r2 = FatorService.Calcular(Empresa(), "bm", new[] { Fixo(1000m) }, new[] { MetaMensal(9000m, "outra"), MetaMensal(9000m, ano: 2025) }, Hoje, 0.005m);
        Assert.False(r2.Pronto);
    }

    [Fact]
    public void Duas_metas_no_ano_usam_a_principal_ou_pedem_para_marcar()
    {
        var a = MetaMensal(10000m);
        var b = MetaMensal(20000m);
        var r = FatorService.Calcular(Empresa(), "bm", new[] { Fixo(1000m) }, new[] { a, b }, Hoje, 0.005m);
        Assert.False(r.Pronto);
        Assert.Contains("marque", r.Aviso!);

        b.Principal = true;
        r = FatorService.Calcular(Empresa(), "bm", new[] { Fixo(1000m) }, new[] { a, b }, Hoje, 0.005m);
        Assert.True(r.Pronto);
        Assert.Equal(b.Id, r.MetaId);
    }

    [Fact]
    public void Comissao_da_operacao_muda_o_fator_sem_mexer_no_lucro()
    {
        var padrao = FatorService.Calcular(Empresa(), "bm", new[] { Fixo(73319.526m) }, new[] { MetaMensal(565000m) }, Hoje, 0.005m);
        var semComissao = FatorService.Calcular(Empresa(), "bm", new[] { Fixo(73319.526m) }, new[] { MetaMensal(565000m) }, Hoje, 0.005m, comissoes: 0m);
        Assert.Equal(padrao.Lucro, semComissao.Lucro);
        Assert.Equal(0.005m, semComissao.ComissoesPadrao);
        Assert.Equal(0m, semComissao.Comissoes);
        Assert.True(semComissao.Fator < padrao.Fator);
    }

    [Fact]
    public void Soma_acima_de_100_por_cento_e_inviavel()
    {
        var e = Empresa();
        e.Dv.Lucro = 0.9m;
        var r = FatorService.Calcular(e, "bm", new[] { Fixo(73319.526m) }, new[] { MetaMensal(565000m) }, Hoje, 0.005m);
        Assert.False(r.Pronto);
        Assert.Contains("100%", r.Aviso!);
    }
}

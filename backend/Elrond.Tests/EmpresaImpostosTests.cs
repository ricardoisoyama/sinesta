using Elrond.Domain.Entities;

namespace Elrond.Tests;

/// <summary>
/// Os impostos da DV saem do cadastro tributário da empresa. Espelha
/// `impostosSobreReceita` do front (features/unidades/impostos.ts).
/// </summary>
public class EmpresaImpostosTests
{
    [Fact]
    public void Simples_usa_a_aliquota_do_das()
    {
        var e = new Empresa { Regime = "Simples Nacional", Das = 0.06m };
        e.Pis.Aliquota = 0.0065m; // ignorado no Simples

        Assert.Equal(0.06m, e.ImpostosSobreReceita());
    }

    [Fact]
    public void Lucro_presumido_soma_federais_iss_e_reforma()
    {
        var e = new Empresa { Regime = "Lucro Presumido" };
        e.Pis.Aliquota = 0.0065m;
        e.Cofins.Aliquota = 0.03m;
        e.Iss.Aliquota = 0.05m;

        Assert.Equal(0.0865m, e.ImpostosSobreReceita());
    }

    [Fact]
    public void Reducao_de_base_diminui_a_aliquota_efetiva()
    {
        var e = new Empresa { Regime = "Lucro Presumido" };
        e.Inss.Aliquota = 0.11m;
        e.Inss.Retido = true;
        e.Inss.ReducaoBase = 0.5m;

        // 11% sobre metade da base = 5,5%
        Assert.Equal(0.055m, e.ImpostosSobreReceita());
    }

    [Fact]
    public void Sem_cadastro_tributario_vale_o_percentual_manual_da_dv()
    {
        var e = new Empresa { Regime = "Lucro Presumido" };
        e.Dv.Impostos = 0.11m;

        Assert.Equal(0m, e.ImpostosSobreReceita());
        Assert.Equal(0.11m, e.ImpostosDaDv());
    }

    [Fact]
    public void Com_cadastro_tributario_o_cadastro_manda()
    {
        var e = new Empresa { Regime = "Lucro Presumido" };
        e.Dv.Impostos = 0.11m;
        e.Iss.Aliquota = 0.05m;

        Assert.Equal(0.05m, e.ImpostosDaDv());
    }
}

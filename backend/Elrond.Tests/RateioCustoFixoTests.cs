using Elrond.Application.Services;
using Elrond.Application.Validators;
using Elrond.Domain.Entities;

namespace Elrond.Tests;

/// <summary>Rateio de despesa fixa entre empresas: a parte de cada uma vai para a DF (e o markup) dela.</summary>
public class RateioCustoFixoTests
{
    private static readonly DateOnly Hoje = new(2026, 10, 13);

    private static CustoFixo Despesa(string pagadora, decimal valor, params (string Empresa, decimal Pct)[] rateio) => new()
    {
        Id = Guid.NewGuid().ToString(),
        UnidadeId = pagadora,
        Descricao = "Salário",
        ValorMensal = valor,
        Tipo = "recorrente",
        Status = "ativo",
        Rateio = rateio.Select(r => new RateioCustoFixo { EmpresaId = r.Empresa, Percentual = r.Pct }).ToList(),
    };

    private static Empresa Empresa(string id) => new()
    {
        Id = id,
        Nome = id,
        Regime = "Lucro Presumido",
        Dv = new DvEmpresa { Impostos = 0.17m, Lucro = 0.10m, DespFinanceira = 0.03m },
    };

    private static Meta Meta(string empresa, decimal mensal) => new()
    {
        Id = $"meta-{empresa}",
        Nome = "Meta",
        EmpresaId = empresa,
        Ano = 2026,
        ValoresMensais = Enumerable.Repeat(mensal, 12).ToList(),
    };

    [Fact]
    public void SemRateioADespesaEhTodaDeQuemPaga()
    {
        var d = Despesa("matriz", 5000m);
        Assert.Equal(5000m, d.ValorPara("matriz"));
        Assert.Equal(0m, d.ValorPara("filial"));
        Assert.Null(d.ConferirRateio());
    }

    [Fact]
    public void ComRateioCadaEmpresaLevaASuaParte()
    {
        var d = Despesa("matriz", 5000m, ("matriz", 0.6m), ("filial", 0.4m));
        Assert.Equal(3000m, d.ValorPara("matriz"));
        Assert.Equal(2000m, d.ValorPara("filial"));
        Assert.Equal(0m, d.ValorPara("outra"));
        Assert.Null(d.ConferirRateio());
    }

    [Theory]
    [InlineData(0.5, 0.4, "fechar 100%")]
    [InlineData(0.5, 0.6, "fechar 100%")]
    [InlineData(1.0, 0.0, "maior que zero")]
    public void RateioQueNaoFechaEhRecusado(double matriz, double filial, string motivo)
    {
        var d = Despesa("matriz", 5000m, ("matriz", (decimal)matriz), ("filial", (decimal)filial));
        Assert.Contains(motivo, d.ConferirRateio());
        Assert.False(new CustoFixoValidator().Validate(d).IsValid);
    }

    [Fact]
    public void QuemPagaPrecisaEstarNoRateio()
    {
        var d = Despesa("matriz", 5000m, ("filial", 1m));
        Assert.Contains("empresa que paga", d.ConferirRateio());
    }

    [Fact]
    public void RateioLigadoComUmaEmpresaSoEhRecusado()
    {
        var d = Despesa("matriz", 5000m, ("matriz", 1m));
        Assert.Contains("mais uma empresa", d.ConferirRateio());
    }

    [Fact]
    public void FatorDeCadaEmpresaSomaSoASuaParte()
    {
        // O salário do Ricardo (pago pela Matriz) e o do André (pago pela Filial), rateados 50/50.
        var custos = new[]
        {
            Despesa("matriz", 5000m, ("matriz", 0.5m), ("filial", 0.5m)),
            Despesa("filial", 5000m, ("filial", 0.5m), ("matriz", 0.5m)),
            Despesa("matriz", 4000m),
            Despesa("filial", 2000m),
        };
        var matriz = FatorService.Calcular(Empresa("matriz"), "matriz", custos, new[] { Meta("matriz", 60000m) }, Hoje, 0m);
        var filial = FatorService.Calcular(Empresa("filial"), "filial", custos, new[] { Meta("filial", 40000m) }, Hoje, 0m);

        Assert.Equal(9000m, matriz.TotalDf);   // 4.000 próprias + 2.500 + 2.500 rateadas
        Assert.Equal(7000m, filial.TotalDf);   // 2.000 próprias + 2.500 + 2.500 rateadas
        Assert.Equal(3, matriz.CustosNaDf);
        Assert.Equal(3, filial.CustosNaDf);
    }
}

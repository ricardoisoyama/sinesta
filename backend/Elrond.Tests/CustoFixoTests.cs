using Elrond.Domain.Entities;

namespace Elrond.Tests;

/// <summary>
/// Regra da DF: só custos ativos, recorrentes e vigentes entram no markup.
/// Espelha `entraNaDf` do front (regras.ts).
/// </summary>
public class CustoFixoTests
{
    private static readonly DateOnly Hoje = new(2026, 9, 4);

    private static CustoFixo Novo() => new()
    {
        Id = "cf-1",
        UnidadeId = "matriz",
        Descricao = "Sistema",
        CategoriaId = "cat-ti",
        ValorMensal = 100m,
        Tipo = "recorrente",
        Status = "ativo",
    };

    [Fact]
    public void Recorrente_ativo_sem_datas_entra_na_df()
    {
        Assert.True(Novo().EntraNaDf(Hoje));
    }

    [Fact]
    public void Spot_fica_fora_da_df()
    {
        var c = Novo();
        c.Tipo = "spot";
        Assert.False(c.EntraNaDf(Hoje));
    }

    [Fact]
    public void Inativo_fica_fora_da_df()
    {
        var c = Novo();
        c.Status = "inativo";
        Assert.False(c.EntraNaDf(Hoje));
    }

    [Theory]
    [InlineData("2026-10-01", "", true)] // ainda não começou: entra (o preço de hoje já conta com ele)
    [InlineData("", "2026-08-31", false)] // já terminou
    [InlineData("2026-01-01", "2026-12-31", true)] // vigente
    public void Respeita_a_vigencia(string inicio, string fim, bool esperado)
    {
        var c = Novo();
        c.DataInicio = inicio;
        c.DataFim = fim;
        Assert.Equal(esperado, c.EntraNaDf(Hoje));
    }
}

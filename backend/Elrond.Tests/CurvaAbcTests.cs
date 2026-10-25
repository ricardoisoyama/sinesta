using Elrond.Application.Services;

namespace Elrond.Tests;

/// <summary>Curva ABC: agrupa, ordena e classifica pelo acumulado.</summary>
public class CurvaAbcTests
{
    [Fact]
    public void Classifica_pelo_acumulado_com_o_item_que_cruza_o_corte_na_classe_de_cima()
    {
        var linhas = new (string, string, decimal, decimal?)[]
        {
            ("ifc", "I.F.C.", 30, null), ("ifc", "I.F.C.", 20, null), // agrupa: 50
            ("beta", "Beta", 30, null), ("gama", "Gama", 10, null), ("delta", "Delta", 5, null),
            ("eps", "Épsilon", 3, null), ("zeta", "Zeta", 2, null), ("zero", "Zerado", 0, null),
        };
        var c = CurvaAbcService.Classificar("clientes", "receita", "lancado", linhas, 0.8m, 0.95m);
        Assert.Equal(100m, c.Total);
        Assert.Equal(["I.F.C.", "Beta", "Gama", "Delta", "Épsilon", "Zeta"], c.Lista.Select(i => i.Nome));
        Assert.Equal(["A", "A", "B", "B", "C", "C"], c.Lista.Select(i => i.Classe));
        Assert.Equal((2, 80m), (c.Classes[0].Itens, c.Classes[0].Valor));
        Assert.Equal(2, c.Lista[0].Quantidade);
        Assert.Equal(1m, c.Lista[^1].Acumulado);
    }

    [Fact]
    public void Margem_dos_servicos_e_a_media_ponderada_pelo_valor()
    {
        var linhas = new (string, string, decimal, decimal?)[] { ("arm", "Armazenagem", 1000, 0.10m), ("arm", "Armazenagem", 3000, 0.20m) };
        var c = CurvaAbcService.Classificar("servicos", "receita", "propostas", linhas, 0.8m, 0.95m);
        Assert.Equal(0.175m, c.Lista[0].Margem);
    }
}

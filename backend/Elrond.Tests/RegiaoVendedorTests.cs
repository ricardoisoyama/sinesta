using Elrond.Domain.Entities;
using Elrond.Domain.Regras;

namespace Elrond.Tests;

public class RegiaoVendedorTests
{
    private static RegiaoBloqueada R(string tipo, string valor) => new() { Tipo = tipo, Valor = valor };

    [Fact]
    public void Estado_bloqueado_barra_qualquer_cidade_daquele_estado()
    {
        var regioes = new[] { R("estado", "SP") };
        Assert.True(RegiaoVendedor.Bloqueia(regioes, "Campinas - SP"));
        Assert.True(RegiaoVendedor.Bloqueia(regioes, "São Paulo - sp"));
        Assert.False(RegiaoVendedor.Bloqueia(regioes, "Curitiba - PR"));
    }

    [Fact]
    public void Cidade_bloqueada_e_so_aquela_cidade_sem_acento_e_sem_maiuscula()
    {
        var regioes = new[] { R("cidade", "Sao Paulo - SP") };
        Assert.True(RegiaoVendedor.Bloqueia(regioes, "São Paulo - SP"));
        Assert.False(RegiaoVendedor.Bloqueia(regioes, "Campinas - SP"));
    }

    [Fact]
    public void Pais_Brasil_bloqueia_qualquer_cidade_com_UF()
    {
        var regioes = new[] { R("pais", "Brasil") };
        Assert.True(RegiaoVendedor.Bloqueia(regioes, "Manaus - AM"));
        Assert.False(RegiaoVendedor.Bloqueia(regioes, ""));
    }

    [Fact]
    public void Cidade_no_formato_UF_Cidade_tambem_vale()
    {
        Assert.True(RegiaoVendedor.Bloqueia(new[] { R("estado", "SP") }, "SP - Campinas"));
        Assert.True(RegiaoVendedor.Bloqueia(new[] { R("cidade", "Campinas - SP") }, "SP - Campinas"));
        Assert.Equal("RO", RegiaoVendedor.UfDe("Ji-Paraná - RO"));
        Assert.Equal("RO", RegiaoVendedor.UfDe("RO - Ji-Paraná"));
        Assert.Equal(string.Empty, RegiaoVendedor.UfDe("Ji-Paraná")); // "Paraná" não é UF
    }

    [Theory]
    [InlineData("Campinas - SP", "Campinas", "SP")]
    [InlineData("SP - Campinas", "Campinas", "SP")]
    [InlineData("Ji-Paraná - RO", "Ji-Paraná", "RO")]
    [InlineData("Embu-Guaçu", "Embu-Guaçu", "")]
    [InlineData("", "", "")]
    public void Separar_nome_e_UF_nos_dois_formatos(string texto, string nome, string uf)
    {
        Assert.Equal((nome, uf), BuscaCidade.Separar(texto));
    }

    [Fact]
    public void Sem_regioes_ou_sem_cidade_nao_bloqueia()
    {
        Assert.False(RegiaoVendedor.Bloqueia(Array.Empty<RegiaoBloqueada>(), "Campinas - SP"));
        Assert.False(RegiaoVendedor.Bloqueia(new[] { R("estado", "SP") }, ""));
    }
}

using Elrond.Application.Common;

namespace Elrond.Tests;

/// <summary>Perfis Admin / Gestor / Colaborador e as permissões efetivas de cada um.</summary>
public class PerfisTests
{
    private const string Integracoes = "/administrativo/integracoes";

    [Fact]
    public void Admin_tem_tudo_inclusive_administrativas_e_especiais_sem_gravar_nada()
    {
        var efetivas = Funcionalidades.Efetivas(Perfis.Admin, Array.Empty<string>());

        Assert.Contains(Integracoes, efetivas);
        Assert.Contains("/financeiro/boleto-teste", efetivas);
        Assert.Contains("/fiscal/nfse", efetivas);
        Assert.Contains("/dashboard", efetivas);
        Assert.Equal(Funcionalidades.Todas.Count, efetivas.Count);
    }

    [Fact]
    public void Gestor_nao_recebe_administrativa_nem_quando_gravada()
    {
        var efetivas = Funcionalidades.Efetivas(Perfis.Gestor, new[] { Integracoes, "/contratos", "/fiscal/nfse" });

        Assert.DoesNotContain(Integracoes, efetivas);
        Assert.DoesNotContain("/contratos", efetivas);
        Assert.Contains("/fiscal/nfse", efetivas);
        Assert.Contains("/cadastros/auditoria", efetivas);
    }

    [Fact]
    public void Colaborador_fica_so_com_o_concedivel_que_foi_gravado()
    {
        var efetivas = Funcionalidades.Efetivas(Perfis.Colaborador, new[] { "/dashboard", Integracoes, "/inventada" });

        Assert.Equal(new[] { "/dashboard" }, efetivas);
    }

    [Fact]
    public void Administrativas_nao_sao_concediveis()
    {
        Assert.All(Funcionalidades.Administrativas, a => Assert.DoesNotContain(a, Funcionalidades.Concediveis));
    }

    [Theory]
    [InlineData(Perfis.Admin, true)]
    [InlineData(Perfis.Gestor, true)]
    [InlineData(Perfis.Colaborador, false)]
    [InlineData(null, false)]
    public void Poder_de_gestor(string? perfil, bool esperado) =>
        Assert.Equal(esperado, Perfis.TemPoderDeGestor(perfil));
}

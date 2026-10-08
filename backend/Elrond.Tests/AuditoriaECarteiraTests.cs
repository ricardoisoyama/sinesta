using System.Text.Json;
using Elrond.Application.Interfaces;
using Elrond.Domain.Entities;
using Elrond.Infrastructure.Services;

namespace Elrond.Tests;

public class AuditoriaECarteiraTests
{
    [Fact]
    public void Diferencas_lista_so_os_campos_que_mudaram()
    {
        var antes = new Empresa { Id = "m", Nome = "Matriz", MarkupMinimo = 0m, Dv = new DvEmpresa { Lucro = 0.07m } };
        var depois = new Empresa { Id = "m", Nome = "Matriz", MarkupMinimo = 0.05m, Dv = new DvEmpresa { Lucro = 0.07m } };

        var json = JsonDocument.Parse(AuditoriaService.Diferencas(antes, depois)).RootElement;

        Assert.True(json.TryGetProperty("markupMinimo", out var m));
        Assert.Equal(0m, m.GetProperty("de").GetDecimal());
        Assert.Equal(0.05m, m.GetProperty("para").GetDecimal());
        Assert.False(json.TryGetProperty("nome", out _));
        Assert.False(json.TryGetProperty("dv", out _));
    }

    [Fact]
    public void Diferencas_ignora_decimal_com_escala_diferente_e_objetos_iguais()
    {
        // O banco devolve 0.000000 / 0.001000; o payload traz 0 / 0.001. Não é alteração.
        var antes = JsonDocument.Parse("{\"cbs\":0.000000,\"ibs\":0.001000,\"dv\":{\"lucro\":0.070000},\"icms\":[{\"a\":1.0}]}").RootElement;
        var depois = JsonDocument.Parse("{\"cbs\":0,\"ibs\":0.001,\"dv\":{\"lucro\":0.07},\"icms\":[{\"a\":1}]}").RootElement;

        Assert.Equal("{}", AuditoriaService.Diferencas(antes, depois));
    }

    [Fact]
    public void Diferencas_trata_nulo_e_bloco_em_branco_como_iguais()
    {
        // Cliente antigo: banco nulo e contatos nulos no banco; o front manda banco em branco e lista vazia.
        var antes = JsonDocument.Parse("{\"banco\":null,\"contatos\":null,\"site\":\"\"}").RootElement;
        var depois = JsonDocument.Parse("{\"banco\":{\"pix\":\"\",\"banco\":\"\",\"agencia\":\"\"},\"contatos\":[],\"site\":null}").RootElement;
        Assert.Equal("{}", AuditoriaService.Diferencas(antes, depois));

        // Mas contato novo de verdade aparece.
        var comContato = JsonDocument.Parse("{\"banco\":null,\"contatos\":[{\"nome\":\"Bruno\"}],\"site\":\"\"}").RootElement;
        var json = JsonDocument.Parse(AuditoriaService.Diferencas(antes, comContato)).RootElement;
        Assert.True(json.TryGetProperty("contatos", out _));
        Assert.False(json.TryGetProperty("banco", out _));
    }

    [Fact]
    public void Diferencas_sem_antes_devolve_vazio_e_texto_longo_vira_marcador()
    {
        Assert.Equal("{}", AuditoriaService.Diferencas(null, new { a = 1 }));

        var logoGrande = new string('x', 5000);
        var json = JsonDocument.Parse(AuditoriaService.Diferencas(new { logo = "" }, new { logo = logoGrande })).RootElement;
        Assert.Contains("texto longo", json.GetProperty("logo").GetProperty("para").GetString());
    }

    [Fact]
    public void Carteira_do_vendedor_filtra_clientes_propostas_e_cards()
    {
        var visao = new CarteiraVisao(false, new HashSet<string> { "v1" }, new HashSet<string> { "c1" });

        Assert.True(visao.VeCliente(new Cliente { Id = "c1" }));
        Assert.False(visao.VeCliente(new Cliente { Id = "c2" }));
        Assert.True(visao.VeProposta(new Proposta { VendedorId = "v1", ClienteId = "c9" }));
        Assert.True(visao.VeProposta(new Proposta { VendedorId = "v9", ClienteId = "c1" }));
        Assert.False(visao.VeProposta(new Proposta { VendedorId = "v9", ClienteId = "c9" }));
        Assert.True(visao.VeOportunidade(new Oportunidade { VendedorId = "v1" }));
        Assert.False(visao.VeOportunidade(new Oportunidade { VendedorId = "v2", ClienteId = "c2" }));
        Assert.True(CarteiraVisao.Tudo.VeProposta(new Proposta()));
    }
}

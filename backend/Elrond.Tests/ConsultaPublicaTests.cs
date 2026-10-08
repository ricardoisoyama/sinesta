using Elrond.Infrastructure.Integracoes.ConsultaPublica;

namespace Elrond.Tests;

/// <summary>Regras locais da consulta de CNPJ/CEP (as fontes externas não entram no teste).</summary>
public class ConsultaPublicaTests
{
    [Theory]
    [InlineData("63736778000183", true)]  // Mirai (validado em 08/10)
    [InlineData("13445356000180", true)]  // Marshipping
    [InlineData("63736778000184", false)] // dígito errado
    [InlineData("11111111111111", false)] // repetido
    [InlineData("6373677800018", false)]  // 13 dígitos
    public void Cnpj_confere_os_digitos_verificadores(string cnpj, bool valido) =>
        Assert.Equal(valido, ConsultaPublicaService.CnpjValido(cnpj));

    [Fact]
    public void Nome_em_maiusculas_vira_nome_proprio_com_preposicoes_minusculas()
    {
        Assert.Equal("Avenida Doutor Luis Arrobas Martins", ConsultaPublicaService.Nome("AVENIDA DOUTOR LUIS ARROBAS MARTINS"));
        Assert.Equal("Capela do Socorro", ConsultaPublicaService.Nome("CAPELA DO SOCORRO"));
        Assert.Equal("São Paulo", ConsultaPublicaService.Nome("SÃO PAULO"));
        Assert.Equal(string.Empty, ConsultaPublicaService.Nome("  "));
    }

    [Theory]
    [InlineData("1150314252", "(11) 5031-4252")]
    [InlineData("11964237319", "(11) 96423-7319")]
    [InlineData("", "")]
    public void Telefone_sai_no_formato_brasileiro(string entrada, string esperado) =>
        Assert.Equal(esperado, ConsultaPublicaService.FormatarTelefone(entrada));
}

using Elrond.Domain.Regras;
using Xunit;

namespace Elrond.Tests;

/// <summary>Chave Pix no formato do banco (números de teste, nenhum real).</summary>
public class ChavePixTests
{
    [Theory]
    [InlineData("111.444.777-35", "11144477735", ChavePix.Cpf)]
    [InlineData("11144477735", "11144477735", ChavePix.Cpf)]
    [InlineData("11987654321", "+5511987654321", ChavePix.Celular)]
    [InlineData("(11) 98765-4321", "+5511987654321", ChavePix.Celular)]
    [InlineData("+55 11 98765-4321", "+5511987654321", ChavePix.Celular)]
    [InlineData("5511987654321", "+5511987654321", ChavePix.Celular)]
    [InlineData("11.222.333/0001-81", "11222333000181", ChavePix.Cnpj)]
    [InlineData(" Financeiro@Empresa.com.br ", "financeiro@empresa.com.br", ChavePix.Email)]
    [InlineData("123E4567-E89B-12D3-A456-426614174000", "123e4567-e89b-12d3-a456-426614174000", ChavePix.Aleatoria)]
    // Serve como CPF e como celular: a pontuação decide.
    [InlineData("529.982.247-25", "52998224725", ChavePix.Cpf)]
    [InlineData("(52) 99822-4725", "+5552998224725", ChavePix.Celular)]
    public void Normaliza_para_o_formato_do_pix(string bruta, string chave, string tipo)
    {
        var r = ChavePix.Normalizar(bruta);
        Assert.True(r.Ok, r.Erro);
        Assert.Equal((chave, tipo), (r.Chave, r.Tipo));
    }

    [Theory]
    [InlineData("", "Informe")]
    [InlineData("52998224725", "pode ser CPF ou celular")]
    [InlineData("12345678900", "inválido")]
    [InlineData("11.222.333/0001-00", "CNPJ")]
    [InlineData("+1 415 555 0100", "Celular")]
    [InlineData("fulano@", "E-mail")]
    [InlineData("chave qualquer", "inválida")]
    public void Recusa_chave_que_o_banco_nao_aceitaria(string bruta, string trecho)
    {
        var r = ChavePix.Normalizar(bruta);
        Assert.False(r.Ok);
        Assert.Contains(trecho, r.Erro);
    }
}

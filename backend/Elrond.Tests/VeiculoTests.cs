using Elrond.Application.Validators;
using Elrond.Domain.Entities;

namespace Elrond.Tests;

public class VeiculoTests
{
    private static Veiculo Valido() => new() { PlacaTracao = "abc-1d23", TipoVeiculo = "Truck" };

    [Theory]
    [InlineData("ABC1234", true)]   // formato antigo
    [InlineData("abc-1234", true)]  // com hífen e minúscula
    [InlineData("ABC1D23", true)]   // Mercosul
    [InlineData("AB1234", false)]
    [InlineData("ABCD123", false)]
    [InlineData("", false)]
    public void Placa_antiga_ou_Mercosul(string placa, bool valida) => Assert.Equal(valida, Veiculo.PlacaValida(placa));

    [Fact]
    public void Normaliza_placas_e_documentos_antes_de_gravar()
    {
        var v = Valido();
        v.PlacaReboque = " xyz 4e56 ";
        v.Renavam = "012.345.678-90";
        v.Chassi = " 9bwzzz377vt004251 ";
        v.Normalizar();
        Assert.Equal("ABC1D23", v.PlacaTracao);
        Assert.Equal("XYZ4E56", v.PlacaReboque);
        Assert.Equal("01234567890", v.Renavam);
        Assert.Equal("9BWZZZ377VT004251", v.Chassi);
    }

    [Fact]
    public void Nome_resume_placa_tipo_e_modelo()
    {
        var v = new Veiculo { PlacaTracao = "ABC1234", TipoVeiculo = "Toco", Marca = "Volvo", Modelo = "VM 270" };
        Assert.Equal("ABC-1234 · Toco · Volvo VM 270", v.Nome);
        Assert.Equal("ABC1D23 · Truck", new Veiculo { PlacaTracao = "ABC1D23", TipoVeiculo = "Truck" }.Nome);
    }

    [Fact]
    public void Validador_exige_placa_e_tipo_e_confere_documentos()
    {
        var val = new VeiculoValidator();
        Assert.True(val.Validate(Valido()).IsValid);

        Assert.Contains(val.Validate(new Veiculo { TipoVeiculo = "Truck" }).Errors, e => e.ErrorMessage.Contains("placa de tração"));
        Assert.Contains(val.Validate(new Veiculo { PlacaTracao = "ABC1234" }).Errors, e => e.ErrorMessage.Contains("tipo de veículo"));
        Assert.Contains(val.Validate(new Veiculo { PlacaTracao = "AB12", TipoVeiculo = "Truck" }).Errors, e => e.ErrorMessage.Contains("inválida"));

        var doc = Valido();
        doc.CpfCnpj = "111.111.111-11";
        Assert.Contains(val.Validate(doc).Errors, e => e.ErrorMessage.Contains("CPF/CNPJ"));
        doc.CpfCnpj = "529.982.247-25";
        Assert.True(val.Validate(doc).IsValid);

        var renavam = Valido();
        renavam.Renavam = "123";
        Assert.Contains(val.Validate(renavam).Errors, e => e.ErrorMessage.Contains("Renavam"));
    }
}

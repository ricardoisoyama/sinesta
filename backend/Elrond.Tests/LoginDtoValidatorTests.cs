using Elrond.Application.DTOs;
using Elrond.Application.Validators;

namespace Elrond.Tests;

public class LoginDtoValidatorTests
{
    private readonly LoginDtoValidator _validator = new();

    [Fact]
    public void Aceita_login_valido()
    {
        var result = _validator.Validate(new LoginDto("admin@elrond.com.br", "elrond@2024"));
        Assert.True(result.IsValid);
    }

    [Theory]
    [InlineData("", "elrond@2024")]
    [InlineData("nao-e-email", "elrond@2024")]
    [InlineData("admin@elrond.com.br", "")]
    [InlineData("admin@elrond.com.br", "123")]
    public void Rejeita_login_invalido(string email, string senha)
    {
        var result = _validator.Validate(new LoginDto(email, senha));
        Assert.False(result.IsValid);
    }
}

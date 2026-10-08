using Elrond.Infrastructure.Security;

namespace Elrond.Tests;

public class BcryptPasswordHasherTests
{
    private readonly BcryptPasswordHasher _hasher = new();

    [Fact]
    public void Hash_gera_valor_diferente_da_senha()
    {
        var hash = _hasher.Hash("elrond@2024");
        Assert.NotEqual("elrond@2024", hash);
    }

    [Fact]
    public void Verify_aceita_senha_correta()
    {
        var hash = _hasher.Hash("elrond@2024");
        Assert.True(_hasher.Verify("elrond@2024", hash));
    }

    [Fact]
    public void Verify_rejeita_senha_incorreta()
    {
        var hash = _hasher.Hash("elrond@2024");
        Assert.False(_hasher.Verify("outra-senha", hash));
    }
}

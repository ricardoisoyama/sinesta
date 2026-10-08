using System.Security.Cryptography;
using System.Security.Cryptography.X509Certificates;
using System.Text;
using Elrond.Infrastructure.Services;
using Xunit;

namespace Elrond.Tests;

public class CertificadoTests
{
    private static X509Certificate2 Gerar(string cn)
    {
        using var rsa = RSA.Create(2048);
        var req = new CertificateRequest($"CN={cn}", rsa, HashAlgorithmName.SHA256, RSASignaturePadding.Pkcs1);
        return req.CreateSelfSigned(DateTimeOffset.UtcNow.AddDays(-1), DateTimeOffset.UtcNow.AddYears(1));
    }

    [Fact]
    public void LeCnpjETitularDoCnDoECnpj()
    {
        using var c = Gerar("SINESTA TECNOLOGIA LTDA:12345678000190");
        Assert.Equal("12345678000190", CertificadoService.CnpjDo(c));
        Assert.Equal("SINESTA TECNOLOGIA LTDA", CertificadoService.Titular(c));
    }

    [Fact]
    public void SemCnpjNoCertificadoFicaVazio()
    {
        using var c = Gerar("Fulano de Tal");
        Assert.Equal(string.Empty, CertificadoService.CnpjDo(c));
        Assert.Equal("Fulano de Tal", CertificadoService.Titular(c));
    }

    [Fact]
    public void CifraVoltaIgualSoParaAMesmaEmpresa()
    {
        var chave = RandomNumberGenerator.GetBytes(32);
        var claro = Encoding.UTF8.GetBytes("conteúdo do pfx");
        var pacote = CertificadoService.Cifrar(claro, chave, Encoding.UTF8.GetBytes("empresa-1"));

        Assert.Equal(claro, CertificadoService.Decifrar(pacote, chave, Encoding.UTF8.GetBytes("empresa-1")));
        // Cifrado de uma empresa não abre como se fosse de outra (dado associado diferente).
        Assert.ThrowsAny<CryptographicException>(() => CertificadoService.Decifrar(pacote, chave, Encoding.UTF8.GetBytes("empresa-2")));
        // Nem com outra chave.
        Assert.ThrowsAny<CryptographicException>(() => CertificadoService.Decifrar(pacote, RandomNumberGenerator.GetBytes(32), Encoding.UTF8.GetBytes("empresa-1")));
    }
}

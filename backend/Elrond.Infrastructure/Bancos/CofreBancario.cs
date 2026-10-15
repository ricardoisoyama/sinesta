using System.Security.Cryptography;
using System.Security.Cryptography.X509Certificates;
using System.Text;
using Elrond.Application.Interfaces;
using Elrond.Domain.Entities;
using Elrond.Infrastructure.Services;

namespace Elrond.Infrastructure.Bancos;

/// <summary>
/// Cifra e decifra as credenciais bancárias com a mesma chave do certificado A1 (AES-256-GCM).
/// O dado associado amarra cada segredo à sua integração e ao seu campo: um valor copiado para
/// outra integração (ou trocado de campo) não abre.
/// </summary>
public sealed class CofreBancario(CertificadoOpcoes opcoes) : ICofreBancario
{
    public bool Configurado => opcoes.Chave() is { Length: 32 };

    private byte[] Chave() => opcoes.Chave() is { Length: 32 } k ? k : throw new InvalidOperationException("Chave de cifra (Certificados__Chave) ausente ou inválida.");

    private static byte[] Dado(string integracaoId, string campo) => Encoding.UTF8.GetBytes($"banco:{integracaoId}:{campo}");

    public CredencialBanco Abrir(IntegracaoBancaria i)
    {
        var k = Chave();
        return new CredencialBanco(
            i.Id, i.Ambiente, i.ClientId,
            Encoding.UTF8.GetString(CertificadoService.Decifrar(i.SegredoCifrado, k, Dado(i.Id, "segredo"))),
            CertificadoService.Decifrar(i.CertificadoCifrado, k, Dado(i.Id, "certificado")),
            CertificadoService.Decifrar(i.ChaveCifrada, k, Dado(i.Id, "chave")),
            i.ContaCorrente);
    }

    public (byte[] Segredo, byte[] Certificado, byte[] Chave) Fechar(string integracaoId, string clientSecret, byte[] certificado, byte[] chave)
    {
        var k = Chave();
        return (
            CertificadoService.Cifrar(Encoding.UTF8.GetBytes(clientSecret), k, Dado(integracaoId, "segredo")),
            CertificadoService.Cifrar(certificado, k, Dado(integracaoId, "certificado")),
            CertificadoService.Cifrar(chave, k, Dado(integracaoId, "chave")));
    }

    public string? ConferirCertificado(byte[] certificado, byte[] chave, out string validoAte)
    {
        validoAte = string.Empty;
        try
        {
            using var par = X509Certificate2.CreateFromPem(Encoding.UTF8.GetString(certificado), Encoding.UTF8.GetString(chave));
            if (!par.HasPrivateKey) return "A chave não corresponde ao certificado.";
            validoAte = par.NotAfter.ToString("yyyy-MM-dd");
            return par.NotAfter < DateTime.Now ? $"O certificado venceu em {par.NotAfter:dd/MM/yyyy}." : null;
        }
        catch (CryptographicException)
        {
            return "Certificado ou chave inválidos: envie o .crt e o .key (formato PEM) da mesma integração.";
        }
    }
}

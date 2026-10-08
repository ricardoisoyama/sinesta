using System.Formats.Asn1;
using System.Security.Cryptography;
using System.Security.Cryptography.X509Certificates;
using System.Text;
using System.Text.RegularExpressions;
using Elrond.Application.Common;
using Elrond.Application.Interfaces;
using Elrond.Domain.Entities;
using Elrond.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Elrond.Infrastructure.Services;

/// <summary>
/// Guarda o certificado A1 da empresa no banco, cifrado com AES-256-GCM. A chave fica só no
/// ambiente do servidor (Certificados__Chave, 32 bytes em base64): o banco sozinho (ou um backup)
/// não abre o certificado. O id da empresa entra como dado associado, então o conteúdo cifrado de
/// uma empresa não serve para outra. Sem a chave, a tela avisa e não deixa enviar.
/// </summary>
public sealed class CertificadoService(AppDbContext db, CertificadoOpcoes opcoes) : ICertificadoService
{
    private const int TamanhoMaximo = 100 * 1024;
    /// <summary>OID do CNPJ no certificado ICP-Brasil (otherName do SubjectAltName).</summary>
    private const string OidCnpj = "2.16.76.1.3.3";

    public bool Disponivel => opcoes.Chave() is { Length: 32 };

    public async Task<CertificadoInfoDto?> InfoAsync(string empresaId, CancellationToken ct = default)
    {
        var c = await db.CertificadosEmpresa.AsNoTracking().FirstOrDefaultAsync(x => x.EmpresaId == empresaId, ct);
        return c is null ? null : Info(c);
    }

    public async Task<Result<CertificadoInfoDto>> SalvarAsync(string empresaId, byte[] arquivo, string senha, string nomeArquivo, string usuario, CancellationToken ct = default)
    {
        if (opcoes.Chave() is not { Length: 32 } chave)
            return Result.Failure<CertificadoInfoDto>("O servidor ainda não tem a chave para guardar certificados. Fale com o suporte.");
        var empresa = await db.Empresas.AsNoTracking().FirstOrDefaultAsync(e => e.Id == empresaId, ct);
        if (empresa is null) return Result.Failure<CertificadoInfoDto>("Empresa não encontrada.");
        if (arquivo.Length == 0 || arquivo.Length > TamanhoMaximo)
            return Result.Failure<CertificadoInfoDto>("Envie o arquivo .pfx (ou .p12) do certificado A1, com até 100 KB.");

        X509Certificate2 cert;
        try
        {
            cert = Abrir(arquivo, senha);
        }
        catch (CryptographicException)
        {
            return Result.Failure<CertificadoInfoDto>("Não foi possível abrir o certificado: confira a senha e se o arquivo é o .pfx do certificado A1.");
        }
        using (cert)
        {
            if (!cert.HasPrivateKey)
                return Result.Failure<CertificadoInfoDto>("O arquivo não traz a chave privada. Exporte o certificado A1 com a chave (arquivo .pfx).");
            var agora = DateTime.UtcNow;
            if (cert.NotAfter.ToUniversalTime() < agora)
                return Result.Failure<CertificadoInfoDto>($"Este certificado venceu em {cert.NotAfter:dd/MM/yyyy}. Envie o certificado renovado.");

            var cnpjCert = CnpjDo(cert);
            var cnpjEmpresa = new string((empresa.Cnpj ?? string.Empty).Where(char.IsDigit).ToArray());
            // A matriz e as filiais têm a mesma raiz (8 primeiros dígitos): o certificado da matriz serve à filial.
            if (cnpjCert.Length == 14 && cnpjEmpresa.Length == 14 && cnpjCert[..8] != cnpjEmpresa[..8])
                return Result.Failure<CertificadoInfoDto>($"Este certificado é do CNPJ {FormatarCnpj(cnpjCert)}, e a empresa é {FormatarCnpj(cnpjEmpresa)}.");

            var aad = Encoding.UTF8.GetBytes(empresaId);
            var registro = await db.CertificadosEmpresa.FirstOrDefaultAsync(x => x.EmpresaId == empresaId, ct);
            if (registro is null)
            {
                registro = new CertificadoEmpresa { EmpresaId = empresaId };
                db.CertificadosEmpresa.Add(registro);
            }
            registro.ArquivoCifrado = Cifrar(arquivo, chave, aad);
            registro.SenhaCifrada = Cifrar(Encoding.UTF8.GetBytes(senha ?? string.Empty), chave, aad);
            registro.NomeArquivo = Path.GetFileName(nomeArquivo ?? string.Empty);
            registro.Titular = Titular(cert);
            registro.Cnpj = cnpjCert;
            registro.Emissor = cert.GetNameInfo(X509NameType.SimpleName, forIssuer: true);
            registro.Impressao = cert.Thumbprint;
            registro.ValidoDe = cert.NotBefore.ToUniversalTime();
            registro.ValidoAte = cert.NotAfter.ToUniversalTime();
            registro.EnviadoEm = agora;
            registro.EnviadoPor = usuario;
            await db.SaveChangesAsync(ct);
            return Result.Success(Info(registro));
        }
    }

    public async Task<bool> RemoverAsync(string empresaId, CancellationToken ct = default)
    {
        var c = await db.CertificadosEmpresa.FirstOrDefaultAsync(x => x.EmpresaId == empresaId, ct);
        if (c is null) return false;
        db.CertificadosEmpresa.Remove(c);
        await db.SaveChangesAsync(ct);
        return true;
    }

    public async Task<X509Certificate2?> CarregarAsync(string empresaId, CancellationToken ct = default)
    {
        if (opcoes.Chave() is not { Length: 32 } chave) return null;
        var c = await db.CertificadosEmpresa.AsNoTracking().FirstOrDefaultAsync(x => x.EmpresaId == empresaId, ct);
        if (c is null) return null;
        var aad = Encoding.UTF8.GetBytes(empresaId);
        var arquivo = Decifrar(c.ArquivoCifrado, chave, aad);
        var senha = Encoding.UTF8.GetString(Decifrar(c.SenhaCifrada, chave, aad));
        return Abrir(arquivo, senha);
    }

    private static CertificadoInfoDto Info(CertificadoEmpresa c) =>
        new(c.NomeArquivo, c.Titular, c.Cnpj, c.Emissor, c.ValidoDe, c.ValidoAte, c.EnviadoEm, c.EnviadoPor);

    /// <summary>Abre o .pfx e devolve o certificado que tem a chave privada (o arquivo pode trazer a cadeia junto).</summary>
    private static X509Certificate2 Abrir(byte[] arquivo, string senha)
    {
        var colecao = X509CertificateLoader.LoadPkcs12Collection(arquivo, senha, X509KeyStorageFlags.EphemeralKeySet);
        var comChave = colecao.FirstOrDefault(x => x.HasPrivateKey) ?? colecao.FirstOrDefault()
            ?? throw new CryptographicException("Arquivo sem certificado.");
        foreach (var outro in colecao)
            if (!ReferenceEquals(outro, comChave)) outro.Dispose();
        return comChave;
    }

    /// <summary>Nome do titular: no e-CNPJ o CN vem como "RAZÃO SOCIAL:12345678000190".</summary>
    public static string Titular(X509Certificate2 cert)
    {
        var cn = cert.GetNameInfo(X509NameType.SimpleName, forIssuer: false);
        var m = Regex.Match(cn, @"^(.*?):\d{11,14}$");
        return m.Success ? m.Groups[1].Value.Trim() : cn;
    }

    /// <summary>CNPJ do certificado: pelo CN ("NOME:CNPJ") ou pelo campo próprio da ICP-Brasil no SubjectAltName.</summary>
    public static string CnpjDo(X509Certificate2 cert)
    {
        var cn = cert.GetNameInfo(X509NameType.SimpleName, forIssuer: false);
        var m = Regex.Match(cn, @":(\d{14})$");
        if (m.Success) return m.Groups[1].Value;
        try
        {
            var san = cert.Extensions["2.5.29.17"];
            if (san is null) return string.Empty;
            var nomes = new AsnReader(san.RawData, AsnEncodingRules.DER).ReadSequence();
            var otherName = new Asn1Tag(TagClass.ContextSpecific, 0, isConstructed: true);
            while (nomes.HasData)
            {
                if (!nomes.PeekTag().HasSameClassAndValue(otherName))
                {
                    nomes.ReadEncodedValue();
                    continue;
                }
                var on = nomes.ReadSequence(otherName);
                var oid = on.ReadObjectIdentifier();
                var valor = Encoding.ASCII.GetString(on.ReadEncodedValue().ToArray());
                if (oid != OidCnpj) continue;
                var d = Regex.Match(valor, @"\d{14}");
                if (d.Success) return d.Value;
            }
        }
        catch (AsnContentException)
        {
            // SubjectAltName fora do padrão: fica sem CNPJ (a conferência com a empresa é pulada).
        }
        return string.Empty;
    }

    private static string FormatarCnpj(string d) =>
        d.Length == 14 ? $"{d[..2]}.{d[2..5]}.{d[5..8]}/{d[8..12]}-{d[12..]}" : d;

    public static byte[] Cifrar(byte[] claro, byte[] chave, byte[] aad)
    {
        var nonce = RandomNumberGenerator.GetBytes(12);
        var cifrado = new byte[claro.Length];
        var tag = new byte[16];
        using var aes = new AesGcm(chave, 16);
        aes.Encrypt(nonce, claro, cifrado, tag, aad);
        return [.. nonce, .. tag, .. cifrado];
    }

    public static byte[] Decifrar(byte[] pacote, byte[] chave, byte[] aad)
    {
        var claro = new byte[pacote.Length - 28];
        using var aes = new AesGcm(chave, 16);
        aes.Decrypt(pacote.AsSpan(0, 12), pacote.AsSpan(28), pacote.AsSpan(12, 16), claro, aad);
        return claro;
    }
}

/// <summary>Chave dos certificados (Certificados__Chave no ambiente do servidor; 32 bytes em base64).</summary>
public sealed class CertificadoOpcoes
{
    public string ChaveBase64 { get; init; } = string.Empty;

    public byte[]? Chave()
    {
        try
        {
            return ChaveBase64.Length == 0 ? null : Convert.FromBase64String(ChaveBase64);
        }
        catch (FormatException)
        {
            return null;
        }
    }
}

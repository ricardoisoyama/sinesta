using System.Security.Cryptography.X509Certificates;
using Elrond.Application.Common;

namespace Elrond.Application.Interfaces;

/// <summary>O que a tela vê do certificado (nunca o arquivo nem a senha).</summary>
public record CertificadoInfoDto(
    string NomeArquivo,
    string Titular,
    string Cnpj,
    string Emissor,
    DateTime ValidoDe,
    DateTime ValidoAte,
    DateTime EnviadoEm,
    string EnviadoPor);

/// <summary>Certificado digital A1 da empresa, guardado cifrado para assinar as notas fiscais.</summary>
public interface ICertificadoService
{
    /// <summary>Se a chave de cifra está no ambiente do servidor (sem ela não dá para guardar).</summary>
    bool Disponivel { get; }
    Task<CertificadoInfoDto?> InfoAsync(string empresaId, CancellationToken ct = default);
    /// <summary>Confere senha, validade e CNPJ e guarda cifrado (troca o anterior).</summary>
    Task<Result<CertificadoInfoDto>> SalvarAsync(string empresaId, byte[] arquivo, string senha, string nomeArquivo, string usuario, CancellationToken ct = default);
    Task<bool> RemoverAsync(string empresaId, CancellationToken ct = default);
    /// <summary>Abre o certificado com a chave privada, para assinar (emissão da nota).</summary>
    Task<X509Certificate2?> CarregarAsync(string empresaId, CancellationToken ct = default);
}

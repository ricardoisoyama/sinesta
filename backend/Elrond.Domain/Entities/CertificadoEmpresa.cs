namespace Elrond.Domain.Entities;

/// <summary>
/// Certificado digital A1 (.pfx) da empresa, usado para assinar as notas fiscais. Arquivo e senha
/// ficam cifrados (AES-256-GCM, chave só no ambiente do servidor); o resto é o que a tela mostra.
/// Tabela própria para o arquivo nunca viajar junto com o cadastro da empresa.
/// </summary>
public class CertificadoEmpresa
{
    public string EmpresaId { get; set; } = string.Empty;
    public byte[] ArquivoCifrado { get; set; } = Array.Empty<byte>();
    public byte[] SenhaCifrada { get; set; } = Array.Empty<byte>();
    public string NomeArquivo { get; set; } = string.Empty;
    /// <summary>Nome do titular (CN do certificado, sem o CNPJ).</summary>
    public string Titular { get; set; } = string.Empty;
    /// <summary>CNPJ do certificado (só dígitos; vazio se não achou).</summary>
    public string Cnpj { get; set; } = string.Empty;
    public string Emissor { get; set; } = string.Empty;
    public string Impressao { get; set; } = string.Empty;
    public DateTime ValidoDe { get; set; }
    public DateTime ValidoAte { get; set; }
    public DateTime EnviadoEm { get; set; }
    public string EnviadoPor { get; set; } = string.Empty;
}

using Elrond.Domain.Common;

namespace Elrond.Domain.Entities;

/// <summary>
/// Documento anexado a um cadastro (cliente, fornecedor...). O arquivo em si fica no
/// disco do servidor (pasta por registro); aqui ficam os dados para listar e localizar.
/// </summary>
public class Anexo : Rastreavel, IEntity
{
    public string Id { get; set; } = string.Empty;
    /// <summary>"cliente" | "fornecedor".</summary>
    public string Entidade { get; set; } = string.Empty;
    /// <summary>Id do registro dono (uuid do cliente/fornecedor).</summary>
    public string EntidadeId { get; set; } = string.Empty;
    /// <summary>Nome original do arquivo, como o usuário enviou.</summary>
    public string Nome { get; set; } = string.Empty;
    /// <summary>Content-type (application/pdf, image/jpeg...).</summary>
    public string Tipo { get; set; } = string.Empty;
    public long Tamanho { get; set; }
    /// <summary>Caminho relativo à raiz de arquivos (ex.: clientes/&lt;id&gt;/&lt;guid&gt;.pdf).</summary>
    public string Caminho { get; set; } = string.Empty;
    public string EnviadoPor { get; set; } = string.Empty;
    /// <summary>Data e hora do envio (ISO 8601).</summary>
    public string Em { get; set; } = string.Empty;
}

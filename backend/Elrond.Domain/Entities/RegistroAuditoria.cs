using Elrond.Domain.Common;

namespace Elrond.Domain.Entities;

/// <summary>
/// Trilha de auditoria: quem fez o quê, quando, em qual registro e o que mudou.
/// Uma linha por ação (criar, editar, excluir, inativar, aprovar, status, login...).
/// </summary>
public class RegistroAuditoria : IEntity
{
    public string Id { get; set; } = string.Empty;
    /// <summary>Data e hora (UTC, ISO 8601).</summary>
    public string Em { get; set; } = string.Empty;
    public string UsuarioId { get; set; } = string.Empty;
    public string UsuarioNome { get; set; } = string.Empty;
    /// <summary>criar | editar | excluir | inativar | importar | status | aprovar | login | login-falhou | anexo | transferir-carteira ...</summary>
    public string Acao { get; set; } = string.Empty;
    /// <summary>Tipo do registro (Cliente, Proposta, Empresa, Usuario...).</summary>
    public string Entidade { get; set; } = string.Empty;
    public string EntidadeId { get; set; } = string.Empty;
    /// <summary>Frase legível (ex.: "Empresa Matriz alterada").</summary>
    public string Descricao { get; set; } = string.Empty;
    /// <summary>JSON com os campos que mudaram: { "campo": { "de": ..., "para": ... } }.</summary>
    public string Alteracoes { get; set; } = "{}";
    public string Ip { get; set; } = string.Empty;
}

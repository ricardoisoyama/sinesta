using Elrond.Domain.Common;

namespace Elrond.Domain.Entities;

/// <summary>
/// Conta Google que um usuário conectou à Agenda. As chaves do Google ficam cifradas (AES-GCM
/// com a chave do servidor); desconectar apaga as chaves e inativa o registro.
/// </summary>
public class ConexaoGoogle : Rastreavel, IEntity, IInativavel
{
    public string Id { get; set; } = string.Empty;
    /// <summary>Usuário do ELROND dono da conexão (uma por usuário).</summary>
    public string UsuarioId { get; set; } = string.Empty;
    /// <summary>E-mail da conta Google conectada.</summary>
    public string Email { get; set; } = string.Empty;
    public string RefreshTokenCifrado { get; set; } = string.Empty;
    public string AccessTokenCifrado { get; set; } = string.Empty;
    /// <summary>ISO 8601 (UTC) em que a chave de acesso vence.</summary>
    public string AccessTokenExpiraEm { get; set; } = string.Empty;
    public string ConectadoEm { get; set; } = string.Empty;
    /// <summary>ISO 8601 (UTC) da última leitura de alterações no Google.</summary>
    public string UltimaSincronia { get; set; } = string.Empty;
    /// <summary>Último problema com o Google (vazio quando está tudo certo).</summary>
    public string UltimoErro { get; set; } = string.Empty;
    public string Status { get; set; } = "ativo";
}

/// <summary>
/// Liga um compromisso ou a próxima ação de um card do CRM ao evento criado no Google Agenda
/// do responsável. A assinatura é o resumo do último envio: se nada mudou, não reenvia.
/// </summary>
public class VinculoGoogle : IEntity
{
    public string Id { get; set; } = string.Empty;
    public string UsuarioId { get; set; } = string.Empty;
    /// <summary>"compromisso" ou "crm".</summary>
    public string Origem { get; set; } = string.Empty;
    public string OrigemId { get; set; } = string.Empty;
    public string GoogleEventId { get; set; } = string.Empty;
    public string Assinatura { get; set; } = string.Empty;
    public string AtualizadoEm { get; set; } = string.Empty;
}

using Elrond.Domain.Common;

namespace Elrond.Domain.Entities;

/// <summary>
/// Servidor de e-mail (SMTP) do ambiente: de onde saem os avisos do sistema (pagamento efetuado,
/// fatura, boleto). Um por ambiente (Id "padrao"); configurado pela equipe ELROND em
/// Administrativo › Integração SMTP. A senha fica cifrada; nunca volta para a tela.
/// </summary>
public class ConfiguracaoSmtp : Rastreavel, IEntity
{
    public const string IdPadrao = "padrao";

    public string Id { get; set; } = IdPadrao;
    public string Host { get; set; } = string.Empty;
    public int Porta { get; set; } = 587;
    /// <summary>starttls (587) | ssl (465) | nenhuma.</summary>
    public string Seguranca { get; set; } = "starttls";
    public string Usuario { get; set; } = string.Empty;
    public byte[] SenhaCifrada { get; set; } = Array.Empty<byte>();
    public string RemetenteNome { get; set; } = string.Empty;
    public string RemetenteEmail { get; set; } = string.Empty;
    /// <summary>Responder para (vazio = o próprio remetente).</summary>
    public string ResponderPara { get; set; } = string.Empty;
    /// <summary>E-mail que recebe o teste e, no modo piloto, todos os envios.</summary>
    public string EmailTeste { get; set; } = string.Empty;
    /// <summary>Piloto: tudo vai só para o e-mail de teste (o destinatário real aparece no assunto).</summary>
    public bool SomenteTeste { get; set; } = true;
    public bool Ativo { get; set; }
    /// <summary>Último teste (UTC, ISO) e se deu certo.</summary>
    public string TestadoEm { get; set; } = string.Empty;
    public bool TesteOk { get; set; }
}

/// <summary>Registro de cada e-mail que o sistema tentou mandar (histórico e conferência).</summary>
public class EmailEnviado : IEntity
{
    public string Id { get; set; } = string.Empty;
    /// <summary>UTC, ISO.</summary>
    public string Em { get; set; } = string.Empty;
    /// <summary>Destinatário pretendido.</summary>
    public string Para { get; set; } = string.Empty;
    /// <summary>Para onde foi de fato (no piloto, o e-mail de teste).</summary>
    public string EnviadoPara { get; set; } = string.Empty;
    public string Assunto { get; set; } = string.Empty;
    /// <summary>teste | pagamento | fatura...</summary>
    public string Origem { get; set; } = string.Empty;
    public string OrigemId { get; set; } = string.Empty;
    /// <summary>enviado | falhou | desligado.</summary>
    public string Situacao { get; set; } = string.Empty;
    public string Erro { get; set; } = string.Empty;
}

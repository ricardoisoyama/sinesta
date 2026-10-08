using Elrond.Domain.Common;

namespace Elrond.Domain.Entities;

/// <summary>
/// Compromisso da Agenda (reunião, ligação, visita, tarefa). Pode estar ligado a um cliente e a
/// um card do CRM. As próximas ações do CRM continuam no card e aparecem na Agenda junto com
/// estes; a ida e volta com Google/Microsoft entra depois, sobre esta mesma tabela.
/// </summary>
public class Compromisso : Rastreavel, IEntity, IInativavel
{
    public string Id { get; set; } = string.Empty;
    public string Titulo { get; set; } = string.Empty;
    /// <summary>reuniao | ligacao | visita | tarefa | outro.</summary>
    public string Tipo { get; set; } = "reuniao";
    /// <summary>Início local: "yyyy-MM-ddTHH:mm" (ou só "yyyy-MM-dd" no dia inteiro).</summary>
    public string Inicio { get; set; } = string.Empty;
    /// <summary>Fim local, mesmo formato do início.</summary>
    public string Fim { get; set; } = string.Empty;
    public bool DiaInteiro { get; set; }
    /// <summary>Funcionário dono do compromisso (id do usuário) e o nome no dia.</summary>
    public string ResponsavelId { get; set; } = string.Empty;
    public string ResponsavelNome { get; set; } = string.Empty;
    public string ClienteId { get; set; } = string.Empty;
    public string ClienteNome { get; set; } = string.Empty;
    /// <summary>Card do CRM de onde o compromisso veio (opcional).</summary>
    public string OportunidadeId { get; set; } = string.Empty;
    public string Local { get; set; } = string.Empty;
    /// <summary>E-mails dos convidados: recebem o convite pelo Google do responsável.</summary>
    public List<string> Convidados { get; set; } = new();
    /// <summary>Pede ao Google uma sala do Meet para o compromisso.</summary>
    public bool ComMeet { get; set; }
    /// <summary>Link da videoconferência devolvido pelo Google (vazio sem Meet).</summary>
    public string LinkReuniao { get; set; } = string.Empty;
    public string Descricao { get; set; } = string.Empty;
    public bool Concluido { get; set; }
    /// <summary>Excluir = inativar (o histórico fica).</summary>
    public string Status { get; set; } = "ativo";
}

using Elrond.Domain.Common;

namespace Elrond.Domain.Entities;

/// <summary>Etapa do funil (vira coluna do kanban). "ganho"/"perdido" encerram a oportunidade.</summary>
public class EtapaFunil
{
    public string Id { get; set; } = string.Empty;
    public string Nome { get; set; } = string.Empty;
    public string Cor { get; set; } = "#8a97a0";
    /// <summary>"normal" | "ganho" | "perdido".</summary>
    public string Tipo { get; set; } = "normal";
}

/// <summary>Campo extra que o cliente cria para os cards deste funil.</summary>
public class CampoCustomizado
{
    public string Id { get; set; } = string.Empty;
    public string Nome { get; set; } = string.Empty;
    /// <summary>"texto" | "numero" | "data" | "lista".</summary>
    public string Tipo { get; set; } = "texto";
    /// <summary>Opções quando Tipo = lista.</summary>
    public List<string> Opcoes { get; set; } = new();
}

/// <summary>Funil do CRM, parametrizável pelo cliente.</summary>
public class Funil : Rastreavel, IEntity, IInativavel
{
    public string Id { get; set; } = string.Empty;
    /// <summary>"ativo" | "inativo" (funil inativo sai do CRM; os cards ficam guardados).</summary>
    public string Status { get; set; } = "ativo";
    public string Nome { get; set; } = string.Empty;
    /// <summary>Horas parado numa etapa até o card "esquentar" (ficar vermelho). 0 = não alerta.</summary>
    public int HorasAlerta { get; set; } = 48;
    /// <summary>Cor de fundo dos cards deste funil (preferência do cliente). Vazio = padrão.</summary>
    public string CorCard { get; set; } = string.Empty;
    public List<EtapaFunil> Etapas { get; set; } = new();
    public List<CampoCustomizado> CamposCustomizados { get; set; } = new();
}

/// <summary>Registro do histórico da oportunidade (timeline).</summary>
public class AnotacaoOportunidade
{
    public string Id { get; set; } = string.Empty;
    public string Texto { get; set; } = string.Empty;
    /// <summary>ISO 8601.</summary>
    public string Em { get; set; } = string.Empty;
}

/// <summary>Valor de um campo customizado do funil neste card.</summary>
public class ValorCampoCustomizado
{
    public string CampoId { get; set; } = string.Empty;
    public string Valor { get; set; } = string.Empty;
}

/// <summary>Oportunidade comercial: um card do kanban.</summary>
public class Oportunidade : Rastreavel, IEntity, IInativavel
{
    public string Id { get; set; } = string.Empty;
    /// <summary>"ativo" | "inativo" (card arquivado: sai do kanban, fica no histórico).</summary>
    public string Status { get; set; } = "ativo";
    public string FunilId { get; set; } = string.Empty;
    public string EtapaId { get; set; } = string.Empty;
    public string Cliente { get; set; } = string.Empty;
    /// <summary>Cliente do cadastro (uuid), quando escolhido da lista.</summary>
    public string ClienteId { get; set; } = string.Empty;
    public string Cnpj { get; set; } = string.Empty;
    /// <summary>Responsável no cliente (a pessoa com quem se fala).</summary>
    public string Contato { get; set; } = string.Empty;
    public string Telefone { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    /// <summary>"" | "influenciador" | "decisor".</summary>
    public string PerfilComprador { get; set; } = string.Empty;
    public string DecisorNome { get; set; } = string.Empty;
    public string DecisorTelefone { get; set; } = string.Empty;
    public string DecisorEmail { get; set; } = string.Empty;
    public string Servico { get; set; } = string.Empty;
    public decimal ValorEstimado { get; set; }
    public string PropostaNumero { get; set; } = string.Empty;
    /// <summary>"" | "recorrente" | "spot".</summary>
    public string Recorrencia { get; set; } = string.Empty;
    public string Origem { get; set; } = string.Empty;
    /// <summary>Nome do usuário do portal responsável pelo card (como estava no dia).</summary>
    public string Responsavel { get; set; } = string.Empty;
    /// <summary>Id do usuário responsável: é por ele que o card vai para a Agenda e o Google dele. Vazio nos cards antigos (vale o nome).</summary>
    public string ResponsavelId { get; set; } = string.Empty;
    /// <summary>Vendedor (cadastro) que atende a oportunidade.</summary>
    public string VendedorId { get; set; } = string.Empty;
    /// <summary>ISO 8601: quando entrou na etapa atual (para "dias parado" e temperatura).</summary>
    public string EntrouNaEtapaEm { get; set; } = string.Empty;
    public string ProximaAcao { get; set; } = string.Empty;
    /// <summary>yyyy-MM-dd.</summary>
    public string ProximaAcaoEm { get; set; } = string.Empty;
    public string ProximaAcaoDetalhe { get; set; } = string.Empty;
    public string MotivoPerda { get; set; } = string.Empty;
    public List<AnotacaoOportunidade> Anotacoes { get; set; } = new();
    public List<ValorCampoCustomizado> CamposValores { get; set; } = new();
}

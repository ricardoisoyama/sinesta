using Elrond.Domain.Common;

namespace Elrond.Domain.Entities;

/// <summary>Um custo lançado no item (tipo de custo do cadastro + valor desta operação).</summary>
public class CustoItemProposta
{
    public string TipoCustoId { get; set; } = string.Empty;
    public string Nome { get; set; } = string.Empty;
    /// <summary>"valor" | "percentual".</summary>
    public string Modo { get; set; } = "valor";
    /// <summary>Base do percentual: "nf" | "servico" (só quando Modo = percentual).</summary>
    public string Base { get; set; } = string.Empty;
    /// <summary>Fração informada quando percentual (0,02 = 2%).</summary>
    public decimal Percentual { get; set; }
    /// <summary>Valor em reais que entrou no custo do item.</summary>
    public decimal Valor { get; set; }
}

/// <summary>
/// Retrato de um campo de "Dados da operação" no dia em que o item entrou na proposta.
/// Mudar ou remover o campo depois não altera a proposta feita.
/// </summary>
public class DadoOperacaoItem
{
    public string CampoId { get; set; } = string.Empty;
    public string Chave { get; set; } = string.Empty;
    public string Nome { get; set; } = string.Empty;
    public string Tipo { get; set; } = string.Empty;
    public string Efeito { get; set; } = string.Empty;
    /// <summary>Como aparece (nome do cliente escolhido, data, opção da lista...).</summary>
    public string Texto { get; set; } = string.Empty;
    /// <summary>Valor numérico quando o campo é número, valor ou percentual.</summary>
    public decimal Numero { get; set; }
}

/// <summary>Uma coluna da ficha técnica no retrato do item (valor do dia).</summary>
public class FichaComposicaoItem
{
    public string Nome { get; set; } = string.Empty;
    public string Tipo { get; set; } = string.Empty;
    public decimal Valor { get; set; }
    public string Texto { get; set; } = string.Empty;
    public bool CompoeTotal { get; set; }
}

/// <summary>Uma linha de custo do item: ficha técnica × quantidade, com a composição do dia.</summary>
public class FichaItemProposta
{
    /// <summary>Id do item da ficha (nome histórico do campo).</summary>
    public string FichaId { get; set; } = string.Empty;
    public string Nome { get; set; } = string.Empty;
    /// <summary>Nome da ficha (pasta) no dia: "Funcionários", "Tecnologia".</summary>
    public string Grupo { get; set; } = string.Empty;
    public decimal Quantidade { get; set; }
    public decimal CustoUnitario { get; set; }
    public decimal Total { get; set; }
    public List<FichaComposicaoItem>? Composicao { get; set; }
}

/// <summary>Item de uma proposta (uma linha de precificação já calculada).</summary>
public class ItemProposta
{
    public string Id { get; set; } = string.Empty;
    public string Descricao { get; set; } = string.Empty;
    /// <summary>Serviço vendido (cadastro de Serviços). Trava a edição do serviço já usado.</summary>
    public string ServicoId { get; set; } = string.Empty;
    public string EmpresaId { get; set; } = string.Empty;
    public decimal CustoTotal { get; set; }
    public decimal Lucro { get; set; }
    public decimal Desconto { get; set; }
    public decimal Pv { get; set; }
    public decimal PrecoFinal { get; set; }
    public decimal Ml { get; set; }
    /// <summary>Comissão usada no item (fração). Pode ser menor que a padrão para chegar no preço. 0 nos itens antigos.</summary>
    public decimal Comissao { get; set; }
    /// <summary>DF% e DV sem lucro usados no item (fração), para a conferência do resultado. 0 nos itens antigos.</summary>
    public decimal DfPct { get; set; }
    public decimal DvSem { get; set; }
    /// <summary>Retrato dos Dados da operação (Pricing com campos parametrizáveis). Nulo nos itens antigos.</summary>
    public List<DadoOperacaoItem>? DadosOperacao { get; set; }
    /// <summary>Retrato das fichas técnicas usadas como custo. Nulo nos itens antigos.</summary>
    public List<FichaItemProposta>? Fichas { get; set; }
    /// <summary>Custo efetivamente executado (lançado depois da aprovação). 0 = ainda não informado.</summary>
    public decimal CustoReal { get; set; }
    /// <summary>Preço que o motor calculou, antes de o vendedor digitar um preço menor. 0 = não editado.</summary>
    public decimal PrecoCalculado { get; set; }
    /// <summary>Custos lançados (memória do que compôs o custo total).</summary>
    public List<CustoItemProposta> Custos { get; set; } = new();
    /// <summary>true quando a margem ficou abaixo do markup mínimo da empresa.</summary>
    public bool AbaixoMinimo { get; set; }
}

/// <summary>Contador de propostas da empresa que tem prefixo próprio (último número emitido).</summary>
public class NumeracaoProposta
{
    public string EmpresaId { get; set; } = string.Empty;
    public long Ultimo { get; set; }
}

/// <summary>Assinatura de um aprovador na proposta (compliance).</summary>
public class AprovacaoProposta
{
    public string UsuarioId { get; set; } = string.Empty;
    public string Nome { get; set; } = string.Empty;
    /// <summary>Data e hora da aprovação (ISO 8601).</summary>
    public string Em { get; set; } = string.Empty;
}

/// <summary>Proposta comercial (agrupa itens precificados).</summary>
public class Proposta : Rastreavel, IEntity
{
    public string Id { get; set; } = string.Empty;
    public string Numero { get; set; } = string.Empty;
    public string Cliente { get; set; } = string.Empty;
    /// <summary>Cliente do cadastro (uuid). Vazio nas propostas antigas, digitadas à mão.</summary>
    public string ClienteId { get; set; } = string.Empty;
    /// <summary>Vendedor responsável (cadastro de Vendedores) e o nome na época.</summary>
    public string VendedorId { get; set; } = string.Empty;
    public string VendedorNome { get; set; } = string.Empty;
    /// <summary>rascunho | pendente | enviada | aprovada | recusada.</summary>
    public string Status { get; set; } = "rascunho";
    public string Data { get; set; } = string.Empty;
    public decimal Total { get; set; }
    /// <summary>Modelo de proposta escolhido na geração (para o PDF).</summary>
    public string? ModeloId { get; set; }
    /// <summary>Prazo de entrega informado na precificação (texto livre, ex.: "3 dias úteis").</summary>
    public string PrazoEntrega { get; set; } = string.Empty;
    /// <summary>Validade escolhida na precificação (ex.: "15 dias").</summary>
    public string Validade { get; set; } = string.Empty;
    /// <summary>Forma de pagamento (vem do cadastro do cliente; ex.: "Boleto").</summary>
    public string FormaPagamento { get; set; } = string.Empty;
    /// <summary>Prazo de pagamento em dias (vem do cadastro do cliente). 0 = à vista.</summary>
    public int PrazoPagamentoDias { get; set; }
    public List<ItemProposta> Itens { get; set; } = new();

    // ── Alçada (preço editado ou margem abaixo do mínimo) ───────────────────
    /// <summary>Soma dos preços calculados pelo motor, antes da edição. 0 = sem edição.</summary>
    public decimal PrecoOriginal { get; set; }
    /// <summary>Motivo informado por quem pediu o preço fora do cálculo.</summary>
    public string Justificativa { get; set; } = string.Empty;
    /// <summary>Por que ficou pendente: "preco-editado" | "abaixo-markup-minimo" | "" (não ficou).</summary>
    public string MotivoAprovacao { get; set; } = string.Empty;
    /// <summary>Regra de alçada aplicada quando a aprovação foi solicitada.</summary>
    public string RegraId { get; set; } = string.Empty;
    /// <summary>Quem já assinou. A proposta só é aprovada quando todos os exigidos assinam.</summary>
    public List<AprovacaoProposta> Aprovacoes { get; set; } = new();
}

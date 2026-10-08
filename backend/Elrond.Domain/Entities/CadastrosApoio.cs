using Elrond.Domain.Common;

namespace Elrond.Domain.Entities;

/// <summary>Serviço oferecido (Consultoria mensal, Suporte técnico, ...). Sai na proposta.</summary>
public class Servico : Rastreavel, IEntity, IInativavel
{
    public string Id { get; set; } = string.Empty;
    public string Nome { get; set; } = string.Empty;
    public string Status { get; set; } = "ativo";
}

/// <summary>Tipo de custo pré-cadastrado para usar na precificação (Mão de obra, Deslocamento, ...).</summary>
public class TipoCusto : Rastreavel, IEntity, IInativavel
{
    public string Id { get; set; } = string.Empty;
    public string Nome { get; set; } = string.Empty;
    /// <summary>"valor" (R$) ou "percentual".</summary>
    public string Modo { get; set; } = "valor";
    /// <summary>Valor pré-cadastrado: R$ quando Modo = valor; fração (0,02 = 2%) quando percentual.</summary>
    public decimal Valor { get; set; }
    /// <summary>Base do percentual: "nf" (valor da NF informado) ou "servico" (preço do serviço).</summary>
    public string BasePercentual { get; set; } = "nf";
    public string Status { get; set; } = "ativo";
}

/// <summary>Categoria de despesa (classifica os custos fixos e aponta a conta padrão).</summary>
public class CategoriaCusto : Rastreavel, IEntity, IInativavel
{
    public string Id { get; set; } = string.Empty;
    public string Nome { get; set; } = string.Empty;
    /// <summary>Conta do plano de contas sugerida para despesas desta categoria.</summary>
    public string PlanoContaId { get; set; } = string.Empty;
    public string Status { get; set; } = "ativo";
}

/// <summary>Validade de proposta pré-cadastrada (ex.: "15 dias").</summary>
public class ValidadeProposta : Rastreavel, IEntity, IInativavel
{
    public string Id { get; set; } = string.Empty;
    public string Descricao { get; set; } = string.Empty;
    public string Status { get; set; } = "ativo";
}

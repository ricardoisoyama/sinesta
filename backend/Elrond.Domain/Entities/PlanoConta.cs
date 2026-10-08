using Elrond.Domain.Common;

namespace Elrond.Domain.Entities;

public class PlanoConta : Rastreavel, IEntity, IInativavel
{
    public string Id { get; set; } = string.Empty;
    public string Codigo { get; set; } = string.Empty;
    public string Nome { get; set; } = string.Empty;
    /// <summary>Conta-mãe; null = conta raiz.</summary>
    public string? PaiId { get; set; }
    /// <summary>'Despesa' ou 'Receita'.</summary>
    public string GrupoDre { get; set; } = "Despesa";
    public string? ContaContabil { get; set; }
    /// <summary>Linha do DRE em que a conta entra (ex.: "Receita Bruta de Vendas", "Despesas com Pessoal").</summary>
    public string ContaDre { get; set; } = string.Empty;
    public decimal? LimiteGasto { get; set; }
    /// <summary>"fixa" | "variavel" | vazio (não informado).</summary>
    public string? Tipo { get; set; }
    public string Status { get; set; } = "ativo";
}

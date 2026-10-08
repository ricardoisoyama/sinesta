using Elrond.Domain.Common;

namespace Elrond.Domain.Entities;

/// <summary>
/// Meta de faturamento de uma empresa num ano, mês a mês. Além de acompanhar o realizado,
/// ela compõe o markup: o DF% é o custo fixo mensal dividido pela média mensal da meta.
/// </summary>
public class Meta : Rastreavel, IEntity, IInativavel
{
    public string Id { get; set; } = string.Empty;
    /// <summary>"ativo" | "inativo" (meta nunca é apagada; inativar tira da tela).</summary>
    public string Status { get; set; } = "ativo";
    public string Nome { get; set; } = string.Empty;
    /// <summary>Empresa da meta. Vazio nos cenários antigos (não entram no markup).</summary>
    public string EmpresaId { get; set; } = string.Empty;
    /// <summary>Total do ano. Com os 12 meses preenchidos, é sempre a soma deles.</summary>
    public decimal MetaAnual { get; set; }
    /// <summary>Meta de cada mês, janeiro a dezembro (R$). Vazio nos registros antigos.</summary>
    public List<decimal> ValoresMensais { get; set; } = new();
    /// <summary>Com mais de uma meta ativa da empresa no ano, esta é a que compõe o markup.</summary>
    public bool Principal { get; set; }
    /// <summary>Ano da meta. 0 nos registros antigos = ano corrente.</summary>
    public int Ano { get; set; }

    /// <summary>Total que vale: a soma dos meses quando eles existem; senão o anual digitado.</summary>
    public decimal TotalDoAno => ValoresMensais is { Count: 12 } ? ValoresMensais.Sum() : MetaAnual;
}

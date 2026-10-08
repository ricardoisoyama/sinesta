using Elrond.Domain.Common;

namespace Elrond.Domain.Entities;

public class Taxa : Rastreavel, IEntity, IInativavel
{
    public string Id { get; set; } = string.Empty;
    public string Nome { get; set; } = string.Empty;
    /// <summary>'percentual' (fração sobre a NF) ou 'fixo' (R$).</summary>
    public string Tipo { get; set; } = "percentual";
    public decimal Valor { get; set; }
    public string Status { get; set; } = "ativo";
}

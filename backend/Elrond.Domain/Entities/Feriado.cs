using Elrond.Domain.Common;

namespace Elrond.Domain.Entities;

/// <summary>
/// Feriado do cadastro (estadual, municipal, ponto facultativo da empresa). Os nacionais e bancários o
/// sistema já sabe (<see cref="Regras.DiasUteis"/>). "Todo ano" vale no mesmo dia e mês de cada ano.
/// </summary>
public class Feriado : Rastreavel, IEntity, IInativavel
{
    public string Id { get; set; } = string.Empty;
    /// <summary>yyyy-MM-dd (o ano não importa quando é todo ano).</summary>
    public string Data { get; set; } = string.Empty;
    public string Nome { get; set; } = string.Empty;
    public bool TodoAno { get; set; } = true;
    public string Status { get; set; } = "ativo";
}

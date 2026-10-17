using Elrond.Domain.Common;

namespace Elrond.Domain.Entities;

/// <summary>
/// Alíquota de ICMS do transporte por UF de origem × destino (tabela única do sistema, pré-cadastrada
/// da tbdICMS da ESL). O campo ICMS dos Dados da Operação busca aqui; empresa do Simples não usa.
/// </summary>
public class AliquotaIcms : Rastreavel, IEntity
{
    /// <summary>"SP-RJ": origem e destino.</summary>
    public string Id { get; set; } = string.Empty;
    public string UfOrigem { get; set; } = string.Empty;
    public string UfDestino { get; set; } = string.Empty;
    /// <summary>Fração: 0,12 = 12%. 0 = isento.</summary>
    public decimal Aliquota { get; set; }
    /// <summary>Base legal ou motivo da exceção (opcional).</summary>
    public string Fundamentacao { get; set; } = string.Empty;
}

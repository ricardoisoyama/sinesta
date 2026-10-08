using Elrond.Domain.Common;

namespace Elrond.Domain.Entities;

/// <summary>Município brasileiro (base IBGE). Id = código IBGE.</summary>
public class Cidade : IEntity
{
    public string Id { get; set; } = string.Empty;
    public string Nome { get; set; } = string.Empty;
    public string Uf { get; set; } = string.Empty;
    /// <summary>Nome normalizado para busca (minúsculo, sem acentos).</summary>
    public string Busca { get; set; } = string.Empty;
}

using Elrond.Application.Common;
using Elrond.Application.DTOs;

namespace Elrond.Application.Interfaces;

public interface IPricingService
{
    Task<Result<CalcularPrecoResponse>> CalcularAsync(CalcularPrecoRequest req);
}

/// <summary>Motor do fator/markup de uma empresa (tela da empresa, Pricing e o que mais precisar).</summary>
public interface IFatorService
{
    Task<Result<FatorResultado>> CalcularAsync(CalcularFatorRequest req);
}

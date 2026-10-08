using Elrond.Application.Common;
using Elrond.Domain.Entities;

namespace Elrond.Application.Interfaces;

/// <summary>Regras do CRM: região do vendedor, ganho automático quando a proposta é aprovada.</summary>
public interface IOportunidadeService
{
    /// <summary>Vendedor bloqueado na região do cliente não pode ficar com a oportunidade.</summary>
    Task<Result> ValidarRegiaoAsync(Oportunidade op);
    /// <summary>Move para a etapa de ganho os cards ligados a esta proposta (automação "ganho").</summary>
    Task MarcarGanhoPorPropostaAsync(string propostaNumero);
}

using Elrond.Application.Common;
using Elrond.Application.DTOs;
using Elrond.Domain.Entities;

namespace Elrond.Application.Interfaces;

/// <summary>Regras de negócio da proposta: criação, alçada, aprovação, status e custo realizado.</summary>
public interface IPropostaService
{
    Task<Result<Proposta>> CriarAsync(CriarPropostaDto dto, UsuarioAtual quem);
    /// <summary>Reescreve uma proposta em RASCUNHO (itens, condições); número e data ficam. Passa pelas mesmas regras da criação.</summary>
    Task<Result<Proposta>> AtualizarAsync(string id, CriarPropostaDto dto, UsuarioAtual quem);
    /// <summary>Assina a aprovação; vira "aprovada" quando todos os aprovadores exigidos assinaram.</summary>
    Task<Result<Proposta>> AprovarAsync(string id, UsuarioAtual quem);
    /// <summary>Lança o custo realizado dos itens. Preço, margem e custos orçados não mudam por aqui.</summary>
    Task<Result<Proposta>> AtualizarCustoRealAsync(string id, List<ItemProposta> itens);
    /// <summary>Muda o status. "aprovada" só pela aprovação formal; pendente só sai pela mão de um aprovador.</summary>
    Task<Result<Proposta>> AlterarStatusAsync(string id, string status, UsuarioAtual quem);
}

using Elrond.Domain.Entities;

namespace Elrond.Application.DTOs;

/// <summary>
/// Payload para criar uma proposta (número/data/status gerados no servidor).
/// Fica PENDENTE quando algum item teve o preço editado ou ficou abaixo do markup mínimo
/// e quem criou não é gestor (a justificativa é obrigatória nesses casos).
/// </summary>
public record CriarPropostaDto(
    string Cliente,
    List<ItemProposta> Itens,
    decimal Total,
    string? ModeloId = null,
    string? PrazoEntrega = null,
    string? Validade = null,
    decimal PrecoOriginal = 0,
    string? Justificativa = null,
    string? FormaPagamento = null,
    string? ClienteId = null,
    string? VendedorId = null,
    string? VendedorNome = null,
    int PrazoPagamentoDias = 0
);

public record StatusPropostaDto(string Status);

/// <summary>
/// Quem está operando. Perfil e permissões vêm do BANCO (não do token), para que
/// rebaixar ou desativar um usuário valha na hora. PodeAprovar = tem "/propostas/aprovar".
/// </summary>
public record UsuarioAtual(string Id, string Nome, string Perfil, bool PodeAprovar = false)
{
    public bool EhGestor => Perfil == "Gestor";
}

using Elrond.Application.Common;
using Elrond.Application.DTOs;
using Elrond.Domain.Entities;

namespace Elrond.Application.Interfaces;

/// <summary>Regra de Compras: limite por comprador, com exceções de fornecedor.</summary>
public interface ICompraService
{
    /// <summary>
    /// Confere se quem está lançando a despesa pode comprar aquele valor daquele fornecedor.
    /// Falha com a mensagem que diz o limite e quem aprova.
    /// </summary>
    Task<Result> ValidarLimiteAsync(CustoFixo custo, UsuarioAtual quem);
}

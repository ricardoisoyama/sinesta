using Elrond.Application.Common;
using Elrond.Application.DTOs;
using Elrond.Domain.Entities;

namespace Elrond.Application.Interfaces;

/// <summary>
/// O que o usuário enxerga: gestor (ou quem não é vendedor) vê tudo; vendedor vê só a
/// própria carteira — clientes em que é SDR/Sales/CS, e as propostas e cards desses clientes
/// ou em que é o vendedor.
/// </summary>
public sealed class CarteiraVisao
{
    public static readonly CarteiraVisao Tudo = new(true, new HashSet<string>(), new HashSet<string>());

    public CarteiraVisao(bool veTudo, HashSet<string> vendedorIds, HashSet<string> clienteIds)
    {
        VeTudo = veTudo;
        VendedorIds = vendedorIds;
        ClienteIds = clienteIds;
    }

    public bool VeTudo { get; }
    public HashSet<string> VendedorIds { get; }
    public HashSet<string> ClienteIds { get; }

    public bool VeCliente(Cliente c) => VeTudo || ClienteIds.Contains(c.Id);
    public bool VeProposta(Proposta p) => VeTudo || VendedorIds.Contains(p.VendedorId) || ClienteIds.Contains(p.ClienteId);
    public bool VeOportunidade(Oportunidade o) => VeTudo || VendedorIds.Contains(o.VendedorId) || ClienteIds.Contains(o.ClienteId);
}

public interface ICarteiraService
{
    /// <summary>Transfere a carteira de clientes de um vendedor para outro; devolve quantos clientes mudaram.</summary>
    Task<Result<int>> TransferirAsync(string deVendedorId, string paraVendedorId);

    /// <summary>
    /// Move os clientes escolhidos, função a função (SDR, Sales, CS podem ser vendedores
    /// diferentes, como no cadastro). Função nula/vazia = mantém. Devolve quantos clientes mudaram.
    /// </summary>
    Task<Result<int>> TransferirClientesAsync(IReadOnlyList<string> clienteIds, string? sdrId, string? salesId, string? csId);

    /// <summary>Visão de carteira do usuário logado.</summary>
    Task<CarteiraVisao> VisaoAsync(UsuarioAtual quem);
}

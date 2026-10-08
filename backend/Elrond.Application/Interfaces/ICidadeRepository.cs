using Elrond.Domain.Entities;

namespace Elrond.Application.Interfaces;

public interface ICidadeRepository
{
    /// <summary>Busca cidades pelo nome (sem acento, contém), priorizando as que começam com o termo.</summary>
    Task<IReadOnlyList<Cidade>> BuscarAsync(string termo, int limite, CancellationToken ct = default);

    /// <summary>Cidade pelo código do IBGE (o Id da tabela). Null = não encontrada.</summary>
    Task<Cidade?> PorIbgeAsync(string ibge, CancellationToken ct = default);
}

using Elrond.Application.Interfaces;
using Elrond.Domain.Entities;
using Elrond.Domain.Regras;
using Elrond.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Elrond.Infrastructure.Repositories;

public class CidadeRepository : ICidadeRepository
{
    private readonly AppDbContext _db;

    public CidadeRepository(AppDbContext db) => _db = db;

    public async Task<IReadOnlyList<Cidade>> BuscarAsync(string termo, int limite, string? uf = null, CancellationToken ct = default)
    {
        var (ufBusca, q) = BuscaCidade.Interpretar(termo, uf);
        if (q.Length < 2) return Array.Empty<Cidade>();

        var cidades = _db.Cidades.AsNoTracking().Where(c => c.Busca.Contains(q));
        if (ufBusca.Length > 0) cidades = cidades.Where(c => c.Uf == ufBusca);
        return await cidades
            .OrderBy(c => c.Busca.StartsWith(q) ? 0 : 1)
            .ThenBy(c => c.Nome)
            .Take(limite)
            .ToListAsync(ct);
    }

    public Task<Cidade?> PorIbgeAsync(string ibge, CancellationToken ct = default) =>
        _db.Cidades.AsNoTracking().FirstOrDefaultAsync(c => c.Id == ibge, ct);
}

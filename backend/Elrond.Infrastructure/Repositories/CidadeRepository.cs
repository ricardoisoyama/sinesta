using Elrond.Application.Interfaces;
using Elrond.Domain.Common;
using Elrond.Domain.Entities;
using Elrond.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Elrond.Infrastructure.Repositories;

public class CidadeRepository : ICidadeRepository
{
    private readonly AppDbContext _db;

    public CidadeRepository(AppDbContext db) => _db = db;

    public async Task<IReadOnlyList<Cidade>> BuscarAsync(string termo, int limite, CancellationToken ct = default)
    {
        var q = Textos.Normalizar(termo);
        if (q.Length < 2) return Array.Empty<Cidade>();

        return await _db.Cidades.AsNoTracking()
            .Where(c => c.Busca.Contains(q))
            .OrderBy(c => c.Busca.StartsWith(q) ? 0 : 1)
            .ThenBy(c => c.Nome)
            .Take(limite)
            .ToListAsync(ct);
    }

    public Task<Cidade?> PorIbgeAsync(string ibge, CancellationToken ct = default) =>
        _db.Cidades.AsNoTracking().FirstOrDefaultAsync(c => c.Id == ibge, ct);
}

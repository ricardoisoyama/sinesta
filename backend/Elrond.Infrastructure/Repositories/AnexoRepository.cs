using Elrond.Application.Interfaces;
using Elrond.Domain.Entities;
using Elrond.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Elrond.Infrastructure.Repositories;

public class AnexoRepository : IAnexoRepository
{
    private readonly AppDbContext _db;

    public AnexoRepository(AppDbContext db) => _db = db;

    public Task<List<Anexo>> ListarAsync(string entidade, string entidadeId) =>
        _db.Anexos.AsNoTracking()
            .Where(a => a.Entidade == entidade && a.EntidadeId == entidadeId && a.InativadoEm == "")
            .OrderByDescending(a => a.Em)
            .ToListAsync();

    public Task<Anexo?> GetByIdAsync(string id) =>
        _db.Anexos.AsNoTracking().FirstOrDefaultAsync(a => a.Id == id);

    public async Task AddAsync(Anexo anexo)
    {
        _db.Anexos.Add(anexo);
        await _db.SaveChangesAsync();
    }

    public async Task UpdateAsync(Anexo anexo)
    {
        _db.Anexos.Update(anexo);
        await _db.SaveChangesAsync();
        _db.Entry(anexo).State = EntityState.Detached;
    }
}

using Elrond.Application.Interfaces;
using Elrond.Domain.Entities;
using Elrond.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Elrond.Infrastructure.Repositories;

public class UsuarioRepository : IUsuarioRepository
{
    private readonly AppDbContext _db;

    public UsuarioRepository(AppDbContext db) => _db = db;

    public async Task<List<User>> GetAllAsync() =>
        await _db.Users.OrderBy(u => u.Name).ToListAsync();

    public async Task<User?> GetByIdAsync(string id) =>
        Guid.TryParse(id, out var guid)
            ? await _db.Users.FirstOrDefaultAsync(u => u.Id == guid)
            : null;

    public async Task AddAsync(User user)
    {
        _db.Users.Add(user);
        await _db.SaveChangesAsync();
    }

    public async Task SaveAsync() => await _db.SaveChangesAsync();
}

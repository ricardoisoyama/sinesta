using Elrond.Application.Interfaces;
using Elrond.Domain.Entities;
using Elrond.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Elrond.Infrastructure.Repositories;

public class UserRepository : IUserRepository
{
    private readonly AppDbContext _db;

    public UserRepository(AppDbContext db) => _db = db;

    public async Task<User?> FindByEmailAsync(string email)
    {
        var normalized = email.ToLowerInvariant().Trim();
        return await _db.Users.FirstOrDefaultAsync(u => u.Email == normalized);
    }

    public async Task<User?> FindByIdAsync(Guid id) => await _db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == id);
}

using Elrond.Domain.Entities;

namespace Elrond.Application.Interfaces;

public interface IUsuarioRepository
{
    Task<List<User>> GetAllAsync();
    Task<User?> GetByIdAsync(string id);
    Task AddAsync(User user);
    Task SaveAsync();
}

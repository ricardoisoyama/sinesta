using Elrond.Domain.Entities;

namespace Elrond.Application.Interfaces;

public interface IUserRepository
{
    Task<User?> FindByEmailAsync(string email);
    Task<User?> FindByIdAsync(Guid id);
}

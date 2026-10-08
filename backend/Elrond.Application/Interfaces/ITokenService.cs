using Elrond.Domain.Entities;

namespace Elrond.Application.Interfaces;

public interface ITokenService
{
    (string Token, DateTime ExpiresAt) GenerateToken(User user);
}

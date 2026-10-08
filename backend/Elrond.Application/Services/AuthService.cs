using Elrond.Application.Common;
using Elrond.Application.DTOs;
using Elrond.Application.Interfaces;

namespace Elrond.Application.Services;

public class AuthService : IAuthService
{
    private readonly IUserRepository _users;
    private readonly IPasswordHasher _hasher;
    private readonly ITokenService _tokens;
    private readonly IAuditoriaService _auditoria;

    public AuthService(IUserRepository users, IPasswordHasher hasher, ITokenService tokens, IAuditoriaService auditoria)
    {
        _users = users;
        _hasher = hasher;
        _tokens = tokens;
        _auditoria = auditoria;
    }

    public async Task<Result<LoginResponseDto>> LoginAsync(LoginDto dto)
    {
        var user = await _users.FindByEmailAsync(dto.Email);

        if (user is null || !user.Ativo || !_hasher.Verify(dto.Password, user.PasswordHash))
        {
            // Fica na trilha (com o e-mail tentado) para enxergar tentativas de invasão.
            await _auditoria.RegistrarAsync("login-falhou", "Usuario", user?.Id.ToString() ?? string.Empty,
                $"Tentativa de login recusada para {dto.Email.Trim().ToLowerInvariant()}",
                quem: new UsuarioAtual(string.Empty, dto.Email.Trim().ToLowerInvariant(), string.Empty));
            return Result.Failure<LoginResponseDto>("Credenciais inválidas.");
        }

        var (token, expiresAt) = _tokens.GenerateToken(user);
        var permissoes = Funcionalidades.Efetivas(user.Perfil, user.Permissoes);
        var response = new LoginResponseDto(token, user.Email, user.Name, user.Perfil, permissoes, expiresAt);

        await _auditoria.RegistrarAsync("login", "Usuario", user.Id.ToString(), $"{user.Name} entrou no sistema",
            quem: new UsuarioAtual(user.Id.ToString(), user.Name, user.Perfil));
        return Result.Success(response);
    }
}

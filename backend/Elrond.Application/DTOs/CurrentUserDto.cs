namespace Elrond.Application.DTOs;

/// <summary>Dados do usuário autenticado (retorno de /auth/me).</summary>
public record CurrentUserDto(
    string Email,
    string Name,
    string Perfil,
    IReadOnlyList<string> Permissoes
);

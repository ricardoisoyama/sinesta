namespace Elrond.Application.DTOs;

public record LoginResponseDto(
    string Token,
    string Email,
    string Name,
    string Perfil,
    IReadOnlyList<string> Permissoes,
    DateTime ExpiresAt
);

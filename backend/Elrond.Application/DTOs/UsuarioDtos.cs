namespace Elrond.Application.DTOs;

/// <summary>
/// Funcionário exposto pela API de cadastro (sem hash de senha). O usuário do portal
/// e o funcionário são o mesmo registro: acesso e dados de RH no mesmo lugar.
/// </summary>
public record UsuarioDto(
    string Id,
    string Nome,
    string Email,
    string Perfil,
    IReadOnlyList<string> Permissoes,
    string Status,
    string Cargo,
    string Departamento,
    string Cpf,
    string Rg,
    string Telefone,
    string DataAdmissao
);

/// <summary>Payload para criar/editar funcionário. Senha: no create define a senha; no edit, vazio = manter.</summary>
public record SalvarUsuarioDto(
    string Nome,
    string Email,
    string Perfil,
    List<string> Permissoes,
    string Status,
    string? Senha = null,
    string Cargo = "",
    string Departamento = "",
    string Cpf = "",
    string Rg = "",
    string Telefone = "",
    string DataAdmissao = ""
);

namespace Elrond.Domain.Entities;

/// <summary>
/// Usuário do portal ELROND. Entidade de domínio pura (sem ORM/BCrypt).
/// Perfil = Gestor | Colaborador; Permissoes = chaves das funcionalidades liberadas (RBAC).
/// </summary>
public class User
{
    public Guid Id { get; private set; }
    public string Email { get; private set; } = string.Empty;
    public string Name { get; private set; } = string.Empty;
    public string PasswordHash { get; private set; } = string.Empty;
    public string Perfil { get; private set; } = "Colaborador";
    public List<string> Permissoes { get; private set; } = new();
    public bool Ativo { get; private set; } = true;
    public DateTime CreatedAt { get; private set; }

    // ── Dados de RH (o usuário do portal é o funcionário) ───────────────────
    public string Cargo { get; private set; } = string.Empty;
    public string Departamento { get; private set; } = string.Empty;
    public string Cpf { get; private set; } = string.Empty;
    public string Rg { get; private set; } = string.Empty;
    public string Telefone { get; private set; } = string.Empty;
    /// <summary>Data de admissão (yyyy-MM-dd). Vazio = não informada.</summary>
    public string DataAdmissao { get; private set; } = string.Empty;

    private User() { } // EF Core

    public User(string email, string name, string passwordHash, string perfil, IEnumerable<string> permissoes, bool ativo = true)
    {
        Id = Guid.NewGuid();
        Email = email.ToLowerInvariant().Trim();
        Name = name;
        PasswordHash = passwordHash;
        Perfil = perfil;
        Permissoes = permissoes.ToList();
        Ativo = ativo;
        CreatedAt = DateTime.UtcNow;
    }

    /// <summary>Atualiza os dados de cadastro (não mexe na senha).</summary>
    public void AtualizarCadastro(string email, string name, string perfil, IEnumerable<string> permissoes, bool ativo)
    {
        Email = email.ToLowerInvariant().Trim();
        Name = name;
        Perfil = perfil;
        Permissoes = permissoes.ToList();
        Ativo = ativo;
    }

    /// <summary>Atualiza os dados de RH do funcionário.</summary>
    public void AtualizarDadosRh(string cargo, string departamento, string cpf, string rg, string telefone, string dataAdmissao)
    {
        Cargo = cargo;
        Departamento = departamento;
        Cpf = cpf;
        Rg = rg;
        Telefone = telefone;
        DataAdmissao = dataAdmissao;
    }

    /// <summary>Define uma nova senha (já com hash).</summary>
    public void DefinirSenha(string passwordHash) => PasswordHash = passwordHash;
}

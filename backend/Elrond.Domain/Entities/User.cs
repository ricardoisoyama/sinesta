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
    /// <summary>Cidade do funcionário ("Santos - SP"); a rua e o número ficam em <see cref="Endereco"/>.</summary>
    public string Cidade { get; private set; } = string.Empty;
    public Endereco? Endereco { get; private set; }
    /// <summary>Conta para pagamento (salário, reembolso).</summary>
    public DadosBancarios? Banco { get; private set; }

    // ── Convite por e-mail: a pessoa cria a própria senha pelo link ───────────
    /// <summary>SHA-256 do token do link (o token em si só vai no e-mail). Vazio = sem convite aberto.</summary>
    public string ConviteTokenHash { get; private set; } = string.Empty;
    public DateTime? ConviteExpiraEm { get; private set; }
    public DateTime? ConviteEnviadoEm { get; private set; }
    /// <summary>"enviado" ou "não enviado: motivo" (o servidor de e-mail aceitou ou não).</summary>
    public string ConviteEmail { get; private set; } = string.Empty;
    /// <summary>Primeira vez que o link foi aberto.</summary>
    public DateTime? ConviteClicadoEm { get; private set; }
    /// <summary>Quando a pessoa criou a senha pelo convite.</summary>
    public DateTime? ConviteAceitoEm { get; private set; }

    /// <summary>Layout do dashboard escolhido pela pessoa (JSON dos blocos); vazio = o padrão do ambiente.</summary>
    public string Dashboard { get; private set; } = string.Empty;

    public void DefinirDashboard(string? layout) => Dashboard = layout ?? string.Empty;

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

    /// <summary>Atualiza o endereço do funcionário.</summary>
    public void AtualizarEndereco(string cidade, Endereco? endereco)
    {
        Cidade = (cidade ?? string.Empty).Trim();
        Endereco = endereco;
    }

    /// <summary>Atualiza a conta bancária do funcionário.</summary>
    public void AtualizarDadosBancarios(DadosBancarios? banco) => Banco = banco;

    /// <summary>Define uma nova senha (já com hash).</summary>
    public void DefinirSenha(string passwordHash) => PasswordHash = passwordHash;

    /// <summary>Abre um convite novo (o anterior deixa de valer).</summary>
    public void AbrirConvite(string tokenHash, DateTime expiraEm)
    {
        ConviteTokenHash = tokenHash;
        ConviteExpiraEm = expiraEm;
        ConviteClicadoEm = null;
        ConviteAceitoEm = null;
        ConviteEmail = string.Empty;
    }

    public void RegistrarEnvioConvite(string situacao, DateTime em)
    {
        ConviteEmail = situacao.Length > 300 ? situacao[..300] : situacao;
        ConviteEnviadoEm = em;
    }

    public void RegistrarCliqueConvite(DateTime em) => ConviteClicadoEm ??= em;

    /// <summary>A pessoa criou a senha: o link deixa de valer.</summary>
    public void AceitarConvite(string passwordHash, DateTime em)
    {
        PasswordHash = passwordHash;
        ConviteAceitoEm = em;
        ConviteTokenHash = string.Empty;
        ConviteExpiraEm = null;
    }
}

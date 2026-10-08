using Elrond.Application.DTOs;
using Elrond.Application.Interfaces;
using Elrond.Application.Services;
using Elrond.Domain.Entities;
using Elrond.Infrastructure.Security;

namespace Elrond.Tests;

public class AuthServiceTests
{
    private sealed class FakeRepo : IUserRepository
    {
        private readonly User? _user;
        public FakeRepo(User? user) => _user = user;
        public Task<User?> FindByEmailAsync(string email) => Task.FromResult(_user);
    }

    private sealed class FakeToken : ITokenService
    {
        public (string Token, DateTime ExpiresAt) GenerateToken(User user) =>
            ("token-fake", DateTime.UtcNow.AddHours(8));
    }

    private sealed class FakeAuditoria : IAuditoriaService
    {
        public List<string> Acoes { get; } = new();
        public Task RegistrarAsync(string acao, string entidade, string entidadeId, string descricao, object? antes = null, object? depois = null, UsuarioAtual? quem = null)
        {
            Acoes.Add(acao);
            return Task.CompletedTask;
        }
        public Task<List<RegistroAuditoria>> ListarAsync(int limite, string? entidade = null, string? usuario = null, string? acao = null, string? entidadeId = null) =>
            Task.FromResult(new List<RegistroAuditoria>());
    }

    private static readonly IPasswordHasher Hasher = new BcryptPasswordHasher();

    private static User Gestor(bool ativo = true) =>
        new("admin@elrond.com.br", "Administrador", Hasher.Hash("elrond@2024"),
            "Gestor", new[] { "/dashboard", "/simulador" }, ativo);

    private static AuthService Sut(User? user, FakeAuditoria? auditoria = null) =>
        new(new FakeRepo(user), Hasher, new FakeToken(), auditoria ?? new FakeAuditoria());

    [Fact]
    public async Task Login_registra_sucesso_e_falha_na_auditoria()
    {
        var auditoria = new FakeAuditoria();
        await Sut(Gestor(), auditoria).LoginAsync(new LoginDto("admin@elrond.com.br", "elrond@2024"));
        await Sut(Gestor(), auditoria).LoginAsync(new LoginDto("admin@elrond.com.br", "errada"));

        Assert.Equal(new[] { "login", "login-falhou" }, auditoria.Acoes);
    }

    [Fact]
    public async Task Login_com_credenciais_validas_retorna_sucesso_com_perfil_e_permissoes()
    {
        var result = await Sut(Gestor()).LoginAsync(new LoginDto("admin@elrond.com.br", "elrond@2024"));

        Assert.True(result.IsSuccess);
        Assert.Equal("Gestor", result.Value!.Perfil);
        Assert.Contains("/simulador", result.Value.Permissoes);
        Assert.Equal("token-fake", result.Value.Token);
    }

    [Fact]
    public async Task Login_com_senha_errada_falha()
    {
        var result = await Sut(Gestor()).LoginAsync(new LoginDto("admin@elrond.com.br", "errada"));

        Assert.False(result.IsSuccess);
    }

    [Fact]
    public async Task Login_de_usuario_inativo_falha()
    {
        var result = await Sut(Gestor(ativo: false)).LoginAsync(new LoginDto("admin@elrond.com.br", "elrond@2024"));

        Assert.False(result.IsSuccess);
    }

    [Fact]
    public async Task Login_de_usuario_inexistente_falha()
    {
        var result = await Sut(null).LoginAsync(new LoginDto("naoexiste@elrond.com.br", "seja-la"));

        Assert.False(result.IsSuccess);
    }
}

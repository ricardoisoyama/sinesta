using System.Linq.Expressions;
using System.Text.RegularExpressions;
using Elrond.Application.DTOs;
using Elrond.Application.Interfaces;
using Elrond.Application.Services;
using Elrond.Domain.Common;
using Elrond.Domain.Entities;
using Elrond.Infrastructure.Security;
using Xunit;

namespace Elrond.Tests;

/// <summary>Convite por e-mail: link com token, clique, senha criada, reenvio invalida o anterior.</summary>
public class ConviteTests
{
    private static readonly IPasswordHasher Hasher = new BcryptPasswordHasher();
    private static readonly UsuarioAtual Gestor = new("g1", "Ana Gestora", "Gestor");

    private sealed class Usuarios(List<User> lista) : IUsuarioRepository
    {
        public Task<List<User>> GetAllAsync() => Task.FromResult(lista.ToList());
        public Task<User?> GetByIdAsync(string id) => Task.FromResult(lista.FirstOrDefault(u => u.Id.ToString() == id));
        public Task AddAsync(User user) { lista.Add(user); return Task.CompletedTask; }
        public Task SaveAsync() => Task.CompletedTask;
    }

    private sealed class Mem<T> : ICrudRepository<T> where T : class, IEntity
    {
        public List<T> Itens { get; } = new();
        public Task<List<T>> GetAllAsync() => Task.FromResult(Itens.ToList());
        public Task<List<T>> ListarAsync(Expression<Func<T, bool>> filtro) => Task.FromResult(Itens.Where(filtro.Compile()).ToList());
        public Task<T?> GetByIdAsync(string id) => Task.FromResult(Itens.FirstOrDefault(e => e.Id == id));
        public Task<T> AddAsync(T entity) { Itens.Add(entity); return Task.FromResult(entity); }
        public Task<List<T>> AddRangeAsync(List<T> entities) { Itens.AddRange(entities); return Task.FromResult(entities); }
        public Task<T?> UpdateAsync(string id, T entity) => Task.FromResult<T?>(entity);
        public Task SalvarLoteAsync(IReadOnlyList<T> novos, IReadOnlyList<T> alterados) { Itens.AddRange(novos); return Task.CompletedTask; }
        public Task<bool> DeleteAsync(string id) => Task.FromResult(Itens.RemoveAll(e => e.Id == id) > 0);
    }

    private sealed class Smtp : IEnvioSmtp
    {
        public List<MensagemEmail> Enviadas { get; } = new();
        public string? Falha { get; set; }
        public Task<string?> EnviarAsync(ServidorSmtp servidor, MensagemEmail mensagem, CancellationToken ct = default)
        {
            Enviadas.Add(mensagem);
            return Task.FromResult(Falha);
        }
    }

    private sealed class SemCofre : ICofreSegredos
    {
        public bool Configurado => false;
        public byte[] Fechar(string contexto, string valor) => Array.Empty<byte>();
        public string Abrir(string contexto, byte[] cifrado) => string.Empty;
    }

    private sealed class Auditoria : IAuditoriaService
    {
        public Task RegistrarAsync(string acao, string entidade, string entidadeId, string descricao, object? antes = null, object? depois = null, UsuarioAtual? quem = null) => Task.CompletedTask;
        public Task<List<RegistroAuditoria>> ListarAsync(int limite, string? entidade = null, string? usuario = null, string? acao = null, string? entidadeId = null) =>
            Task.FromResult(new List<RegistroAuditoria>());
    }

    private static (ConviteService Svc, User U, Smtp Smtp) Montar()
    {
        var u = new User("bia@empresa.com.br", "Bia", Hasher.Hash(ConviteService.SenhaDeQuemFoiConvidado()), "Colaborador", new[] { "/dashboard" });
        var smtp = new Smtp();
        var config = new Mem<ConfiguracaoSmtp>();
        config.Itens.Add(new ConfiguracaoSmtp { Host = "smtp.exemplo.com", Ativo = true, SomenteTeste = false, RemetenteEmail = "elrond@exemplo.com" });
        var email = new EmailService(config, new Mem<EmailEnviado>(), smtp, new SemCofre(), new Auditoria(), TimeProvider.System);
        return (new ConviteService(new Usuarios(new() { u }), Hasher, email, new Auditoria(), TimeProvider.System), u, smtp);
    }

    private static string TokenDo(MensagemEmail m) => Regex.Match(m.Texto, @"/convite/([A-Za-z0-9_-]+)").Groups[1].Value;

    [Fact]
    public async Task Convite_manda_link_registra_clique_e_a_senha_criada_entra()
    {
        var (svc, u, smtp) = Montar();
        var r = await svc.EnviarAsync(u, "https://aldrava.sinesta.com.br/qualquer/caminho", Gestor);
        Assert.True(r.IsSuccess, r.Error);
        var m = smtp.Enviadas.Single();
        Assert.Equal("bia@empresa.com.br", m.Para);
        Assert.Contains("https://aldrava.sinesta.com.br/convite/", m.Texto);
        Assert.Equal("enviado", ConviteService.Situacao(u, DateTime.UtcNow));
        var token = TokenDo(m);
        Assert.DoesNotContain(token, u.ConviteTokenHash); // o banco guarda só o hash

        var aberto = await svc.AbrirAsync(token);
        Assert.True(aberto.IsSuccess, aberto.Error);
        Assert.Equal(("Bia", "bia@empresa.com.br"), (aberto.Value!.Nome, aberto.Value.Email));
        Assert.Equal("clicou", ConviteService.Situacao(u, DateTime.UtcNow));

        Assert.Contains("8 caracteres", (await svc.AceitarAsync(token, "curta")).Error);
        var aceito = await svc.AceitarAsync(token, "senhaNova123");
        Assert.True(aceito.IsSuccess, aceito.Error);
        Assert.True(Hasher.Verify("senhaNova123", u.PasswordHash));
        Assert.Equal("aceito", ConviteService.Situacao(u, DateTime.UtcNow));
        // Link usado não vale de novo.
        Assert.False((await svc.AbrirAsync(token)).IsSuccess);
    }

    [Fact]
    public async Task Reenviar_invalida_o_link_anterior_e_falha_de_email_fica_registrada()
    {
        var (svc, u, smtp) = Montar();
        await svc.EnviarAsync(u, "https://bm.sinesta.com.br", Gestor);
        var primeiro = TokenDo(smtp.Enviadas[0]);
        smtp.Falha = "Username and Password not accepted";
        var r = await svc.EnviarAsync(u, "https://bm.sinesta.com.br", Gestor);
        Assert.False(r.IsSuccess);
        Assert.Equal("nao-enviado", ConviteService.Situacao(u, DateTime.UtcNow));
        Assert.False((await svc.AbrirAsync(primeiro)).IsSuccess);
        Assert.True((await svc.AbrirAsync(TokenDo(smtp.Enviadas[1]))).IsSuccess);
        Assert.Null(ConviteService.Base("javascript:alert(1)"));
        Assert.Equal("expirado", ConviteService.Situacao(u, DateTime.UtcNow.AddDays(8)));
    }
}

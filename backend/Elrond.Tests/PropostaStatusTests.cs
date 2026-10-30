using System.Linq.Expressions;
using System.Text.Json;
using Elrond.Application.Common;
using Elrond.Application.DTOs;
using Elrond.Application.Interfaces;
using Elrond.Application.Services;
using Elrond.Domain.Common;
using Elrond.Domain.Entities;

namespace Elrond.Tests;

public class PropostaStatusTests
{
    private static readonly UsuarioAtual Vendedor = new("u-vend", "Vendedor", "Usuario");
    private static readonly UsuarioAtual Aprovador = new("u-apr", "Aprovador", "Gestor", PodeAprovar: true);

    [Theory]
    [InlineData("rascunho")]
    [InlineData("recusada")]
    [InlineData("pendente")]
    public async Task Aprovada_volta_pela_mao_de_qualquer_um_e_zera_as_assinaturas(string novo)
    {
        var (service, repo) = Montar(new Proposta
        {
            Id = "p1", Numero = "SIN-0001", Status = "aprovada",
            Aprovacoes = { new AprovacaoProposta { UsuarioId = "u-apr", Nome = "Aprovador", Em = "2026-10-30T10:00:00Z" } },
        });

        var r = await service.AlterarStatusAsync("p1", novo, Vendedor);

        Assert.True(r.IsSuccess, r.Error);
        var gravada = repo.Itens.Single();
        Assert.Equal(novo, gravada.Status);
        Assert.Empty(gravada.Aprovacoes);
    }

    [Fact]
    public async Task Pendente_continua_so_com_aprovador_e_aprovada_so_pelo_botao()
    {
        var (service, _) = Montar(new Proposta { Id = "p1", Numero = "SIN-0001", Status = "pendente" });

        Assert.False((await service.AlterarStatusAsync("p1", "rascunho", Vendedor)).IsSuccess);
        Assert.False((await service.AlterarStatusAsync("p1", "aprovada", Aprovador)).IsSuccess);
        Assert.True((await service.AlterarStatusAsync("p1", "rascunho", Aprovador)).IsSuccess);
    }

    private static (PropostaService, MemRepo<Proposta>) Montar(Proposta p)
    {
        var repo = new MemRepo<Proposta>();
        repo.Itens.Add(p);
        var service = new PropostaService(repo, new MemRepo<RegraAprovacao>(), new MemRepo<Empresa>(), new MemRepo<Vendedor>(),
            new MemRepo<Cliente>(), new SemCrm(), new SemNumerador(), new SemAuditoria());
        return (service, repo);
    }

    private sealed class SemCrm : IOportunidadeService
    {
        public Task<Result> ValidarRegiaoAsync(Oportunidade op) => Task.FromResult(Result.Success());
        public Task MarcarGanhoPorPropostaAsync(string propostaNumero) => Task.CompletedTask;
    }

    private sealed class SemNumerador : IPropostaNumerador
    {
        public Task<string> ProximoAsync(string? empresaId = null) => Task.FromResult("SIN-0002");
        public Task<long> EmitidasAsync(string empresaId) => Task.FromResult(0L);
    }

    private sealed class SemAuditoria : IAuditoriaService
    {
        public Task RegistrarAsync(string acao, string entidade, string entidadeId, string descricao, object? antes = null, object? depois = null, UsuarioAtual? quem = null) => Task.CompletedTask;
        public Task<List<RegistroAuditoria>> ListarAsync(int limite, string? entidade = null, string? usuario = null, string? acao = null, string? entidadeId = null) =>
            Task.FromResult(new List<RegistroAuditoria>());
    }

    /// <summary>Repositório em memória (devolve cópias, como o EF).</summary>
    private sealed class MemRepo<T> : ICrudRepository<T> where T : class, IEntity
    {
        public List<T> Itens { get; } = new();
        private static T Copia(T e) => JsonSerializer.Deserialize<T>(JsonSerializer.Serialize(e))!;
        public Task<List<T>> GetAllAsync() => Task.FromResult(Itens.Select(Copia).ToList());
        public Task<List<T>> ListarAsync(Expression<Func<T, bool>> filtro) => Task.FromResult(Itens.Where(filtro.Compile()).Select(Copia).ToList());
        public Task<T?> GetByIdAsync(string id) => Task.FromResult(Itens.FirstOrDefault(e => e.Id == id) is { } e ? Copia(e) : null);
        public Task<T> AddAsync(T entity) { Itens.Add(Copia(entity)); return Task.FromResult(entity); }
        public Task<List<T>> AddRangeAsync(List<T> entities) { Itens.AddRange(entities.Select(Copia)); return Task.FromResult(entities); }
        public Task<T?> UpdateAsync(string id, T entity)
        {
            var i = Itens.FindIndex(e => e.Id == id);
            if (i < 0) return Task.FromResult<T?>(null);
            Itens[i] = Copia(entity);
            return Task.FromResult<T?>(entity);
        }
        public Task SalvarLoteAsync(IReadOnlyList<T> novos, IReadOnlyList<T> alterados) => Task.CompletedTask;
        public Task<bool> DeleteAsync(string id) => Task.FromResult(Itens.RemoveAll(e => e.Id == id) > 0);
    }
}

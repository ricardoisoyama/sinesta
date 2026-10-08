using System.Linq.Expressions;
using System.Text.Json;
using Elrond.Application.DTOs;
using Elrond.Application.Interfaces;
using Elrond.Application.Services;
using Elrond.Domain.Common;
using Elrond.Domain.Entities;

namespace Elrond.Tests;

/// <summary>Lançamentos, aprovação por regra e baixa no Financeiro.</summary>
public class FinanceiroTests
{
    private static readonly UsuarioAtual Ana = new("u-ana", "Ana", "Gestor", true);
    private static readonly UsuarioAtual Bruno = new("u-bruno", "Bruno", "Colaborador", true);
    private static readonly UsuarioAtual Carla = new("u-carla", "Carla", "Colaborador", true);

    private static Movimento Base(decimal valor, string tipo = "pagar") => new()
    {
        Tipo = tipo, ParceiroNome = "Fornecedor X", Descricao = "Aluguel", Vencimento = "2026-10-10", Valor = valor, CarteiraId = "cart",
    };

    private static (FinanceiroService Svc, MemRepo<Movimento> Movs, MemRepo<RegraAprovacao> Regras) Montar(params RegraAprovacao[] regras)
    {
        var movs = new MemRepo<Movimento>();
        var carteiras = new MemRepo<Carteira>();
        carteiras.Itens.Add(new Carteira { Id = "cart", Nome = "Banco" });
        carteiras.Itens.Add(new Carteira { Id = "cart-matriz", Nome = "Bradesco Matriz", EmpresaId = "matriz" });
        var rs = new MemRepo<RegraAprovacao>();
        rs.Itens.AddRange(regras);
        return (new FinanceiroService(movs, carteiras, rs, new MemRepo<ExtratoLinha>(), new SemTransacao(), new FakeAuditoria()), movs, rs);
    }

    private static RegraAprovacao Regra(decimal de, decimal ate, params string[] aprovadores) => new()
    {
        Id = $"r-{de}-{ate}", Nome = $"Até {ate}", Tipo = "movimento", Status = "ativo", Base = "valor", De = de, Ate = ate, Aprovadores = aprovadores.ToList(),
    };

    [Fact]
    public async Task Carteira_de_um_cnpj_nao_recebe_lancamento_de_outro_e_sem_empresa_assume_a_da_carteira()
    {
        var (svc, _, _) = Montar(Regra(0, 0, "u-ana"));
        var daFilial = Base(100m);
        daFilial.CarteiraId = "cart-matriz";
        daFilial.EmpresaId = "filial";
        var r = await svc.CriarAsync(new NovoMovimentoDto(daFilial, 1), Ana);
        Assert.False(r.IsSuccess);
        Assert.Contains("outra empresa", r.Error!);

        var semEmpresa = Base(100m);
        semEmpresa.CarteiraId = "cart-matriz";
        var ok = await svc.CriarAsync(new NovoMovimentoDto(semEmpresa, 1), Ana);
        Assert.True(ok.IsSuccess);
        Assert.Equal("matriz", ok.Value![0].EmpresaId);

        // Carteira antiga (sem empresa) continua aceitando qualquer empresa.
        var antiga = Base(100m);
        antiga.EmpresaId = "filial";
        Assert.True((await svc.CriarAsync(new NovoMovimentoDto(antiga, 1), Ana)).IsSuccess);
    }

    [Fact]
    public async Task Lancamento_nasce_pendente_e_parcelas_dividem_os_centavos()
    {
        var (svc, _, _) = Montar(Regra(0, 0, "u-ana"));
        var r = await svc.CriarAsync(new NovoMovimentoDto(Base(1000m), 3), Ana);
        Assert.True(r.IsSuccess);
        var p = r.Value!;
        Assert.Equal(new[] { 333.33m, 333.33m, 333.34m }, p.Select(x => x.Valor));
        Assert.Equal(new[] { "2026-10-10", "2026-11-10", "2026-12-10" }, p.Select(x => x.Vencimento));
        Assert.All(p, x => Assert.Equal("pendente", x.Aprovacao));
        Assert.All(p, x => Assert.Equal("r-0-0", x.RegraId));
    }

    [Fact]
    public async Task Todos_os_aprovadores_da_regra_precisam_assinar_e_a_assinatura_vale_para_as_parcelas()
    {
        var (svc, movs, _) = Montar(Regra(0, 0, "u-ana", "u-bruno"));
        var criados = (await svc.CriarAsync(new NovoMovimentoDto(Base(900m), 3), Ana)).Value!;

        var r1 = await svc.AprovarAsync(criados[0].Id, Ana, true);
        Assert.True(r1.IsSuccess);
        Assert.Equal("pendente", r1.Value!.Aprovacao); // falta o Bruno

        Assert.False((await svc.AprovarAsync(criados[0].Id, Ana, true)).IsSuccess); // já assinou
        Assert.Contains("não é aprovador", (await svc.AprovarAsync(criados[0].Id, Carla, true)).Error);

        var r2 = await svc.AprovarAsync(criados[1].Id, Bruno, true);
        Assert.Equal("aprovado", r2.Value!.Aprovacao);
        Assert.All(movs.Itens, m => Assert.Equal("aprovado", m.Aprovacao));
    }

    [Fact]
    public async Task Sem_regra_que_cubra_o_valor_ninguem_aprova_e_a_mensagem_explica()
    {
        var (svc, _, regras) = Montar(Regra(0, 500, "u-ana"));
        var m = (await svc.CriarAsync(new NovoMovimentoDto(Base(800m)), Ana)).Value![0];
        Assert.Equal(string.Empty, m.RegraId);
        var r = await svc.AprovarAsync(m.Id, Ana, true);
        Assert.False(r.IsSuccess);
        Assert.Contains("Não existem regras", r.Error);

        // O gestor cria a regra depois: a aprovação passa a funcionar.
        regras.Itens.Add(Regra(500.01m, 0, "u-ana"));
        Assert.Equal("aprovado", (await svc.AprovarAsync(m.Id, Ana, true)).Value!.Aprovacao);
    }

    [Fact]
    public async Task Regra_so_de_a_receber_nao_cobre_a_pagar()
    {
        var receber = Regra(0, 0, "u-ana");
        receber.TipoMovimento = "receber";
        var (svc, _, _) = Montar(receber);
        var m = (await svc.CriarAsync(new NovoMovimentoDto(Base(100m, "pagar")), Ana)).Value![0];
        Assert.False((await svc.AprovarAsync(m.Id, Ana, true)).IsSuccess);
    }

    [Fact]
    public async Task So_baixa_lancamento_aprovado_e_sem_permissao_nao_aprova()
    {
        var (svc, _, _) = Montar(Regra(0, 0, "u-ana"));
        var m = (await svc.CriarAsync(new NovoMovimentoDto(Base(100m)), Ana)).Value![0];
        Assert.Contains("não aprovado", (await svc.LiquidarAsync(new BaixaDto(new() { m.Id }, "2026-10-10", "cart"), Ana)).Error);
        Assert.Contains("permissão", (await svc.AprovarAsync(m.Id, Ana with { PodeAprovar = false }, false)).Error);
        await svc.AprovarAsync(m.Id, Ana, true);
        var b = await svc.LiquidarAsync(new BaixaDto(new() { m.Id }, "2026-10-12", "cart", Juros: 2m), Ana);
        Assert.Equal(1, b.Value);
    }

    [Fact]
    public async Task Alterar_valor_de_aprovado_volta_para_aprovacao_e_reprovar_exige_motivo()
    {
        var (svc, _, _) = Montar(Regra(0, 0, "u-ana"));
        var m = (await svc.CriarAsync(new NovoMovimentoDto(Base(100m)), Ana)).Value![0];
        await svc.AprovarAsync(m.Id, Ana, true);
        var editado = await svc.AtualizarAsync(m.Id, new Movimento { ParceiroNome = "Fornecedor X", Descricao = "Aluguel", Vencimento = "2026-10-10", Valor = 150m, CarteiraId = "cart" });
        Assert.Equal("pendente", editado.Value!.Aprovacao);
        Assert.Empty(editado.Value.Aprovacoes);

        Assert.Contains("motivo", (await svc.ReprovarAsync(m.Id, " ", Ana, true)).Error);
        Assert.Equal("reprovado", (await svc.ReprovarAsync(m.Id, "Valor fora do contrato", Ana, true)).Value!.Aprovacao);
    }

    // ── infraestrutura de teste ──

    private sealed class SemTransacao : IUnidadeTrabalho
    {
        public Task ExecutarAsync(Func<Task> acao) => acao();
    }

    private sealed class FakeAuditoria : IAuditoriaService
    {
        public Task RegistrarAsync(string acao, string entidade, string entidadeId, string descricao, object? antes = null, object? depois = null, UsuarioAtual? quem = null) => Task.CompletedTask;
        public Task<List<RegistroAuditoria>> ListarAsync(int limite, string? entidade = null, string? usuario = null, string? acao = null, string? entidadeId = null) =>
            Task.FromResult(new List<RegistroAuditoria>());
    }

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
        public Task SalvarLoteAsync(IReadOnlyList<T> novos, IReadOnlyList<T> alterados)
        {
            Itens.AddRange(novos.Select(Copia));
            foreach (var a in alterados)
            {
                var i = Itens.FindIndex(e => e.Id == a.Id);
                if (i >= 0) Itens[i] = Copia(a);
            }
            return Task.CompletedTask;
        }
        public Task<bool> DeleteAsync(string id) => Task.FromResult(Itens.RemoveAll(e => e.Id == id) > 0);
    }
}

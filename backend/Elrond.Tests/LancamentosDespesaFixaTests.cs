using System.Linq.Expressions;
using System.Text.Json;
using Elrond.Application.DTOs;
using Elrond.Application.Interfaces;
using Elrond.Application.Services;
using Elrond.Domain.Common;
using Elrond.Domain.Entities;

namespace Elrond.Tests;

/// <summary>Despesa fixa recorrente gerando os lançamentos a pagar nas Entradas e Saídas.</summary>
public class LancamentosDespesaFixaTests
{
    private static readonly UsuarioAtual Ana = new("u-ana", "Ana", "Gestor", true);
    // 23/10/2026 às 12:00 em Brasília.
    private static readonly TimeProvider Hoje = new Relogio(new DateTimeOffset(2026, 10, 23, 15, 0, 0, TimeSpan.Zero));

    private static CustoFixo Aluguel(string fim = "2026-12-31") => new()
    {
        Id = "df-1", Numero = 7, UnidadeId = "matriz", Descricao = "Aluguel", CategoriaId = "cc-adm", PlanoContaId = "p-aluguel", ValorMensal = 2500,
        Tipo = "recorrente", DataInicio = "2026-01-01", DataFim = fim, FornecedorId = "f-1", DiaVencimento = 31, CarteiraId = "cart", Status = "ativo",
    };

    private static (LancamentosDespesaFixa Svc, Mem<Movimento> Movs) Montar()
    {
        var movs = new Mem<Movimento>();
        var carteiras = new Mem<Carteira>();
        carteiras.Itens.Add(new Carteira { Id = "cart", Nome = "Banco", EmpresaId = "matriz" });
        var fornecedores = new Mem<Fornecedor>();
        fornecedores.Itens.Add(new Fornecedor { Id = "f-1", Nome = "Imobiliária Santos" });
        var financeiro = new FinanceiroService(movs, carteiras, new Mem<RegraAprovacao>(), new Mem<ExtratoLinha>(), new SemTransacao(), new Auditoria(), new Sequencia());
        return (new LancamentosDespesaFixa(movs, fornecedores, new SemUsuarios(), financeiro, Hoje), movs);
    }

    [Fact]
    public async Task Sem_termino_nao_cria_e_diz_por_que()
    {
        var (svc, movs) = Montar();
        var r = await svc.SincronizarAsync(Aluguel(CustoFixo.DataFimSemPrazo), false, Ana);
        Assert.True(r.IsSuccess);
        Assert.Contains("NÃO são criados", r.Value!.Motivo);
        Assert.Empty(movs.Itens);
    }

    [Fact]
    public async Task Cria_um_por_mes_do_mes_atual_ao_termino_no_dia_de_pagamento()
    {
        var (svc, movs) = Montar();
        var r = await svc.SincronizarAsync(Aluguel(), false, Ana);
        Assert.True(r.IsSuccess, r.Error);
        Assert.Equal(3, r.Value!.Criados);
        // Dia 31: novembro vence no último dia (30).
        Assert.Equal(["2026-10-31", "2026-11-30", "2026-12-31"], movs.Itens.Select(m => m.Vencimento).Order());
        Assert.All(movs.Itens, m =>
        {
            Assert.Equal(("pagar", 2500m, "Imobiliária Santos", "cart", "p-aluguel", "cc-adm", "custo-fixo", "df-1", "df:df-1", "pendente"),
                (m.Tipo, m.Valor, m.ParceiroNome, m.CarteiraId, m.PlanoContaId, m.CentroCustoId, m.Origem, m.OrigemId, m.GrupoId, m.Aprovacao));
        });
        Assert.Contains(movs.Itens, m => m.Descricao == "Aluguel · 11/2026");

        // De novo: nada a criar.
        Assert.Equal(0, (await svc.SincronizarAsync(Aluguel(), false, Ana)).Value!.Criados);
    }

    [Fact]
    public async Task Alterar_so_mexe_nos_em_aberto_quando_pedido_e_nunca_nos_pagos()
    {
        var (svc, movs) = Montar();
        await svc.SincronizarAsync(Aluguel(), false, Ana);
        var outubro = movs.Itens.Single(m => m.Competencia == "2026-10");
        outubro.PagoEm = "2026-10-22";
        outubro.ValorPago = 2500;

        var df = Aluguel();
        df.ValorMensal = 2800;
        var semAtualizar = await svc.SincronizarAsync(df, false, Ana);
        Assert.Equal(0, semAtualizar.Value!.Atualizados);
        Assert.All(movs.Itens, m => Assert.Equal(2500m, m.Valor));

        var atualizando = await svc.SincronizarAsync(df, true, Ana);
        Assert.Equal(2, atualizando.Value!.Atualizados);
        Assert.Equal(2500m, movs.Itens.Single(m => m.Competencia == "2026-10").Valor);
        Assert.All(movs.Itens.Where(m => m.Competencia != "2026-10"), m => Assert.Equal(2800m, m.Valor));
    }

    [Fact]
    public async Task Encurtar_o_termino_e_inativar_cancelam_os_em_aberto_que_sobram()
    {
        var (svc, movs) = Montar();
        await svc.SincronizarAsync(Aluguel(), false, Ana);

        var r = await svc.SincronizarAsync(Aluguel("2026-11-30"), true, Ana);
        Assert.Equal(1, r.Value!.Cancelados);
        Assert.True(movs.Itens.Single(m => m.Competencia == "2026-12").Cancelado);

        var inativa = Aluguel("2026-11-30");
        inativa.Status = "inativo";
        var i = await svc.SincronizarAsync(inativa, false, Ana);
        Assert.Equal(2, i.Value!.Cancelados);
        Assert.All(movs.Itens, m => Assert.True(m.Cancelado));
        Assert.Contains("inativa", i.Value.Motivo);
    }

    [Theory]
    [InlineData(0, "", "Informe o dia de pagamento")]
    [InlineData(10, "", "Informe a conta que paga")]
    public void Avisa_o_que_falta_para_gerar(int dia, string carteira, string esperado)
    {
        var df = Aluguel();
        df.DiaVencimento = dia;
        df.CarteiraId = carteira;
        Assert.StartsWith(esperado, LancamentosDespesaFixa.PorQueNaoGera(df));
    }

    // ── dublês ──

    private sealed class Relogio(DateTimeOffset agora) : TimeProvider
    {
        public override DateTimeOffset GetUtcNow() => agora;
    }

    private sealed class SemUsuarios : IUsuarioRepository
    {
        public Task<List<User>> GetAllAsync() => Task.FromResult(new List<User>());
        public Task<User?> GetByIdAsync(string id) => Task.FromResult<User?>(null);
        public Task AddAsync(User user) => Task.CompletedTask;
        public Task SaveAsync() => Task.CompletedTask;
    }

    private sealed class SemTransacao : IUnidadeTrabalho
    {
        public Task ExecutarAsync(Func<Task> acao) => acao();
    }

    private sealed class Sequencia : INumerador
    {
        private long _ultimo = 1000;
        public Task<IReadOnlyList<long>> ProximosMovimentosAsync(int quantidade) =>
            Task.FromResult<IReadOnlyList<long>>(Enumerable.Range(0, quantidade).Select(_ => ++_ultimo).ToList());
    }

    private sealed class Auditoria : IAuditoriaService
    {
        public Task RegistrarAsync(string acao, string entidade, string entidadeId, string descricao, object? antes = null, object? depois = null, UsuarioAtual? quem = null) => Task.CompletedTask;
        public Task<List<RegistroAuditoria>> ListarAsync(int limite, string? entidade = null, string? usuario = null, string? acao = null, string? entidadeId = null) =>
            Task.FromResult(new List<RegistroAuditoria>());
    }

    /// <summary>Repositório em memória que devolve os próprios objetos (o teste altera "pago em" direto).</summary>
    private sealed class Mem<T> : ICrudRepository<T> where T : class, IEntity
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

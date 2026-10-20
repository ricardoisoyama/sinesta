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

    private static readonly MemRepo<PagamentoBancario> Pagamentos = new();

    private static (FinanceiroService Svc, MemRepo<Movimento> Movs, MemRepo<RegraAprovacao> Regras) Montar(params RegraAprovacao[] regras)
    {
        var movs = new MemRepo<Movimento>();
        var carteiras = new MemRepo<Carteira>();
        carteiras.Itens.Add(new Carteira { Id = "cart", Nome = "Banco" });
        carteiras.Itens.Add(new Carteira { Id = "cart-matriz", Nome = "Bradesco Matriz", EmpresaId = "matriz" });
        var rs = new MemRepo<RegraAprovacao>();
        rs.Itens.AddRange(regras);
        var empresas = new MemRepo<Empresa>();
        empresas.Itens.Add(new Empresa { Id = "matriz", Nome = "Mirai - Matriz" });
        return (new FinanceiroService(movs, carteiras, rs, new MemRepo<ExtratoLinha>(), new SemTransacao(), new FakeAuditoria(), new Sequencia(), empresas, Pagamentos), movs, rs);
    }

    [Fact]
    public async Task Pix_em_andamento_trava_baixa_alteracao_e_cancelamento_mas_nao_a_baixa_do_banco()
    {
        var (svc, movs, _) = Montar(Regra(0, 0, "u-ana"));
        var m = Base(80m);
        m.Id = "m-andamento"; m.Aprovacao = "aprovado";
        movs.Itens.Add(m);
        Pagamentos.Itens.Add(new PagamentoBancario { Id = "pg-and", MovimentoId = "m-andamento", Situacao = PagamentoBancario.AguardandoAprovacao, CriadoEm = "2026-10-20T22:00:00Z" });
        try
        {
            Assert.Equal(PagamentoBancario.AguardandoAprovacao, (await svc.ListarAsync()).Single(x => x.Id == "m-andamento").PixSituacao);
            Assert.Contains("Pix em andamento", (await svc.LiquidarAsync(new BaixaDto(new() { "m-andamento" }, "2026-10-20", null), Ana)).Error);
            Assert.Contains("Pix em andamento", (await svc.AtualizarAsync("m-andamento", Base(81m))).Error);
            Assert.Contains("Pix em andamento", (await svc.CancelarAsync(new IdsDto(new() { "m-andamento" }), Ana)).Error);
            // A baixa feita pelo próprio sistema (aviso do banco) passa.
            Assert.True((await svc.LiquidarAsync(new BaixaDto(new() { "m-andamento" }, "2026-10-20", null), new UsuarioAtual("sistema", "Aviso do banco", "Admin"))).IsSuccess);
        }
        finally { Pagamentos.Itens.Clear(); }
    }

    [Fact]
    public async Task Pago_por_pix_do_elrond_nao_estorna_nem_altera()
    {
        var (svc, movs, _) = Montar(Regra(0, 0, "u-ana"));
        var m = Base(150m);
        m.Id = "m-pix"; m.Aprovacao = "aprovado"; m.PagoEm = "2026-10-20"; m.ValorPago = 150m; m.PagamentoBancarioId = "pag-1";
        movs.Itens.Add(m);
        Assert.Contains("Pix pelo ELROND", (await svc.EstornarAsync("m-pix", Ana)).Error);
        Assert.Contains("Pix pelo ELROND", (await svc.AtualizarAsync("m-pix", Base(999m))).Error);
        Assert.Equal("2026-10-20", movs.Itens.Single().PagoEm);

        // Baixa manual (sem pagamento pelo banco) continua estornável.
        m.PagamentoBancarioId = string.Empty;
        Assert.True((await svc.EstornarAsync("m-pix", Ana)).IsSuccess);
    }

    [Fact]
    public void Regra_da_empresa_vence_a_de_todas_e_nao_vale_para_outra_empresa()
    {
        var todas = Regra(0, 0, "u-ana");
        var filial = Regra(0, 0, "u-bia");
        filial.Id = "r-filial";
        filial.EmpresaId = "filial";
        var regras = new[] { todas, filial };
        Assert.Equal("r-filial", FinanceiroService.RegraQueCobre(regras, "pagar", 100m, "filial")!.Id);
        Assert.Equal(todas.Id, FinanceiroService.RegraQueCobre(regras, "pagar", 100m, "matriz")!.Id);
        Assert.Null(FinanceiroService.RegraQueCobre(new[] { filial }, "pagar", 100m, "matriz"));
    }

    private static RegraAprovacao Regra(decimal de, decimal ate, params string[] aprovadores) => new()
    {
        Id = $"r-{de}-{ate}", Nome = $"Até {ate}", Tipo = "movimento", Status = "ativo", Base = "valor", De = de, Ate = ate, Aprovadores = aprovadores.ToList(),
    };

    [Fact]
    public async Task Transferencia_entre_contas_nasce_em_par_e_anda_junta()
    {
        // Regra de R$ 0 a R$ 5.000: a transferência de 4.000 é avaliada pela saída, não pela soma das pernas (8.000).
        var (svc, movs, _) = Montar(Regra(0, 5000, "u-ana"));
        Assert.False((await svc.TransferirAsync(new("cart", "cart", 10m, "2026-10-20", "", null, null, null, null, null), Ana)).IsSuccess);
        var r = await svc.TransferirAsync(new("cart-matriz", "cart", 4000m, "2026-10-20", "", "TED 1", null, null, null, "Pix", JaFeita: true), Ana);
        Assert.True(r.IsSuccess, r.Error);
        var (saida, entrada) = (r.Value!.Single(m => m.Tipo == "pagar"), r.Value!.Single(m => m.Tipo == "receber"));
        Assert.Equal(("cart-matriz", "matriz", "cart"), (saida.CarteiraId, saida.EmpresaId, entrada.CarteiraId));
        Assert.Equal((entrada.Id, saida.Id), (saida.OrigemId, entrada.OrigemId));
        Assert.Equal("Transferência entre contas", saida.Descricao);
        // Contas de empresas diferentes: o nome leva a empresa (as contas costumam ter o mesmo nome do banco).
        Assert.Equal(("Para Banco", "De Mirai - Matriz · Bradesco Matriz"), (saida.ParceiroNome, entrada.ParceiroNome));
        Assert.Equal("r-0-5000", saida.RegraId);

        // Aprovar uma perna aprova as duas e, como já foi feita no banco, baixa as duas na data.
        Assert.True((await svc.AprovarAsync(entrada.Id, Ana, true)).IsSuccess);
        Assert.All(movs.Itens, m => Assert.Equal(("aprovado", "2026-10-20"), (m.Aprovacao, m.PagoEm)));

        // Estornar uma estorna as duas; cancelar uma cancela as duas.
        Assert.True((await svc.EstornarAsync(saida.Id, Ana)).IsSuccess);
        Assert.All(movs.Itens, m => Assert.Equal(string.Empty, m.PagoEm));
        Assert.Equal(2, (await svc.CancelarAsync(new IdsDto(new() { saida.Id }), Ana)).Value);
        Assert.All(movs.Itens, m => Assert.True(m.Cancelado));
    }

    [Fact]
    public async Task Transferencia_a_fazer_fica_em_aberto_depois_de_aprovada_e_a_baixa_leva_as_duas()
    {
        var (svc, movs, _) = Montar(Regra(0, 0, "u-ana"));
        var r = (await svc.TransferirAsync(new("cart", "cart-matriz", 50m, "2026-10-20", "Reforço de caixa", null, null, null, null, null), Ana)).Value!;
        await svc.AprovarAsync(r[0].Id, Ana, true);
        Assert.All(movs.Itens, m => Assert.Equal(string.Empty, m.PagoEm)); // vai ser feita pelo app ou pelo Pix do ELROND
        Assert.Equal(2, (await svc.LiquidarAsync(new BaixaDto(new() { r[0].Id }, "2026-10-21", "cart"), Ana)).Value);
        Assert.Equal(new[] { "cart", "cart-matriz" }, movs.Itens.Select(m => m.CarteiraId).OrderBy(x => x)); // cada perna na sua conta
    }

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

    [Fact]
    public async Task Cada_parcela_tem_o_seu_numero_em_ordem_e_editar_nao_troca()
    {
        var (svc, _, _) = Montar(Regra(0, 0, "u-ana"));
        var parcelas = (await svc.CriarAsync(new NovoMovimentoDto(Base(300m), 3), Ana)).Value!;
        Assert.Equal(new long[] { 1001, 1002, 1003 }, parcelas.OrderBy(p => p.Parcela).Select(p => p.Numero));
        var outro = (await svc.CriarAsync(new NovoMovimentoDto(Base(50m)), Ana)).Value![0];
        Assert.Equal(1004, outro.Numero);

        var editado = await svc.AtualizarAsync(outro.Id, new Movimento { Numero = 7, ParceiroNome = "Fornecedor X", Descricao = "Outro", Vencimento = "2026-10-10", Valor = 50m, CarteiraId = "cart" });
        Assert.Equal(1004, editado.Value!.Numero);
    }

    // ── infraestrutura de teste ──

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

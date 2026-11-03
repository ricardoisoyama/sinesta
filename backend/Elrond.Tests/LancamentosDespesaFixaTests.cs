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
        var (svc, movs, _) = MontarComFinanceiro();
        return (svc, movs);
    }

    private static (LancamentosDespesaFixa Svc, Mem<Movimento> Movs, FinanceiroService Financeiro) MontarComFinanceiro()
    {
        var movs = new Mem<Movimento>();
        var carteiras = new Mem<Carteira>();
        carteiras.Itens.Add(new Carteira { Id = "cart", Nome = "Banco", EmpresaId = "matriz" });
        var fornecedores = new Mem<Fornecedor>();
        fornecedores.Itens.Add(new Fornecedor { Id = "f-1", Nome = "Imobiliária Santos" });
        var financeiro = new FinanceiroService(movs, carteiras, new Mem<RegraAprovacao>(), new Mem<ExtratoLinha>(), new SemTransacao(), new Auditoria(), new Sequencia());
        return (new LancamentosDespesaFixa(movs, fornecedores, new SemUsuarios(), financeiro, Hoje), movs, financeiro);
    }

    [Fact]
    public async Task Vencimento_em_dia_nao_util_segue_o_fornecedor_ou_a_regra_da_despesa()
    {
        var movs = new Mem<Movimento>();
        var carteiras = new Mem<Carteira>();
        carteiras.Itens.Add(new Carteira { Id = "cart", Nome = "Banco", EmpresaId = "matriz" });
        var fornecedores = new Mem<Fornecedor>();
        fornecedores.Itens.Add(new Fornecedor { Id = "f-1", Nome = "Imobiliária Santos", VencimentoFimDeSemana = VencimentoFimDeSemana.Postergar });
        var feriados = new Mem<Feriado>();
        feriados.Itens.Add(new Feriado { Id = "sp", Nome = "Feriado municipal", Data = "2026-12-01", TodoAno = false });
        var financeiro = new FinanceiroService(movs, carteiras, new Mem<RegraAprovacao>(), new Mem<ExtratoLinha>(), new SemTransacao(), new Auditoria(), new Sequencia());
        var svc = new LancamentosDespesaFixa(movs, fornecedores, new SemUsuarios(), financeiro, Hoje, feriados);

        // Dia 1: 01/11 é domingo e 02/11 Finados → 03/11; 01/12 é feriado do cadastro → 02/12. Competência continua a do mês.
        var df = Aluguel("2026-12-31");
        df.DiaVencimento = 1;
        await svc.SincronizarAsync(df, false, Ana);
        Assert.Equal(("2026-11", "2026-11-03"), movs.Itens.Where(m => m.Competencia == "2026-11").Select(m => (m.Competencia, m.Vencimento)).Single());
        Assert.Equal("2026-12-02", movs.Itens.Single(m => m.Competencia == "2026-12").Vencimento);

        // A despesa pode ter a regra dela (antecipar): atualizar os em aberto leva os vencimentos.
        df.VencimentoDiaUtil = VencimentoFimDeSemana.Antecipar;
        await svc.SincronizarAsync(df, true, Ana);
        Assert.Equal("2026-10-30", movs.Itens.Single(m => m.Competencia == "2026-11" && !m.Cancelado).Vencimento);
        Assert.Equal("2026-11-30", movs.Itens.Single(m => m.Competencia == "2026-12" && !m.Cancelado).Vencimento);
    }

    private static ItemVariavelMovimento Variavel(string tipo, string descricao, decimal valor) => new() { Tipo = tipo, Descricao = descricao, Valor = valor };

    [Fact]
    public async Task Financeiro_inclui_variaveis_no_lancamento_da_despesa_fixa_e_o_valor_vira_fixo_mais_variavel()
    {
        var (svc, movs, financeiro) = MontarComFinanceiro();
        await svc.SincronizarAsync(Aluguel(), false, Ana);
        var nov = movs.Itens.Single(m => m.Competencia == "2026-11");
        nov.Aprovacao = "aprovado";

        // Parte fixa 2.500 + seguro da viagem 180,50 + juros 12,30.
        var dados = (await movs.GetByIdAsync(nov.Id))!;
        dados.ItensVariaveis = [Variavel("seguro", "Seguro viagem 1234 (0,03% de R$ 600 mil)", 180.50m), Variavel("juros", "Juros de atraso", 12.30m)];
        dados.Valor = 2500m + 192.80m;
        var r = await financeiro.AtualizarAsync(nov.Id, dados);

        Assert.True(r.IsSuccess, r.Error);
        var gravado = movs.Itens.Single(m => m.Id == nov.Id);
        Assert.Equal((2692.80m, 192.80m, 2500m), (gravado.Valor, gravado.ValorVariavel, gravado.ValorFixo));
        Assert.Equal(["seguro", "juros"], gravado.ItensVariaveis.Select(i => i.Tipo));
        // Mudou o valor: volta para aprovação, como qualquer alteração de valor.
        Assert.Equal("pendente", gravado.Aprovacao);
    }

    [Fact]
    public async Task Atualizar_a_despesa_fixa_mantem_os_variaveis_e_so_troca_a_parte_fixa()
    {
        var (svc, movs, financeiro) = MontarComFinanceiro();
        await svc.SincronizarAsync(Aluguel(), false, Ana);
        var nov = movs.Itens.Single(m => m.Competencia == "2026-11");
        var dados = (await movs.GetByIdAsync(nov.Id))!;
        dados.ItensVariaveis = [Variavel("seguro", "Seguro viagem 1234", 100m)];
        dados.Valor = 2600m;
        Assert.True((await financeiro.AtualizarAsync(nov.Id, dados)).IsSuccess);

        var df = Aluguel();
        df.ValorMensal = 2800;
        await svc.SincronizarAsync(df, true, Ana);

        var gravado = movs.Itens.Single(m => m.Id == nov.Id);
        Assert.Equal((2900m, 100m, 2800m), (gravado.Valor, gravado.ValorVariavel, gravado.ValorFixo));
        Assert.Single(gravado.ItensVariaveis);
    }

    [Fact]
    public async Task Variavel_sem_valor_ou_parte_fixa_negativa_nao_grava_e_lancamento_manual_nao_tem_variavel()
    {
        var (svc, movs, financeiro) = MontarComFinanceiro();
        await svc.SincronizarAsync(Aluguel(), false, Ana);
        var nov = movs.Itens.Single(m => m.Competencia == "2026-11");

        var semValor = (await movs.GetByIdAsync(nov.Id))!;
        semValor.ItensVariaveis = [Variavel("outro", "Taxa", 0m)];
        Assert.Contains("valor de cada item", (await financeiro.AtualizarAsync(nov.Id, semValor)).Error);

        var negativo = (await movs.GetByIdAsync(nov.Id))!;
        negativo.ItensVariaveis = [Variavel("seguro", "Seguro", 3000m)];
        negativo.Valor = 2500m;
        Assert.Contains("parte fixa não pode ficar negativa", (await financeiro.AtualizarAsync(nov.Id, negativo)).Error);

        // Lançamento manual: os itens variáveis não se aplicam (são da despesa fixa).
        var manual = (await movs.GetByIdAsync(nov.Id))!;
        manual.Id = "manual-1"; manual.Origem = "manual"; manual.OrigemId = string.Empty;
        await movs.AddAsync(manual);
        var dados = (await movs.GetByIdAsync("manual-1"))!;
        dados.ItensVariaveis = [Variavel("seguro", "Seguro", 50m)];
        Assert.True((await financeiro.AtualizarAsync("manual-1", dados)).IsSuccess);
        Assert.Equal(0m, movs.Itens.Single(m => m.Id == "manual-1").ValorVariavel);
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

    [Fact]
    public async Task Mes_ja_lancado_a_mao_nao_duplica_e_cancelado_vencido_nao_volta()
    {
        var (svc, movs) = Montar();
        // Aluguel de outubro lançado à mão antes da despesa (nome fantasia, outro dia, outra empresa) e já pago.
        movs.Itens.Add(new Movimento
        {
            Id = "manual", Numero = 20, Tipo = "pagar", EmpresaId = "filial", ParceiroNome = "IMOBILIARIA SANTOS LTDA", PlanoContaId = "p-aluguel",
            Valor = 2500, Vencimento = "2026-10-25", Competencia = "2026-09", PagoEm = "2026-10-25", ValorPago = 2500,
        });
        // Outro pagamento ao mesmo fornecedor, de outro plano (não é o aluguel).
        movs.Itens.Add(new Movimento { Id = "outro", Numero = 21, Tipo = "pagar", ParceiroId = "f-1", ParceiroNome = "Imobiliária Santos", PlanoContaId = "p-multa", Valor = 2500, Vencimento = "2026-11-30" });

        var r = await svc.SincronizarAsync(Aluguel(), false, Ana);
        Assert.True(r.IsSuccess, r.Error);
        Assert.Equal(2, r.Value!.Criados);
        Assert.Single(r.Value.JaLancados!, j => j.StartsWith("10/2026: nº 20"));
        Assert.DoesNotContain(movs.Itens, m => m.Origem == "custo-fixo" && m.Competencia == "2026-10");

        // Cancelado que já venceu (duplicado resolvido à mão) não é recriado.
        movs.Itens.RemoveAll(m => m.Id == "manual");
        movs.Itens.Add(new Movimento { Id = "dup", Tipo = "pagar", Origem = "custo-fixo", OrigemId = "df-1", Competencia = "2026-10", Vencimento = "2026-10-20", Valor = 2500, Cancelado = true });
        Assert.Equal(0, (await svc.SincronizarAsync(Aluguel(), false, Ana)).Value!.Criados);
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

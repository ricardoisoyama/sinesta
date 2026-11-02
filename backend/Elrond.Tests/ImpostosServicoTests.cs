using System.Linq.Expressions;
using Elrond.Application.Common;
using Elrond.Application.DTOs;
using Elrond.Application.Interfaces;
using Elrond.Application.Services;
using Elrond.Domain.Common;
using Elrond.Domain.Entities;

namespace Elrond.Tests;

/// <summary>
/// Impostos no serviço: os quadros "com reforma tributária" da planilha ALIQUOTAS (transportadora e
/// armazenagem, faturamento de R$ 300 mil/mês) entrando no fator.
/// </summary>
public class ImpostosServicoTests
{
    private static readonly DateOnly Hoje = new(2026, 11, 2);

    private static ImpostoServico Imp(string tipo, decimal @base, decimal aliquota, bool afeta = true, decimal limite = 0m) =>
        new() { Id = tipo, Imposto = tipo, Base = @base, Aliquota = aliquota, AfetaPreco = afeta, Limite = limite };

    private static Servico Armazenagem(bool cbsAfeta = true) => new()
    {
        Id = "arm", Nome = "ARMAZENAGEM",
        Impostos =
        [
            Imp("irpj", 0.32m, 0.15m),
            Imp(ImpostoServico.AdicionalIrpj, 0.32m, 0.10m, limite: 20000m),
            Imp("csll", 0.32m, 0.09m),
            Imp("cbs", 1m, 0.088m, cbsAfeta),
            Imp("iss", 1m, 0.05m),
        ],
    };

    private static Servico Transporte(bool icmsAfeta = true) => new()
    {
        Id = "transp", Nome = "TRANSPORTE",
        Impostos =
        [
            Imp("irpj", 0.08m, 0.15m),
            Imp(ImpostoServico.AdicionalIrpj, 0.08m, 0.10m, limite: 20000m),
            Imp("csll", 0.12m, 0.09m),
            Imp("cbs", 1m, 0.088m),
            Imp("iss", 1m, 0.05m),
            Imp(ImpostoServico.Icms, 1m, 0.18m, icmsAfeta),
        ],
    };

    private static Empresa Empresa() => new()
    {
        Id = "matriz", Nome = "Matriz", Regime = "Lucro Presumido", IcmsAtivo = true,
        Dv = new DvEmpresa { Impostos = 0.1686m, Comissoes = 0m, Lucro = 0.10m },
    };

    private static Meta Meta300Mil() => new()
    {
        Id = "meta", Nome = "Meta", EmpresaId = "matriz", Ano = 2026, ValoresMensais = Enumerable.Repeat(300000m, 12).ToList(),
    };

    private static FatorResultado Fator(Servico? servico) =>
        FatorService.Calcular(Empresa(), "matriz", [], [Meta300Mil()], Hoje, 0m, servico: servico);

    private static void Perto(decimal esperado, decimal real) =>
        Assert.True(Math.Abs(esperado - real) <= 0.000001m, $"esperado {esperado}, veio {real}");

    [Fact]
    public void Armazenagem_com_reforma_da_o_total_da_planilha()
    {
        var r = Fator(Armazenagem());

        Assert.Equal("servico", r.ImpostosOrigem);
        // D37..D41: 4,8% + 2,5333% (adicional sobre 96 mil − 20 mil) + 2,88% + 8,8% + 5% = 24,0133% (D42).
        Perto(0.025333m, r.ImpostosDetalhe!.Single(i => i.Imposto == ImpostoServico.AdicionalIrpj).Efetiva);
        Perto(0.240133m, r.Impostos);
        Assert.False(r.Icms!.Incide);
    }

    [Fact]
    public void Imposto_que_nao_afeta_o_preco_sai_do_markup_e_fica_destacado()
    {
        var com = Fator(Armazenagem());
        var sem = Fator(Armazenagem(cbsAfeta: false));

        Perto(0.152133m, sem.Impostos);
        Perto(0.088m, sem.ImpostosDestacados);
        Assert.True(sem.Fator < com.Fator);
    }

    [Fact]
    public void Transporte_tira_o_icms_do_markup_e_manda_para_a_rota()
    {
        var r = Fator(Transporte());

        // D18..D22 sem o ICMS (ele entra por dentro, depois): 1,2% + 0,1333% + 1,08% + 8,8% + 5%.
        Perto(0.162133m, r.Impostos);
        Assert.DoesNotContain(r.ImpostosDetalhe!, i => i.Imposto == ImpostoServico.Icms);
        Assert.Equal(new IcmsServicoDto(true, 0.18m, true), r.Icms);
    }

    [Fact]
    public void Servico_sem_impostos_ou_item_sem_servico_usam_os_da_empresa()
    {
        Assert.Equal(("empresa", 0.1686m), (Fator(null).ImpostosOrigem, Fator(null).Impostos));
        var vazio = Fator(new Servico { Id = "x", Nome = "Consultoria" });
        Assert.Equal(("empresa", 0.1686m), (vazio.ImpostosOrigem, vazio.Impostos));
        Assert.Null(vazio.Icms);
    }

    [Fact]
    public void Adicional_do_irpj_so_aparece_acima_do_limite()
    {
        var adicional = Imp(ImpostoServico.AdicionalIrpj, 0.08m, 0.10m, limite: 20000m);
        Assert.Equal(0m, adicional.Efetiva(200000m)); // 16 mil presumidos: abaixo dos 20 mil
        Assert.Equal(0m, adicional.Efetiva(0m));
        Perto(0.001333m, adicional.Efetiva(300000m)); // D19
    }

    [Theory]
    // Armazenagem (sem a linha de ICMS): o ICMS da rota não incide.
    [InlineData("arm", true, 0.12, false, 0, 0)]
    // Transporte, ICMS no preço: a alíquota da rota entra por dentro; sem rota, a do serviço.
    [InlineData("transp", true, 0.12, true, 0.12, 0)]
    [InlineData("transp", true, 0, true, 0.18, 0)]
    // Transporte, ICMS só destacado: não soma ao preço.
    [InlineData("transp", false, 0.12, false, 0, 0.12)]
    public async Task Icms_segue_o_servico(string servicoId, bool icmsAfeta, double rota, bool aplica, double aliquota, double destacado)
    {
        var servicos = new Mem<Servico>([Armazenagem(), Transporte(icmsAfeta)]);
        var empresas = new Mem<Empresa>([Empresa()]);
        var fator = new FatorService(empresas, new Mem<CustoFixo>([]), new Mem<Meta>([Meta300Mil()]), new Mem<RegraAprovacao>([]), servicos);
        var pricing = new PricingService(empresas, new Mem<Taxa>([]), fator);

        var r = await pricing.CalcularAsync(new CalcularPrecoRequest("matriz", 1000m, null, 0m, 0m, false, null, AliquotaIcms: (decimal)rota, ServicoId: servicoId));

        Assert.True(r.IsSuccess, r.Error);
        Assert.Equal((aplica, (decimal)aliquota, (decimal)destacado), (r.Value!.AplicaIcms, r.Value.AliquotaIcms, r.Value.IcmsDestacado));
        if (!aplica) Assert.Equal(r.Value.PvComDesconto, r.Value.PrecoFinal);
    }

    private sealed class Mem<T>(List<T> itens) : ICrudRepository<T> where T : class, IEntity
    {
        public Task<List<T>> GetAllAsync() => Task.FromResult(itens.ToList());
        public Task<List<T>> ListarAsync(Expression<Func<T, bool>> filtro) => Task.FromResult(itens.Where(filtro.Compile()).ToList());
        public Task<T?> GetByIdAsync(string id) => Task.FromResult(itens.FirstOrDefault(e => e.Id == id));
        public Task<T> AddAsync(T entity) { itens.Add(entity); return Task.FromResult(entity); }
        public Task<List<T>> AddRangeAsync(List<T> entities) { itens.AddRange(entities); return Task.FromResult(entities); }
        public Task<T?> UpdateAsync(string id, T entity) => Task.FromResult<T?>(entity);
        public Task SalvarLoteAsync(IReadOnlyList<T> novos, IReadOnlyList<T> alterados) => Task.CompletedTask;
        public Task<bool> DeleteAsync(string id) => Task.FromResult(itens.RemoveAll(e => e.Id == id) > 0);
    }
}

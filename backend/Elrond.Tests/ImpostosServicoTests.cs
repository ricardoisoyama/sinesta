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

    private static ImpostoServico Imp(string tipo, decimal @base, decimal aliquota, bool afeta = true) =>
        new() { Id = tipo, Imposto = tipo, Base = @base, Aliquota = aliquota, AfetaPreco = afeta };

    private static Servico Armazenagem(bool cbsAfeta = true) => new()
    {
        Id = "arm", Nome = "ARMAZENAGEM",
        Impostos =
        [
            Imp("irpj", 0.32m, 0.15m),
            // O adicional: a alíquota efetiva que a contabilidade passa (D38: 2,5333% com R$ 300 mil/mês).
            Imp(ImpostoServico.AdicionalIrpj, 1m, 0.025333m),
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
            Imp(ImpostoServico.AdicionalIrpj, 1m, 0.001333m),
            Imp("csll", 0.12m, 0.09m),
            Imp("cbs", 1m, 0.088m),
            Imp("iss", 1m, 0.05m),
            Imp(ImpostoServico.Icms, 1m, 0m, icmsAfeta),
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
        FatorService.Calcular(Empresa(), "matriz", [], [Meta300Mil()], Hoje, 0m, servico: servico, precificar: true);

    private static void Perto(decimal esperado, decimal real) =>
        Assert.True(Math.Abs(esperado - real) <= 0.000001m, $"esperado {esperado}, veio {real}");

    [Fact]
    public void Armazenagem_com_reforma_da_o_total_da_planilha()
    {
        var r = Fator(Armazenagem());

        Assert.Equal("servico", r.ImpostosOrigem);
        // D37..D41: 4,8% + 2,5333% + 2,88% + 8,8% + 5% = 24,0133% (D42).
        Perto(0.240133m, r.Impostos);
        Assert.True(r.Pronto);
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
        Assert.Equal(new IcmsServicoDto(true, 0m, true), r.Icms);
    }

    [Fact]
    public void Para_precificar_o_servico_com_impostos_e_obrigatorio()
    {
        var sem = Fator(null);
        Assert.False(sem.Pronto);
        Assert.Equal(("faltando", 0m), (sem.ImpostosOrigem, sem.Impostos));
        Assert.Contains("Escolha o serviço", sem.Aviso);

        var vazio = Fator(new Servico { Id = "x", Nome = "Consultoria" });
        Assert.False(vazio.Pronto);
        Assert.Contains("\"Consultoria\" não tem impostos do Lucro Presumido", vazio.Aviso);
    }

    [Fact]
    public void Paineis_da_empresa_usam_a_media_dos_servicos_do_regime()
    {
        var r = FatorService.Calcular(Empresa(), "matriz", [], [Meta300Mil()], Hoje, 0m, servicos: [Armazenagem(), Transporte(), new Servico { Id = "v", Nome = "Vazio" }]);
        Assert.True(r.Pronto);
        Assert.Equal("media", r.ImpostosOrigem);
        Perto((0.240133m + 0.162133m) / 2, r.Impostos);
        Assert.Contains("média dos 2 serviço(s)", r.ImpostosNota);
    }

    [Fact]
    public void Adicional_do_irpj_e_base_vezes_aliquota_como_os_outros()
    {
        Assert.Equal(0.001333m, Imp(ImpostoServico.AdicionalIrpj, 1m, 0.001333m).Efetiva);
        Assert.Equal(0.008m, Imp(ImpostoServico.AdicionalIrpj, 0.08m, 0.10m).Efetiva);
    }

    private static ImpostoServico Tab(string regime, string desde, string tipo, decimal aliquota) =>
        new() { Id = $"{regime}-{desde}-{tipo}", Imposto = tipo, Aliquota = aliquota, Regime = regime, VigenteDesde = desde };

    /// <summary>Simples hoje, Presumido em duas vigências (a de 2027 sem PIS/COFINS, já cadastrada).</summary>
    private static Servico ComTabelas() => new()
    {
        Id = "t", Nome = "TRANSPORTE",
        Impostos =
        [
            Tab("Simples Nacional", "", "das", 0.1686m),
            Tab("Lucro Presumido", "", "pis", 0.0065m),
            Tab("Lucro Presumido", "", "cofins", 0.03m),
            Tab("Lucro Presumido", "2027-01-01", "cbs", 0.088m),
        ],
    };

    [Theory]
    [InlineData("Simples Nacional", "2026-11-02", 0.1686)]
    [InlineData("MEI", "2026-11-02", 0.1686)]
    [InlineData("Lucro Presumido", "2026-12-31", 0.0365)]
    [InlineData("Lucro Presumido", "2027-01-01", 0.088)]
    [InlineData("Lucro Real", "2026-11-02", 0)]
    public void Vale_a_tabela_do_regime_da_empresa_com_a_vigencia_que_ja_comecou(string regime, string data, double esperado)
    {
        var vigentes = ComTabelas().ImpostosVigentes(regime, DateOnly.Parse(data));
        Assert.Equal((decimal)esperado, vigentes.Sum(i => i.Efetiva));
    }

    [Fact]
    public void Sem_tabela_do_regime_o_pricing_bloqueia_e_diz_o_que_cadastrar()
    {
        var empresa = Empresa();
        empresa.Regime = "Lucro Real";
        var r = FatorService.Calcular(empresa, "matriz", [], [Meta300Mil()], Hoje, 0m, servico: ComTabelas(), precificar: true);

        Assert.False(r.Pronto);
        Assert.Equal(("faltando", 0m), (r.ImpostosOrigem, r.Impostos));
        Assert.Contains("não tem impostos do Lucro Real", r.Aviso);
        Assert.Null(r.Icms);
    }

    [Fact]
    public void Cadastro_de_antes_sem_regime_vale_para_qualquer_regime()
    {
        var r = Fator(Armazenagem());
        Assert.Equal("Lucro Presumido", r.ImpostosNota);
        Perto(0.240133m, r.Impostos);
    }

    [Theory]
    // Armazenagem (sem a linha de ICMS): o ICMS da rota não incide.
    [InlineData("arm", true, 0.12, false, 0, 0)]
    // Transporte, ICMS no preço: a alíquota da Tabela de ICMS (rota) entra por dentro; sem rota, nada.
    [InlineData("transp", true, 0.12, true, 0.12, 0)]
    [InlineData("transp", true, 0, false, 0, 0)]
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

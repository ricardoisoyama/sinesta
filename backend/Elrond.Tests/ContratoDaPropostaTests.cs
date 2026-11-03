using System.Linq.Expressions;
using System.Text.Json;
using Elrond.Application.Common;
using Elrond.Application.DTOs;
using Elrond.Application.Interfaces;
using Elrond.Application.Services;
using Elrond.Domain.Common;
using Elrond.Domain.Entities;
using Elrond.Domain.Regras;

namespace Elrond.Tests;

/// <summary>O contrato nasce da proposta aprovada: o que foi precificado vai travado, e muda só por aditivo com outra proposta.</summary>
public class ContratoDaPropostaTests
{
    private static ItemProposta Item(string id, string desc, decimal preco, string? cobranca = null, string empresa = "matriz", string? unidade = null, decimal adValorem = 0) => new()
    {
        Id = id, Descricao = desc, EmpresaId = empresa, ServicoId = "srv-arm", PrecoFinal = preco, AdValorem = adValorem, CustoTotal = preco * 0.6m,
        TipoOperacao = "Armazenagem", Cobranca = cobranca, Unidade = unidade,
    };

    private static Proposta Recorrente(string id = "p1", string numero = "MRF-0001", params ItemProposta[] itens) => new()
    {
        Id = id, Numero = numero, Cliente = "Química Cubatão", ClienteId = "cli-1", Status = "aprovada", Modalidade = ModalidadeProposta.Recorrente,
        VigenciaInicio = "2026-12-01", VigenciaFim = "2027-11-30",
        Itens = itens.Length > 0 ? [.. itens] : [Item("i1", "Posições-pallet", 12000m), Item("i2", "Hora extra do conferente", 85m, CobrancaItem.PorOcorrencia, unidade: "hora"), Item("i3", "Implantação", 3000m, CobrancaItem.Unica)],
    };

    [Fact]
    public void Recorrente_vira_escopo_mensal_e_componentes_pelo_jeito_de_cobrar()
    {
        var (m, erro) = ContratoDaProposta.Montar(Recorrente(itens: [Item("i1", "Posições-pallet", 12000m, adValorem: 150m), Item("i2", "Hora extra", 85m, CobrancaItem.PorOcorrencia, unidade: "hora"),
            Item("i3", "Implantação", 3000m, CobrancaItem.Unica), Item("i4", "Frete Cubatão → Sorocaba", 2400m, CobrancaItem.PorDocumento)]));

        Assert.Null(erro);
        Assert.Equal((Modalidade.Recorrente, "matriz", "srv-arm", "2026-12-01", "2027-11-30"), (m!.Modalidade, m.EmpresaId, m.ServicoId, m.Inicio, m.Fim));
        // O preço do item já tem o ad valorem.
        Assert.Equal(12150m, m.Itens.Single(i => !i.Tabela).ValorUnitario);
        Assert.True(m.Itens.Single(i => i.Descricao.StartsWith("Frete")).Tabela);
        Assert.Equal([RegraComponente.Lancamento, RegraComponente.Unico, RegraComponente.Documento], m.Componentes.Select(c => c.Regra));
        Assert.Equal(("hora", 85m), (m.Componentes[0].Unidade, m.Componentes[0].ValorUnitario));
    }

    [Fact]
    public void Avulso_vira_spot_e_proposta_de_duas_empresas_nao_vira_contrato()
    {
        var avulso = Recorrente();
        avulso.Modalidade = ModalidadeProposta.Avulso;
        var (m, _) = ContratoDaProposta.Montar(avulso);
        Assert.Equal(Modalidade.Spot, m!.Modalidade);
        Assert.Equal(3, m.Itens.Count);
        Assert.Empty(m.Componentes);

        var duas = Recorrente(itens: [Item("a", "A", 10m), Item("b", "B", 20m, empresa: "filial")]);
        Assert.Contains("mais de uma empresa", ContratoDaProposta.Montar(duas).Erro);
    }

    [Fact]
    public async Task Cria_da_proposta_ignorando_o_que_a_tela_manda_e_trava_ate_o_aditivo()
    {
        var (svc, contratos, propostas) = Montar();
        propostas.Itens.Add(Recorrente());
        var tela = new SalvarContratoDto("outra", "outro", "", Modalidade.Spot, "", null, new CondicoesContrato { CarteiraId = "cart" },
            [new ItemEscopo { Id = "x", Descricao = "inventado", Quantidade = 1, ValorUnitario = 1 }], PropostaId: "p1", Clausulas: "Cláusula 1ª");

        var r = await svc.CriarAsync(tela);

        Assert.True(r.IsSuccess, r.Error);
        var c = contratos.Itens.Single();
        Assert.Equal(("matriz", "cli-1", Modalidade.Recorrente, "2026-12-01", "2027-11-30", "MRF-0001"), (c.EmpresaId, c.ClienteId, c.Modalidade, c.Inicio, c.Fim, c.PropostaNumero));
        Assert.Equal(["Posições-pallet"], c.Escopo.Single().Itens.Select(i => i.Descricao));
        Assert.Equal("p1", c.Escopo.Single().PropostaId);
        Assert.Equal("Cláusula 1ª", c.Clausulas);

        // A mesma proposta não vira dois contratos.
        Assert.Contains("já está no contrato", (await svc.CriarAsync(tela)).Error);
        // Sem proposta, só a cobrança avulsa (spot sem modelo).
        Assert.Contains("nasce de uma proposta", (await svc.CriarAsync(tela with { PropostaId = null, Modalidade = Modalidade.Recorrente, EmpresaId = "matriz", ClienteId = "cli-1" })).Error);

        // Editar não muda o escopo travado, mesmo que a tela mande outro.
        var editar = tela with { Inicio = "2026-12-01", Fim = "2027-11-30", Itens = [new ItemEscopo { Id = "y", Descricao = "mudado", Quantidade = 2, ValorUnitario = 5 }], PropostaId = null };
        Assert.True((await svc.AtualizarAsync(c.Id, editar)).IsSuccess);
        Assert.Single(contratos.Itens.Single().Escopo);

        // Aditivo: outra proposta aprovada do mesmo cliente vira a versão 2, a partir da data.
        propostas.Itens.Add(Recorrente("p2", "MRF-0007", Item("j1", "Posições-pallet (ampliação)", 15000m)));
        var ad = await svc.AtualizarAsync(c.Id, editar with { AditivoPropostaId = "p2", AditivoDesde = "2027-03-01" });
        Assert.True(ad.IsSuccess, ad.Error);
        var v2 = contratos.Itens.Single().Escopo.Single(v => v.Versao == 2);
        Assert.Equal(("2027-03-01", "MRF-0007", 15000m), (v2.VigenteDesde, v2.PropostaNumero, v2.Itens.Single().ValorUnitario));
        Assert.Empty(contratos.Itens.Single().Componentes);
    }

    private static (ContratoService Svc, Mem<Contrato> Contratos, Mem<Proposta> Propostas) Montar()
    {
        var contratos = new Mem<Contrato>();
        var propostas = new Mem<Proposta>();
        var empresas = new Mem<Empresa>();
        empresas.Itens.Add(new Empresa { Id = "matriz", Nome = "Mirai" });
        var clientes = new Mem<Cliente>();
        clientes.Itens.Add(new Cliente { Id = "cli-1", Nome = "Química Cubatão", CpfCnpj = "11.222.333/0001-81" });
        var svc = new ContratoService(contratos, new Mem<ModeloContrato>(), empresas, clientes, propostas, new Numerador(), new SemFaturamento(), new Quem(),
            new Fixo(new DateTimeOffset(2026, 11, 3, 15, 0, 0, TimeSpan.Zero)));
        return (svc, contratos, propostas);
    }

    private sealed class Numerador : IContratoNumerador
    {
        private int n;
        public Task<string> ProximoAsync(string empresaId) => Task.FromResult($"CT-{++n:0000}");
        public Task<long> EmitidosAsync(string empresaId) => Task.FromResult((long)n);
    }

    private sealed class Quem : IUsuarioAtualProvider
    {
        public Task<UsuarioAtual> QuemAsync() => Task.FromResult(new UsuarioAtual("u1", "Ana", "Gestor"));
        public string Ip => string.Empty;
    }

    private sealed class Fixo(DateTimeOffset agora) : TimeProvider
    {
        public override DateTimeOffset GetUtcNow() => agora;
        public override TimeZoneInfo LocalTimeZone => TimeZoneInfo.FindSystemTimeZoneById("America/Sao_Paulo");
    }

    private sealed class SemFaturamento : IFaturamentoService
    {
        public Task<List<Fatura>> SincronizarAsync(IReadOnlyList<Contrato> contratos) => Task.FromResult(new List<Fatura>());
        public Task<ContratosEFaturas> DoMesAsync(string competencia) => throw new NotSupportedException();
        public Task<Result<Fatura>> AvancarAsync(string id, string etapa, EtapaFaturaDto dados) => throw new NotSupportedException();
        public Task<Result<int>> ConferirLoteAsync(IReadOnlyList<string> ids) => throw new NotSupportedException();
    }

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
        public Task SalvarLoteAsync(IReadOnlyList<T> novos, IReadOnlyList<T> alterados) => Task.CompletedTask;
        public Task<bool> DeleteAsync(string id) => Task.FromResult(Itens.RemoveAll(e => e.Id == id) > 0);
    }
}

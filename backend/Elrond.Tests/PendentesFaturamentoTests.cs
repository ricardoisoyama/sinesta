using System.Linq.Expressions;
using System.Text.Json;
using Elrond.Application.DTOs;
using Elrond.Application.Interfaces;
using Elrond.Application.Services;
using Elrond.Domain.Common;
using Elrond.Domain.Entities;
using Elrond.Domain.Regras;

namespace Elrond.Tests;

public class PendentesFaturamentoTests
{
    private static readonly UsuarioAtual Eu = new("u1", "Ricardo", "Admin");
    // Chave do CT-e 23 da Filial (CNPJ 63.736.778/0002-64 nas posições 7 a 20).
    private const string ChaveFilial = "35261063736778000264570010000000231015382280";

    [Fact]
    public void Cnpj_do_emitente_sai_da_chave_do_cte()
    {
        Assert.Equal("63736778000264", FaturamentoPendente.CnpjDaChave(ChaveFilial));
        Assert.Equal(string.Empty, FaturamentoPendente.CnpjDaChave("123"));
    }

    [Theory]
    [InlineData("cte", 3, "", "", "", DocumentoFaturavel.Pendente)]
    [InlineData("cte", 4, "", "", "", DocumentoFaturavel.Cancelado)]
    [InlineData("cte", 0, "", "", "", DocumentoFaturavel.Incompleto)]
    [InlineData("cte", 3, "", "61", "", DocumentoFaturavel.FaturadoSiimp)]
    [InlineData("minuta", 10, "", "", "", DocumentoFaturavel.Incompleto)]   // sem NFS-e
    [InlineData("minuta", 10, "4512", "", "", DocumentoFaturavel.Pendente)]
    [InlineData("minuta", 6, "4512", "", "", DocumentoFaturavel.Cancelado)]
    [InlineData("cte", 3, "", "", "fat-1", DocumentoFaturavel.FaturadoElrond)] // faturado aqui não volta a pendente
    [InlineData("cte", 3, "", "61", "fat-1", DocumentoFaturavel.FaturadoElrond)]
    public void Situacao_do_documento(string tipo, int situacaoSiimp, string nfse, string faturaSiimp, string faturaElrond, string esperada)
    {
        var d = new DocumentoFaturavel { Tipo = tipo, SituacaoSiimp = situacaoSiimp, NfseNumero = nfse, FaturaId = faturaElrond };
        var (situacao, motivo) = FaturamentoPendente.Situar(d, faturaSiimp);
        Assert.Equal(esperada, situacao);
        if (faturaElrond.Length > 0 && faturaSiimp.Length > 0) Assert.Contains("duas vezes", motivo);
    }

    [Fact]
    public async Task Consulta_liga_empresa_e_cliente_e_separa_o_que_ja_tem_fatura()
    {
        var siimp = new SiimpFalsa
        {
            Documentos =
            {
                new("cte", 1001, "23", "1", ChaveFilial, 3, "2026-10-14", "2026-10-14", 9, "MIRAI", 501, "IFC LTDA", 2600m, "A → B", ""),
                new("cte", 1002, "24", "1", ChaveFilial, 3, "2026-10-14", "2026-10-14", 9, "MIRAI", 501, "IFC LTDA", 2600m, "A → B", ""),
                new("minuta", 2001, "56", "1", "", 10, "2026-10-16", "2026-10-16", 700, "", 502, "Outro", 300m, "RETIRADA", "4512"),
                new("cte", 1003, "25", "1", ChaveFilial, 4, "2026-10-15", "2026-10-15", 9, "MIRAI", 501, "IFC LTDA", 100m, "", ""),
            },
            Faturas = { new(61, 61, 3, 2600m, "2026-10-30", 6, "2026-10-15", 9) },
            Detalhes = { [61] = new[] { new DocumentoSiimp("CT-e", "24", "1", ChaveFilial, 2600m, CteId: 1002) } },
            Pessoas =
            {
                [501] = new(501, "IFC LTDA", "11.222.333/0001-81", "", "", "", "", "", "", "", "", ""),
                [502] = new(502, "Outro", "99.888.777/0001-66", "", "", "", "", "", "", "", "", ""),
                [700] = new(700, "MIRAI MATRIZ", "63.736.778/0001-83", "", "", "", "", "", "", "", "", ""),
            },
        };
        var (svc, docs, copias, clientes) = Montar(siimp);

        var r = await svc.ConsultarAsync("2026-10-01", "2026-10-31", Eu);
        Assert.True(r.IsSuccess, r.Error);
        var d = docs.Itens.ToDictionary(x => x.Id);
        Assert.Equal(DocumentoFaturavel.Pendente, d["cte-1001"].Situacao);
        Assert.Equal(("filial", "cli-ifc"), (d["cte-1001"].EmpresaId, d["cte-1001"].ClienteId)); // emitente pela chave; tomador pelo CNPJ
        Assert.Equal((DocumentoFaturavel.FaturadoSiimp, "61"), (d["cte-1002"].Situacao, d["cte-1002"].FaturaSiimp));
        Assert.Equal(DocumentoFaturavel.Cancelado, d["cte-1003"].Situacao);
        Assert.Equal("matriz", d["minuta-2001"].EmpresaId); // minuta: emitente pelo cadastro de pessoas
        // Tomador sem cadastro no ELROND vira cliente com os dados da SIIMP (e não se repete).
        Assert.Equal((2, 0, 1), (r.Value!.Pendentes, r.Value.SemCliente, r.Value.ClientesCriados));
        var novo = clientes.Itens.Single(c => c.Id == d["minuta-2001"].ClienteId);
        Assert.Equal(("Outro", "99.888.777/0001-66", "juridica"), (novo.Nome, novo.CpfCnpj, novo.Tipo));
        Assert.Single(copias.Itens);

        // Segunda consulta: a fatura emitida já lida não é buscada de novo; o que o ELROND faturou não volta a pendente.
        siimp.DetalhesLidos = 0;
        var faturado = docs.Itens.Single(x => x.Id == "cte-1001");
        faturado.FaturaId = "fat-elrond-1";
        await docs.UpdateAsync(faturado.Id, faturado);
        await svc.ConsultarAsync("2026-10-01", "2026-10-31", Eu);
        Assert.Equal(0, siimp.DetalhesLidos);
        Assert.Equal(DocumentoFaturavel.FaturadoElrond, docs.Itens.Single(x => x.Id == "cte-1001").Situacao);
        Assert.Equal(2, clientes.Itens.Count); // nenhum cliente repetido na segunda consulta
    }

    [Fact]
    public void Periodo_e_conferido_antes_de_consultar()
    {
        var (svc, _, _, _) = Montar(new SiimpFalsa());
        Assert.Null(svc.Validar("2026-10-01", "2026-10-31"));
        Assert.NotNull(svc.Validar("2026-10-31", "2026-10-01"));
        Assert.NotNull(svc.Validar("2026-01-01", "2026-12-31"));
        Assert.NotNull(new PendentesFaturamentoService(new SiimpFalsa { Configurado = false }, new MemRepo<DocumentoFaturavel>(), new MemRepo<FaturaSiimpLida>(),
            new MemRepo<PessoaSiimpLida>(), new MemRepo<Empresa>(), new MemRepo<Cliente>(), new FakeAuditoria(), TimeProvider.System).Validar("2026-10-01", "2026-10-31"));
    }

    private static (PendentesFaturamentoService, MemRepo<DocumentoFaturavel>, MemRepo<FaturaSiimpLida>, MemRepo<Cliente>) Montar(SiimpFalsa siimp)
    {
        var docs = new MemRepo<DocumentoFaturavel>();
        var copias = new MemRepo<FaturaSiimpLida>();
        var empresas = new MemRepo<Empresa>();
        empresas.Itens.Add(new Empresa { Id = "matriz", Nome = "Mirai - Matriz", Cnpj = "63.736.778/0001-83" });
        empresas.Itens.Add(new Empresa { Id = "filial", Nome = "Mirai - Filial 02", Cnpj = "63.736.778/0002-64" });
        var clientes = new MemRepo<Cliente>();
        clientes.Itens.Add(new Cliente { Id = "cli-ifc", Nome = "IFC", CpfCnpj = "11222333000181" });
        return (new PendentesFaturamentoService(siimp, docs, copias, new MemRepo<PessoaSiimpLida>(), empresas, clientes, new FakeAuditoria(), TimeProvider.System), docs, copias, clientes);
    }

    private sealed class SiimpFalsa : ISiimp
    {
        public bool Configurado { get; init; } = true;
        public List<DocumentoTransporteSiimp> Documentos { get; } = new();
        public List<FaturaSiimpResumo> Faturas { get; } = new();
        public Dictionary<long, DocumentoSiimp[]> Detalhes { get; } = new();
        public Dictionary<long, PessoaSiimp> Pessoas { get; } = new();
        public int DetalhesLidos { get; set; }

        public Task<RespostaSiimp<IReadOnlyList<DocumentoTransporteSiimp>>> DocumentosTransporteAsync(string de, string ate, CancellationToken ct = default) =>
            Task.FromResult(RespostaSiimp<IReadOnlyList<DocumentoTransporteSiimp>>.Ok(Documentos));
        public Task<RespostaSiimp<IReadOnlyList<FaturaSiimpResumo>>> FaturasParaConferirAsync(string desde, CancellationToken ct = default) =>
            Task.FromResult(RespostaSiimp<IReadOnlyList<FaturaSiimpResumo>>.Ok(Faturas));
        public Task<RespostaSiimp<IReadOnlyList<FaturaSiimpResumo>>> FaturasAsync(string de, string ate, CancellationToken ct = default) => FaturasParaConferirAsync(de, ct);
        public Task<RespostaSiimp<FaturaSiimp>> FaturaAsync(long id, CancellationToken ct = default)
        {
            DetalhesLidos++;
            var f = Faturas.Single(x => x.Id == id);
            return Task.FromResult(RespostaSiimp<FaturaSiimp>.Ok(new FaturaSiimp(f.Id, f.Numero, f.Situacao, f.Total, f.Vencimento, f.FormaPagamento, 0, "", "", "", "",
                Array.Empty<ParcelaSiimp>(), Detalhes.GetValueOrDefault(id) ?? Array.Empty<DocumentoSiimp>(), f.EmitenteId)));
        }
        public Task<RespostaSiimp<PessoaSiimp>> PessoaAsync(long id, CancellationToken ct = default) =>
            Task.FromResult(Pessoas.TryGetValue(id, out var p) ? RespostaSiimp<PessoaSiimp>.Ok(p) : RespostaSiimp<PessoaSiimp>.Falha("não achou"));
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

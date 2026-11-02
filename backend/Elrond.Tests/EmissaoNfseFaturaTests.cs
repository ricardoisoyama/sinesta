using System.Linq.Expressions;
using System.Text.Json;
using Elrond.Application.Common;
using Elrond.Application.DTOs;
using Elrond.Application.Interfaces;
using Elrond.Application.Services;
using Elrond.Domain.Common;
using Elrond.Domain.Entities;

namespace Elrond.Tests;

/// <summary>NFS-e da fatura: cada dado vem do seu cadastro (serviço, empresa, cliente), sem repetir.</summary>
public class EmissaoNfseFaturaTests
{
    private static (EmissaoNfseFatura Svc, Mem<Servico> Servicos, Mem<Empresa> Empresas, Mem<Cliente> Clientes, Fatura Fatura) Montar()
    {
        var fatura = new Fatura { Id = "fat-1", ContratoId = "ctr-1", EmpresaId = "filial", Competencia = "2026-09", Referencia = "set/2026", Total = 10000, Situacao = SituacaoFatura.Conferida };
        var faturas = new Mem<Fatura>(); faturas.Itens.Add(fatura);
        var contratos = new Mem<Contrato>();
        contratos.Itens.Add(new Contrato { Id = "ctr-1", Numero = "MIR-0007", EmpresaId = "filial", ClienteId = "cli-ifc", ServicoId = "srv-arm", TextoAdicionalNota = "Contêiner MNBU9228042" });
        var servicos = new Mem<Servico>();
        servicos.Itens.Add(new Servico
        {
            Id = "srv-arm", Nome = "Armazenagem",
            Fiscais =
            [
                new ServicoFiscal
                {
                    EmpresaId = "filial", ItemLc116 = "11.04", CodigoNacional = "110401", CodigoMunicipal = "370407", Cnae = "5211701", Nbs = "1.0601.10.00",
                    Descricao = "Armazenamento, depósito, carga e descarga", TributacaoIss = "NoMunicipio", CstPisCofins = "01",
                    IndicadorOperacao = "050101", CstIbsCbs = "000", ClassificacaoTributaria = "000001", TransparenciaAliquota = 0.1345m, TransparenciaFonte = "IBPT",
                    // Retenções desta empresa neste serviço (INSS não é retido).
                    RetencaoIr = 0.015m, RetencaoPis = 0.0065m, RetencaoCofins = 0.03m, RetencaoCsll = 0.01m,
                },
            ],
            Impostos = [new ImpostoServico { Id = "iss", Imposto = "iss", Base = 1m, Aliquota = 0.027m, Regime = "Lucro Presumido" }],
        });
        var empresas = new Mem<Empresa>();
        empresas.Itens.Add(new Empresa
        {
            Id = "filial", Nome = "Mirai - Filial 02", Regime = "Lucro Presumido",
        });
        var clientes = new Mem<Cliente>();
        clientes.Itens.Add(new Cliente
        {
            Id = "cli-ifc", Nome = "I.F.C. INDUSTRIA E COMERCIO", CpfCnpj = "02.544.042/0001-19", Cidade = "Itu - SP",
            Endereco = new Endereco { Cep = "13312-250", Logradouro = "AV PRIMO SCHINCARIOL", Numero = "670", Bairro = "JD OLIVEIRA" },
        });
        var svc = new EmissaoNfseFatura(faturas, contratos, servicos, clientes, empresas, new Cidades(), new SemNfse(), new SemFaturamento(), TimeProvider.System);
        return (svc, servicos, empresas, clientes, fatura);
    }

    [Fact]
    public async Task Monta_a_nota_com_o_servico_seus_impostos_e_retencoes_e_o_cliente()
    {
        var (svc, _, _, _, fatura) = Montar();
        var r = await svc.MontarAsync(fatura);
        Assert.True(r.IsSuccess, r.Error);
        var p = r.Value!;
        // Serviço: códigos e textos.
        Assert.Equal(("370407", "11.04", "1.0601.10.00", "5211701", "01"), (p.Servico.CodigoMunicipal, p.Servico.ItemLc116, p.Servico.Nbs, p.Servico.Cnae, p.Servico.CstPisCofins));
        Assert.Equal("Armazenamento, depósito, carga e descarga · set/2026 · Contêiner MNBU9228042", p.Servico.Descricao);
        Assert.Equal(("050101", "000001", "000"), (p.IbsCbs!.IndicadorOperacao, p.IbsCbs.ClassificacaoTributaria, p.IbsCbs.Cst));
        // Serviço: ISS da tabela do regime e as retenções dos dados fiscais (INSS não).
        Assert.Equal((0.027m, false), (p.Iss!.Aliquota, p.Iss.RetidoPeloTomador));
        Assert.Equal((150m, 65m, 300m, 100m, 0m, 0m), (p.Retencoes!.Ir, p.Retencoes.Pis, p.Retencoes.Cofins, p.Retencoes.Csll, p.Retencoes.Inss, p.Retencoes.Iss));
        // Cliente: tomador com o IBGE da cidade.
        Assert.Equal(("juridica", "02544042000119", "3523909", "SP"), (p.Tomador.Tipo, p.Tomador.Documento, p.Tomador.Endereco!.CodigoIbge, p.Tomador.Endereco.Uf));
        Assert.Equal(new DateOnly(2026, 9, 30), p.Competencia);
        Assert.Equal("MIR-0007", p.NumeroPedido);
        Assert.Contains("IBPT", p.InformacoesAdicionais);
        Assert.Equal(("fatura-contrato", "fat-1"), (p.Origem!.Tipo, p.Origem.Id));
    }

    [Fact]
    public async Task Sem_descontar_impostos_nao_retem_nada()
    {
        var (svc, servicos, _, _, fatura) = Montar();
        servicos.Itens[0].Fiscais[0].DescontarImpostos = false;
        var p = (await svc.MontarAsync(fatura)).Value!;
        Assert.Equal(0m, p.Retencoes!.Total);
    }

    [Fact]
    public async Task Diz_o_que_falta_cadastrar()
    {
        var (svc, servicos, empresas, clientes, fatura) = Montar();
        servicos.Itens[0].Fiscais[0].EmpresaId = "matriz";
        Assert.Contains("não tem dados fiscais para a Mirai - Filial 02", (await svc.MontarAsync(fatura)).Error);

        servicos.Itens[0].Fiscais[0].EmpresaId = "filial";
        servicos.Itens[0].Fiscais[0].ClassificacaoTributaria = "";
        Assert.Contains("Lucro Presumido", (await svc.MontarAsync(fatura)).Error);

        servicos.Itens[0].Fiscais[0].ClassificacaoTributaria = "000001";
        clientes.Itens[0].Endereco!.Bairro = "";
        Assert.Contains("bairro", (await svc.MontarAsync(fatura)).Error);
        _ = empresas;
    }

    // ── dublês ──

    private sealed class Cidades : ICidadeRepository
    {
        public Task<IReadOnlyList<Cidade>> BuscarAsync(string termo, int limite, string? uf = null, CancellationToken ct = default) =>
            Task.FromResult<IReadOnlyList<Cidade>>(termo == "Itu" ? [new Cidade { Id = "3523909", Nome = "Itu", Uf = "SP" }] : []);
        public Task<Cidade?> PorIbgeAsync(string ibge, CancellationToken ct = default) => Task.FromResult<Cidade?>(null);
    }

    private sealed class SemNfse : INfseService
    {
        public Task<Result<NotaFiscalServicoDto>> EmitirAsync(PedidoNfseDto pedido, CancellationToken ct = default) => throw new NotSupportedException();
        public Task<NotaFiscalServicoDto?> ObterAsync(string id, CancellationToken ct = default) => Task.FromResult<NotaFiscalServicoDto?>(null);
        public Task<IReadOnlyList<NotaFiscalServicoDto>> ListarAsync(string? empresaId, int quantidade = 50, CancellationToken ct = default) => throw new NotSupportedException();
        public Task<Result<NotaFiscalServicoDto>> AtualizarAsync(string id, CancellationToken ct = default) => throw new NotSupportedException();
        public Task<int> AcompanharAsync(CancellationToken ct = default) => throw new NotSupportedException();
        public Task<Result<NotaFiscalServicoDto>> CancelarAsync(string id, string motivo, CancellationToken ct = default) => throw new NotSupportedException();
        public Task<Result<ArquivoNfse>> BaixarAsync(string id, TipoArquivoNfse tipo, CancellationToken ct = default) => throw new NotSupportedException();
        public Task ProcessarAvisoAsync(AvisoNfse aviso, CancellationToken ct = default) => throw new NotSupportedException();
        public Task<ConfiguracaoFiscalDto?> ObterConfiguracaoAsync(string empresaId, CancellationToken ct = default) => throw new NotSupportedException();
        public Task<Result<ConfiguracaoFiscalDto>> SalvarConfiguracaoAsync(string empresaId, ConfiguracaoFiscalDto configuracao, CancellationToken ct = default) => throw new NotSupportedException();
    }

    private sealed class SemFaturamento : IFaturamentoService
    {
        public Task<List<Fatura>> SincronizarAsync(IReadOnlyList<Contrato> contratos) => throw new NotSupportedException();
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

using System.Linq.Expressions;
using System.Text.Json;
using Elrond.Application.Common;
using Elrond.Application.DTOs;
using Elrond.Application.Interfaces;
using Elrond.Application.Services;
using Elrond.Domain.Common;
using Elrond.Domain.Entities;
using Microsoft.Extensions.Logging.Abstractions;

namespace Elrond.Tests;

/// <summary>Fatura ao cliente a partir dos documentos da SIIMP: numeração, lançamento, boleto, e-mail, cancelamento e baixa.</summary>
public class FaturaClienteTests
{
    private static readonly UsuarioAtual Ricardo = new("u-ric", "Ricardo", "Gestor", true);

    private sealed class Cenario
    {
        public required FaturaClienteService Svc { get; init; }
        public required Mem<FaturaCliente> Faturas { get; init; }
        public required Mem<DocumentoFaturavel> Docs { get; init; }
        public required Mem<Movimento> Movs { get; init; }
        public required Mem<CobrancaBancaria> Cobrancas { get; init; }
        public required Mem<Cliente> Clientes { get; init; }
        public required Smtp Smtp { get; init; }
        public required SiimpTeste Siimp { get; init; }
        public required FinanceiroService Financeiro { get; init; }
    }

    private static DocumentoFaturavel Minuta(long id, string numero, decimal valor, string nfse, string cliente = "cli-ifc") => new()
    {
        Id = $"minuta-{id}", Tipo = "minuta", SiimpId = id, Numero = numero, Serie = "1", Situacao = DocumentoFaturavel.Pendente,
        EmpresaId = "filial", ClienteId = cliente, CriadoEm = "2026-10-15", Emissao = "2026-10-15", Valor = valor, NfseNumero = nfse,
    };

    private static Cenario Montar()
    {
        var faturas = new Mem<FaturaCliente>();
        var docs = new Mem<DocumentoFaturavel>();
        docs.Itens.AddRange([Minuta(242791, "51", 3437.37m, "59"), Minuta(242837, "53", 6874.10m, "61"), Minuta(999, "70", 100m, "70", cliente: "cli-outro")]);
        var clientes = new Mem<Cliente>();
        clientes.Itens.Add(new Cliente
        {
            Id = "cli-ifc", Nome = "I.F.C. INDUSTRIA E COMERCIO DE CONDUTORES ELETRICOS LTDA", CpfCnpj = "02.544.042/0001-19", InscricaoEstadual = "387086243118",
            Cidade = "Itu - SP", Endereco = new Endereco { Cep = "13312-250", Logradouro = "AV PRIMO SCHINCARIOL", Numero = "670", Complemento = "CX.POST. 414", Bairro = "JD OLIVEIRA" },
            Email = "contabil@cobrecom.com.br", Telefone = "(11) 2118-3200", CentroCustoId = "cc-comercial", PrazoPagamentoDias = 8,
            VencimentoFimDeSemana = VencimentoFimDeSemana.Postergar,
            Contatos =
            [
                new ContatoParceiro { Id = "c1", Nome = "Neto Silva", Email = "neto@cobrecom.com.br", RecebeFatura = true, RecebeBoleto = true, RecebeNotaFiscal = true },
                new ContatoParceiro { Id = "c2", Nome = "Contabilidade", Email = "contabil@cobrecom.com.br", RecebeNotaFiscal = true },
                new ContatoParceiro { Id = "c3", Nome = "Vendas", Email = "vendas@cobrecom.com.br" },
            ],
        });
        clientes.Itens.Add(new Cliente { Id = "cli-outro", Nome = "Outro", CpfCnpj = "11.222.333/0001-81" });
        var empresas = new Mem<Empresa>();
        empresas.Itens.Add(new Empresa
        {
            Id = "filial", Nome = "Mirai - Filial 02", RazaoSocial = "MIRAI SOLUCOES LOGISTICAS E EMPRESARIAIS LTDA", Cnpj = "63.736.778/0002-64", Endereco = "São Vicente - SP",
            Faturamento = new FaturamentoEmpresa { CarteiraId = "inter-filial", PlanoContaCte = "p-cte", PlanoContaMinuta = "p-nfe", Email = "financeiro@mirai.log.br", Telefone = "(13) 99717-4540" },
        });
        var centros = new Mem<CategoriaCusto>();
        centros.Itens.Add(new CategoriaCusto { Id = "cc-comercial", Nome = "Comercial" });
        var carteiras = new Mem<Carteira>();
        carteiras.Itens.Add(new Carteira { Id = "inter-filial", Nome = "Inter Filial", EmpresaId = "filial" });
        var planos = new Mem<PlanoConta>();
        planos.Itens.AddRange([new PlanoConta { Id = "p-cte", Nome = "RECEITAS DE VENDA DE CT-e" }, new PlanoConta { Id = "p-nfe", Nome = "RECEITAS DE VENDA DE NF-e" }]);
        var movs = new Mem<Movimento>();
        var cobrancas = new Mem<CobrancaBancaria>();
        var pessoas = new Mem<PessoaSiimpLida>();
        pessoas.Itens.Add(new PessoaSiimpLida { Id = "247577", Nome = "MIRAI", Documento = "63736778000264" });
        var relogio = new Relogio(new DateTimeOffset(2026, 10, 23, 12, 0, 0, TimeSpan.Zero)); // 09:00 em Brasília (sexta)
        var auditoria = new Auditoria();
        var financeiro = new FinanceiroService(movs, carteiras, new Mem<RegraAprovacao>(), new Mem<ExtratoLinha>(), new SemTransacao(), auditoria, new Sequencia());
        var smtp = new Smtp();
        var config = new Mem<ConfiguracaoSmtp>();
        config.Itens.Add(new ConfiguracaoSmtp { Host = "smtp.exemplo.com", Ativo = true, SomenteTeste = false, RemetenteEmail = "elrond@exemplo.com" });
        var email = new EmailService(config, new Mem<EmailEnviado>(), smtp, new SemCofre(), auditoria, relogio);
        var siimp = new SiimpTeste();
        var svc = new FaturaClienteService(faturas, docs, clientes, empresas, centros, carteiras, planos, movs, cobrancas, pessoas, new Mem<NumeracaoDocumento>(),
            siimp, new Numerador(), new SemTransacao(), financeiro, new CobrancaTeste(cobrancas), email, auditoria, relogio, NullLogger<FaturaClienteService>.Instance);
        return new Cenario { Svc = svc, Faturas = faturas, Docs = docs, Movs = movs, Cobrancas = cobrancas, Clientes = clientes, Smtp = smtp, Siimp = siimp, Financeiro = financeiro };
    }

    private static FaturarDto Docs(params string[] ids) => new(ids.ToList());

    [Fact]
    public async Task Fatura_continua_a_numeracao_da_siimp_lanca_emite_boleto_e_manda_cada_contato_com_os_seus_anexos()
    {
        var c = Montar();
        var r = await c.Svc.FaturarAsync(Docs("minuta-242791", "minuta-242837"), Ricardo);
        Assert.True(r.IsSuccess, r.Error);
        Assert.True(r.Value!.Avisos.Count == 0, string.Join(" | ", r.Value.Avisos.Concat(c.Faturas.Itens.SelectMany(x => x.Envios).Select(e => $"{e.Para}: {e.Erro}"))));
        var f = c.Faturas.Itens.Single();

        // SIIMP estava na 50 para o CNPJ da filial: o ELROND continua na 51.
        Assert.Equal(51, f.Numero);
        Assert.Equal(10311.47m, f.Total);
        Assert.Equal("minuta", f.Tipo);
        Assert.Equal("Comercial", f.CentroCustoNome);
        // Prazo de 8 dias cai no sábado 31/10; o cliente posterga para segunda.
        Assert.Equal("2026-11-02", f.Vencimento);
        // Detalhe lido na hora (a consulta não tinha lido): peso e valor da carga somados.
        Assert.Equal(2, c.Siimp.DetalhesLidos);
        Assert.Equal(49120m, f.PesoTotal);

        // Lançamento a receber, já aprovado, no plano da minuta e na conta da empresa.
        var m = c.Movs.Itens.Single();
        Assert.Equal(("receber", "aprovado", 10311.47m, "p-nfe", "inter-filial", "fatura", f.Id), (m.Tipo, m.Aprovacao, m.Valor, m.PlanoContaId, m.CarteiraId, m.Origem, m.OrigemId));
        Assert.Equal(m.Id, f.MovimentoId);

        // Documentos ficam faturados pelo ELROND (não voltam como pendentes).
        Assert.All(c.Docs.Itens.Where(d => d.ClienteId == "cli-ifc"), d => Assert.Equal((DocumentoFaturavel.FaturadoElrond, f.Id), (d.Situacao, d.FaturaId)));

        // Boleto com o número da fatura.
        var boleto = c.Cobrancas.Itens.Single();
        Assert.Equal(("fatura", f.Id, 10311.47m, "2026-11-02"), (boleto.OrigemTipo, boleto.OrigemId, boleto.Valor, boleto.Vencimento));

        // E-mail: Neto recebe tudo; a contabilidade só as NFS-e; Vendas (nada marcado) não recebe.
        Assert.Equal(2, c.Smtp.Enviadas.Count);
        var neto = c.Smtp.Enviadas.Single(e => e.Para == "neto@cobrecom.com.br");
        Assert.Equal(["Boleto fatura 51.pdf", "Fatura 51.pdf", "NFS-e 59.pdf", "NFS-e 61.pdf"], neto.Anexos!.Select(a => a.Nome));
        Assert.Equal("Fatura 51", neto.Assunto);
        Assert.Equal("financeiro@mirai.log.br", neto.Copia);
        Assert.StartsWith("Neto, bom dia!", neto.Texto);
        Assert.Contains("faturamento ref. fatura n° 51", neto.Texto);
        Assert.Contains("- Boleto", neto.Texto);
        Assert.Contains("- NFSe", neto.Texto);
        var contab = c.Smtp.Enviadas.Single(e => e.Para == "contabil@cobrecom.com.br");
        Assert.Equal(["NFS-e 59.pdf", "NFS-e 61.pdf"], contab.Anexos!.Select(a => a.Nome));
        Assert.Equal(2, c.Faturas.Itens.Single().Envios.Count);
    }

    [Fact]
    public async Task Proxima_fatura_da_empresa_segue_a_sequencia_e_a_previa_nao_grava_nada()
    {
        var c = Montar();
        var previa = await c.Svc.PreviaAsync(Docs("minuta-242791"));
        Assert.True(previa.IsSuccess, previa.Error);
        Assert.StartsWith("%PDF", System.Text.Encoding.ASCII.GetString(previa.Value!, 0, 4));
        Assert.Empty(c.Faturas.Itens);
        Assert.Empty(c.Movs.Itens);

        Assert.True((await c.Svc.FaturarAsync(Docs("minuta-242791") with { Enviar = false }, Ricardo)).IsSuccess);
        Assert.True((await c.Svc.FaturarAsync(Docs("minuta-242837") with { Enviar = false }, Ricardo)).IsSuccess);
        Assert.Equal([51L, 52L], c.Faturas.Itens.Select(f => f.Numero).Order());
    }

    [Fact]
    public async Task Recusa_documentos_de_clientes_diferentes_ou_ja_faturados()
    {
        var c = Montar();
        var misturados = await c.Svc.FaturarAsync(Docs("minuta-242791", "minuta-999"), Ricardo);
        Assert.Contains("clientes diferentes", misturados.Error);

        Assert.True((await c.Svc.FaturarAsync(Docs("minuta-242791") with { Enviar = false }, Ricardo)).IsSuccess);
        var deNovo = await c.Svc.FaturarAsync(Docs("minuta-242791"), Ricardo);
        Assert.Contains("não está pendente", deNovo.Error);
        Assert.Single(c.Faturas.Itens);
    }

    [Fact]
    public async Task Sugestao_traz_os_padroes_e_avisa_quem_vai_receber()
    {
        var c = Montar();
        var s = await c.Svc.SugerirAsync(Docs("minuta-242791", "minuta-242837"));
        Assert.True(s.IsSuccess, s.Error);
        Assert.Equal(("2026-11-02", "postergar", "cc-comercial", "p-nfe", "inter-filial", 51L), (s.Value!.Vencimento, s.Value.VencimentoRegra, s.Value.CentroCustoId, s.Value.PlanoContaId, s.Value.CarteiraId, s.Value.NumeroProvavel));
        Assert.Equal(["neto@cobrecom.com.br", "contabil@cobrecom.com.br"], s.Value.Destinatarios.Select(d => d.Email));
        Assert.Empty(s.Value.Avisos);
    }

    [Fact]
    public async Task Cancelar_cancela_boleto_e_lancamento_e_devolve_os_documentos()
    {
        var c = Montar();
        var f = (await c.Svc.FaturarAsync(Docs("minuta-242791") with { Enviar = false }, Ricardo)).Value!.Fatura.Fatura;
        Assert.Contains("motivo", (await c.Svc.CancelarAsync(f.Id, " ", Ricardo)).Error);
        var r = await c.Svc.CancelarAsync(f.Id, "Valor errado", Ricardo);
        Assert.True(r.IsSuccess, r.Error);
        Assert.Equal(CobrancaBancaria.Cancelada, c.Cobrancas.Itens.Single().Situacao);
        Assert.True(c.Movs.Itens.Single().Cancelado);
        var doc = c.Docs.Itens.Single(d => d.Id == "minuta-242791");
        Assert.Equal((DocumentoFaturavel.Pendente, ""), (doc.Situacao, doc.FaturaId));
        Assert.Equal(SituacaoFaturaCliente.Cancelada, c.Faturas.Itens.Single().Situacao);
        // O número não volta: a próxima é a 52.
        Assert.Equal(52, (await c.Svc.FaturarAsync(Docs("minuta-242791") with { Enviar = false }, Ricardo)).Value!.Fatura.Fatura.Numero);
    }

    [Fact]
    public async Task Boleto_pago_baixa_o_lancamento_da_fatura()
    {
        var c = Montar();
        var f = (await c.Svc.FaturarAsync(Docs("minuta-242791") with { Enviar = false }, Ricardo)).Value!.Fatura.Fatura;
        var boleto = c.Cobrancas.Itens.Single();
        boleto.Situacao = CobrancaBancaria.Recebida;
        boleto.RecebidaEm = "2026-11-02";
        boleto.ValorRecebido = 3440.00m; // pagou com atraso: a diferença entra como juros
        var baixa = new BaixaDaFaturaPeloBoleto(c.Faturas, c.Movs, c.Financeiro, new Auditoria(), NullLogger<BaixaDaFaturaPeloBoleto>.Instance);
        await baixa.AoReceberAsync(boleto);
        var m = c.Movs.Itens.Single();
        Assert.Equal(("2026-11-02", 3440.00m, 2.63m), (m.PagoEm, m.ValorPago, m.Juros));
        Assert.Contains(c.Faturas.Itens.Single().Eventos, e => e.Texto.StartsWith("Recebida em 02/11/2026"));
        // Cancelar fatura recebida não pode.
        Assert.Contains("já foi recebida", (await c.Svc.CancelarAsync(f.Id, "teste", Ricardo)).Error);
    }

    [Theory]
    [InlineData("2026-10-31", "postergar", "2026-11-02")]
    [InlineData("2026-11-01", "postergar", "2026-11-02")]
    [InlineData("2026-10-31", "antecipar", "2026-10-30")]
    [InlineData("2026-11-01", "antecipar", "2026-10-30")]
    [InlineData("2026-10-31", "manter", "2026-10-31")]
    [InlineData("2026-10-28", "postergar", "2026-10-28")]
    public void Vencimento_no_fim_de_semana_segue_a_regra_do_cliente(string data, string regra, string esperado) =>
        Assert.Equal(esperado, VencimentoFimDeSemana.Ajustar(DateOnly.Parse(data), regra).ToString("yyyy-MM-dd"));

    [Theory]
    [InlineData("Itu - SP", "Itu", "SP")]
    [InlineData("São Vicente - SP", "São Vicente", "SP")]
    [InlineData("Três Lagoas", "Três Lagoas", "")]
    public void Separa_cidade_e_uf(string texto, string cidade, string uf) =>
        Assert.Equal((cidade, uf), FaturaClienteService.CidadeUf(texto));

    // ── dublês ──

    private sealed class SiimpTeste : ISiimp
    {
        public int DetalhesLidos { get; private set; }
        public bool Configurado => true;
        public Task<RespostaSiimp<IReadOnlyList<FaturaSiimpResumo>>> FaturasAsync(string de, string ate, CancellationToken ct = default) => throw new NotSupportedException();
        public Task<RespostaSiimp<FaturaSiimp>> FaturaAsync(long id, CancellationToken ct = default) => throw new NotSupportedException();
        public Task<RespostaSiimp<PessoaSiimp>> PessoaAsync(long id, CancellationToken ct = default) => throw new NotSupportedException();
        public Task<RespostaSiimp<IReadOnlyList<DocumentoTransporteSiimp>>> DocumentosTransporteAsync(string de, string ate, CancellationToken ct = default) => throw new NotSupportedException();
        public Task<RespostaSiimp<IReadOnlyList<FaturaSiimpResumo>>> FaturasParaConferirAsync(string desde, CancellationToken ct = default) => throw new NotSupportedException();
        public Task<RespostaSiimp<DetalheTransporteSiimp>> DetalheTransporteAsync(string tipo, long id, CancellationToken ct = default)
        {
            DetalhesLidos++;
            var (total, peso, carga, seguro, nfse, nfseId, nfs) = id == 242791
                ? (3437.37m, 24560m, 217379.06m, 217.37m, "59", 4624L, new[] { new NfTransporteSiimp(3703233, "1", "489834", "2026-10-09", 24560m, 217379.06m) })
                : (6874.10m, 24560m, 434106.82m, 434.10m, "61", 4626L, Array.Empty<NfTransporteSiimp>());
            return Task.FromResult(RespostaSiimp<DetalheTransporteSiimp>.Ok(new DetalheTransporteSiimp(tipo, id, total, peso, carga, 0, seguro, 0, 0, nfseId, nfse, 664, nfs)));
        }
        public Task<RespostaSiimp<IReadOnlyDictionary<long, long>>> UltimasFaturasAsync(string desde, CancellationToken ct = default) =>
            Task.FromResult(RespostaSiimp<IReadOnlyDictionary<long, long>>.Ok(new Dictionary<long, long> { [247577] = 50, [239362] = 61 }));
        public Task<RespostaSiimp<ArquivoSiimp>> DacteAsync(long cteId, CancellationToken ct = default) =>
            Task.FromResult(RespostaSiimp<ArquivoSiimp>.Ok(new ArquivoSiimp("%PDF dacte"u8.ToArray(), "application/pdf")));
        public Task<RespostaSiimp<ArquivoSiimp>> NfsePdfAsync(long nfseId, CancellationToken ct = default) =>
            Task.FromResult(RespostaSiimp<ArquivoSiimp>.Ok(new ArquivoSiimp("%PDF nfse"u8.ToArray(), "application/pdf")));
    }

    private sealed class CobrancaTeste(Mem<CobrancaBancaria> gravadas) : ICobrancaService
    {
        public async Task<Result<CobrancaBancaria>> EmitirAsync(string empresaId, OrigemCobranca origem, NovaCobranca pedido, CancellationToken ct = default)
        {
            var c = new CobrancaBancaria
            {
                Id = Guid.NewGuid().ToString(), EmpresaId = empresaId, Banco = "inter", OrigemTipo = origem.Tipo, OrigemId = origem.Id, OrigemParcelaId = origem.ParcelaId,
                SeuNumero = $"{gravadas.Itens.Count + 1:D6}", Valor = pedido.Valor, Vencimento = pedido.Vencimento, Situacao = CobrancaBancaria.AReceber,
            };
            await gravadas.AddAsync(c);
            return Result.Success(c);
        }
        public string? ConferirPedido(NovaCobranca p) => p.Pagador.Cep.Length == 0 ? "Faltam dados do pagador para o boleto: CEP." : null;
        public Task<Result<byte[]>> PdfAsync(string id, CancellationToken ct = default) => Task.FromResult(Result.Success("%PDF boleto"u8.ToArray()));
        public async Task<Result<CobrancaBancaria>> CancelarAsync(string id, string motivo, CancellationToken ct = default)
        {
            var c = (await gravadas.GetByIdAsync(id))!;
            c.Situacao = CobrancaBancaria.Cancelada;
            await gravadas.UpdateAsync(id, c);
            return Result.Success(c);
        }
        public Task<List<CobrancaBancaria>> ListarAsync(string empresaId, string? origemTipo = null, string? origemId = null) => gravadas.GetAllAsync();
        public Task<Result<CobrancaBancaria>> AtualizarAsync(string id, CancellationToken ct = default, string origem = "tela") => throw new NotSupportedException();
        public Task<Result<int>> ReceberAvisoAsync(string token, string corpo, CancellationToken ct = default) => throw new NotSupportedException();
        public Task<int> ConferirAbertasAsync(CancellationToken ct = default) => Task.FromResult(0);
    }

    private sealed class Numerador : INumeradorDocumentos
    {
        private readonly Dictionary<string, long> _ultimos = new();
        public Task<long> ProximoAsync(string empresaId, string tipo, long minimoUltimo = 0)
        {
            var chave = $"{empresaId}:{tipo}";
            _ultimos[chave] = Math.Max(_ultimos.GetValueOrDefault(chave), minimoUltimo) + 1;
            return Task.FromResult(_ultimos[chave]);
        }
    }

    private sealed class Relogio(DateTimeOffset agora) : TimeProvider
    {
        public override DateTimeOffset GetUtcNow() => agora;
    }

    private sealed class Smtp : IEnvioSmtp
    {
        public List<MensagemEmail> Enviadas { get; } = new();
        public Task<string?> EnviarAsync(ServidorSmtp servidor, MensagemEmail mensagem, CancellationToken ct = default)
        {
            Enviadas.Add(mensagem);
            return Task.FromResult<string?>(null);
        }
    }

    private sealed class SemCofre : ICofreSegredos
    {
        public bool Configurado => false;
        public byte[] Fechar(string contexto, string valor) => Array.Empty<byte>();
        public string Abrir(string contexto, byte[] cifrado) => string.Empty;
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

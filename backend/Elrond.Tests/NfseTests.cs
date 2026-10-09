using System.Linq.Expressions;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Elrond.Application.DTOs;
using Elrond.Application.Interfaces;
using Elrond.Application.Services;
using Elrond.Application.Validators;
using Elrond.Domain.Common;
using Elrond.Domain.Entities;
using Elrond.Domain.Regras;
using Elrond.Infrastructure.Integracoes.NfeIo;
using Elrond.Infrastructure.Integracoes.Simulador;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace Elrond.Tests;

/// <summary>Pedidos de exemplo: BM (São Vicente) limpando um condomínio em Santos.</summary>
internal static class Exemplo
{
    public static readonly EnderecoNfseDto Santos = new("11010-000", "Rua do Comércio", "100", "Centro", "3548500", "SP", "Santos");

    public static PedidoNfseDto Pedido(string descricao = "Limpeza e conservação - competência 10/2026", RetencoesNfseDto? retencoes = null) => new(
        EmpresaId: "bm",
        Tomador: new TomadorNfseDto("juridica", "CONDOMINIO EDIFICIO MAR", "11.222.333/0001-81", Email: "sindico@mar.com.br", Endereco: Santos),
        Servico: new ServicoNfseDto("07.10.01", "07.10", "1.1803.10.00", descricao),
        Valores: new ValoresNfseDto(25000m),
        Iss: new IssNfseDto(TributacaoIss.ForaDoMunicipio, 0.05m, RetidoPeloTomador: true),
        Retencoes: retencoes,
        IbsCbs: new IbsCbsNfseDto("020201", "000001"),
        Competencia: new DateOnly(2026, 10, 1),
        LocalPrestacao: Santos,
        EnderecoImovel: Santos,
        NumeroPedido: "BM-0012");
}

public class DocumentoFiscalTests
{
    [Theory]
    [InlineData("11.222.333/0001-81", true)]
    [InlineData("11.222.333/0001-82", false)]
    [InlineData("00000000000000", false)]
    public void Cnpj(string cnpj, bool valido) => Assert.Equal(valido, DocumentoFiscal.CnpjValido(cnpj));

    [Theory]
    [InlineData("529.982.247-25", true)]
    [InlineData("529.982.247-24", false)]
    [InlineData("111.111.111-11", false)]
    public void Cpf(string cpf, bool valido) => Assert.Equal(valido, DocumentoFiscal.CpfValido(cpf));

    [Fact]
    public void IbgeCombinaComAUf()
    {
        Assert.True(DocumentoFiscal.IbgeDaUf("3548500", "SP"));
        Assert.False(DocumentoFiscal.IbgeDaUf("3548500", "RJ"));
        Assert.False(DocumentoFiscal.IbgeDaUf("354850", "SP"));
    }

    [Fact]
    public void OperacaoComImovelExigeEndereco()
    {
        Assert.True(RegrasNfse.ExigeEnderecoImovel("020201"));
        Assert.False(RegrasNfse.ExigeEnderecoImovel("100301"));
    }
}

public class PedidoNfseValidatorTests
{
    private static readonly PedidoNfseValidator V = new();

    [Fact]
    public void PedidoCompletoPassa() => Assert.True(V.Validate(Exemplo.Pedido()).IsValid);

    [Fact]
    public void LimpezaSemEnderecoDoImovelEhRecusada()
    {
        var r = V.Validate(Exemplo.Pedido() with { EnderecoImovel = null });
        Assert.Contains(r.Errors, e => e.ErrorMessage.Contains("endereço do imóvel"));
    }

    [Fact]
    public void IssForaDoMunicipioExigeLocalDaPrestacao()
    {
        var r = V.Validate(Exemplo.Pedido() with { LocalPrestacao = null, IbsCbs = new IbsCbsNfseDto("100301", "000001") });
        Assert.Contains(r.Errors, e => e.ErrorMessage.Contains("local da prestação"));
    }

    [Fact]
    public void ConfereDocumentoNbsLc116EValores()
    {
        var p = Exemplo.Pedido();
        var r = V.Validate(p with
        {
            Tomador = p.Tomador with { Documento = "11.222.333/0001-82" },
            Servico = p.Servico with { Nbs = "1234", ItemLc116 = "7.10" },
            Valores = new ValoresNfseDto(0),
        });
        var mensagens = string.Join(" | ", r.Errors.Select(e => e.ErrorMessage));
        Assert.Contains("CNPJ inválido", mensagens);
        Assert.Contains("NBS com 9 dígitos", mensagens);
        Assert.Contains("LC 116", mensagens);
        Assert.Contains("maior que zero", mensagens);
    }

    [Fact]
    public void RetencoesNaoPassamDoValor()
    {
        var r = V.Validate(Exemplo.Pedido(retencoes: new RetencoesNfseDto(Inss: 30000m)));
        Assert.Contains(r.Errors, e => e.ErrorMessage.Contains("soma das retenções"));
    }
}

public class NfeIoMapeadorTests
{
    private static JsonElement Emissao(PedidoNfseDto p) => JsonDocument.Parse(NfeIoMapeador.ParaEmissao(p, "nota-1")).RootElement;

    [Fact]
    public void TraduzOPedidoNoFormatoDaNfeIo()
    {
        var j = Emissao(Exemplo.Pedido());
        Assert.Equal("nota-1", j.GetProperty("externalId").GetString());
        Assert.Equal("118031000", j.GetProperty("nbsCode").GetString());
        Assert.Equal("07.10", j.GetProperty("federalServiceCode").GetString());
        Assert.Equal(25000m, j.GetProperty("servicesAmount").GetDecimal());
        Assert.Equal("2026-10-01", j.GetProperty("accrualOn").GetString());
        Assert.Equal("OutsideCity", j.GetProperty("taxationType").GetString());
        Assert.Equal("WithheldByBuyer", j.GetProperty("retentionType").GetString());
        Assert.Equal(0.05m, j.GetProperty("issRate").GetDecimal());

        var tomador = j.GetProperty("borrower");
        Assert.Equal("LegalEntity", tomador.GetProperty("type").GetString());
        Assert.Equal(JsonValueKind.Number, tomador.GetProperty("federalTaxNumber").ValueKind);
        Assert.Equal(11222333000181, tomador.GetProperty("federalTaxNumber").GetInt64());
        Assert.Equal("11010-000", tomador.GetProperty("address").GetProperty("postalCode").GetString());
        Assert.Equal("3548500", tomador.GetProperty("address").GetProperty("city").GetProperty("code").GetString());

        Assert.Equal("020201", j.GetProperty("ibsCbs").GetProperty("operationIndicator").GetString());
        Assert.Equal("3548500", j.GetProperty("realEstate").GetProperty("siteAddress").GetProperty("city").GetProperty("code").GetString());
        Assert.Equal("BM-0012", j.GetProperty("additionalInformationGroup").GetProperty("order").GetString());
    }

    [Fact]
    public void SemRetencoesInformadasNaoMandaNenhuma()
    {
        var j = Emissao(Exemplo.Pedido());
        Assert.False(j.TryGetProperty("inssAmountWithheld", out _));
        Assert.False(j.TryGetProperty("irAmountWithheld", out _));
        Assert.False(j.TryGetProperty("discountUnconditionedAmount", out _));
    }

    [Fact]
    public void RetencoesInformadasVaoTodasInclusiveAsZeradas()
    {
        var j = Emissao(Exemplo.Pedido(retencoes: new RetencoesNfseDto(Inss: 2750m, Ir: 250m)));
        Assert.Equal(2750m, j.GetProperty("inssAmountWithheld").GetDecimal());
        Assert.Equal(250m, j.GetProperty("irAmountWithheld").GetDecimal());
        Assert.Equal(0m, j.GetProperty("pisAmountWithheld").GetDecimal());
        Assert.Equal(0m, j.GetProperty("csllAmountWithheld").GetDecimal());
    }

    [Theory]
    [InlineData("Issued", "Issued", SituacaoNfse.Emitida, false)]
    [InlineData("Created", "WaitingReturn", SituacaoNfse.Processando, false)]
    [InlineData("Error", "IssueFailed", SituacaoNfse.Rejeitada, false)]
    [InlineData("Issued", "IssueFailed", SituacaoNfse.Emitida, false)] // só o PDF falhou: a nota saiu
    [InlineData("Issued", "CancelFailed", SituacaoNfse.Emitida, true)]
    [InlineData("Issued", "WaitingReturnCancel", SituacaoNfse.Cancelando, false)]
    [InlineData("Cancelled", "Cancelled", SituacaoNfse.Cancelada, false)]
    public void TraduzASituacaoDaNfeIo(string status, string etapa, SituacaoNfse esperada, bool cancelamentoRecusado)
    {
        var json = $$"""{"id":"abc","status":"{{status}}","flowStatus":"{{etapa}}","flowMessage":"motivo","number":123,"amountNet":21500.5}""";
        var r = NfeIoMapeador.ParaRetorno(JsonDocument.Parse(json).RootElement);
        Assert.Equal(esperada, r.Situacao);
        Assert.Equal(cancelamentoRecusado, r.CancelamentoRecusado);
        Assert.Equal("abc", r.IdProvedor);
        Assert.Equal("123", r.Numero);
        Assert.Equal(21500.5m, r.ValorLiquido);
    }

    [Fact]
    public void ExtraiAMensagemDeErroDaNfeIo()
    {
        Assert.Equal("borrower.address.country must be a valid ISO 3166-1 code",
            NfeIoProvedor.MensagemDeErro("\"borrower.address.country must be a valid ISO 3166-1 code\""));
        Assert.Equal("company not found", NfeIoProvedor.MensagemDeErro("""{"Errors":[{"Code":40041,"Message":"company not found"}]}"""));
    }

    [Fact]
    public void ExplicaOQueFaltaNoCadastroDaNfeIo() =>
        Assert.Contains("Inscrição Municipal", NfeIoProvedor.NaoEncontrado("\"Municipal tax not found.\"", "emissão"));
}

public class NfeIoAvisosTests
{
    [Fact]
    public void AceitaSoAssinaturaComOSegredoCerto()
    {
        var corpo = Encoding.UTF8.GetBytes("""{"action":"issued_successfully","payload":{"id":"n1","externalId":"e1","status":"Issued","flowStatus":"Issued"}}""");
        var hex = Convert.ToHexString(HMACSHA1.HashData(Encoding.UTF8.GetBytes("segredo-do-webhook-com-32-caracteres"), corpo)).ToLowerInvariant();
        Assert.True(NfeIoAvisos.AssinaturaValida(corpo, "sha1=" + hex, "segredo-do-webhook-com-32-caracteres"));
        Assert.False(NfeIoAvisos.AssinaturaValida(corpo, "sha1=" + hex, "outro-segredo"));
        Assert.False(NfeIoAvisos.AssinaturaValida(corpo, null, "segredo-do-webhook-com-32-caracteres"));
        Assert.False(NfeIoAvisos.AssinaturaValida(corpo, "sha1=" + hex, string.Empty));

        var aviso = NfeIoAvisos.Interpretar(corpo, "hook-1")!;
        Assert.Equal("e1", aviso.IdExterno);
        Assert.Equal(SituacaoNfse.Emitida, aviso.Retorno.Situacao);
    }
}

public class NotaFiscalServicoTests
{
    private static readonly DateTime T0 = new(2026, 10, 9, 12, 0, 0, DateTimeKind.Utc);

    private static NotaFiscalServico Nova() => NotaFiscalServico.Criar("n1", "bm", "simulador", "", "{}", "Cliente", "11222333000181", "Limpeza", null, 1000m, "", "", "ana", T0);

    private static RetornoNfse Retorno(SituacaoNfse s, bool cancelamentoRecusado = false) => new("p1", s, s.ToString(), "msg", cancelamentoRecusado, Numero: "77");

    [Fact]
    public void CaminhoCompletoAteCancelar()
    {
        var n = Nova();
        Assert.Equal(SituacaoNfse.Pendente, n.Situacao);
        n.RegistrarAceite(Retorno(SituacaoNfse.Processando), T0);
        Assert.Equal(SituacaoNfse.Processando, n.Situacao);
        n.AplicarRetorno(Retorno(SituacaoNfse.Emitida), T0.AddMinutes(1));
        Assert.Equal(SituacaoNfse.Emitida, n.Situacao);
        Assert.Equal("77", n.Numero);
        Assert.Null(n.ProximaConsultaEm);

        n.SolicitarCancelamento("Serviço não prestado", "ana", T0.AddDays(1));
        Assert.Equal(SituacaoNfse.Cancelando, n.Situacao);
        // Retorno atrasado de "emitida" não tira a nota do cancelamento.
        n.AplicarRetorno(Retorno(SituacaoNfse.Emitida), T0.AddDays(1));
        Assert.Equal(SituacaoNfse.Cancelando, n.Situacao);
        n.AplicarRetorno(Retorno(SituacaoNfse.Cancelada), T0.AddDays(1).AddMinutes(1));
        Assert.Equal(SituacaoNfse.Cancelada, n.Situacao);
    }

    [Fact]
    public void CancelamentoRecusadoMantemANotaValida()
    {
        var n = Nova();
        n.RegistrarAceite(Retorno(SituacaoNfse.Emitida), T0);
        n.AplicarRetorno(Retorno(SituacaoNfse.Emitida), T0);
        n.SolicitarCancelamento("Erro", "ana", T0);
        n.AplicarRetorno(Retorno(SituacaoNfse.Emitida, cancelamentoRecusado: true), T0.AddMinutes(2));
        Assert.Equal(SituacaoNfse.Emitida, n.Situacao);
        Assert.Contains("cancelamento foi recusado", n.Mensagem);
    }

    [Fact]
    public void NaoCancelaNotaQueNaoFoiEmitida()
    {
        var n = Nova();
        Assert.Throws<InvalidOperationException>(() => n.SolicitarCancelamento("x", "ana", T0));
    }

    [Fact]
    public void EnvioPerdidoSoLiberaDepoisDaTolerancia()
    {
        var n = Nova();
        n.RegistrarEnvioIncerto("sem conexão", T0);
        Assert.False(n.RegistrarNaoEncontrada(T0.AddMinutes(2), TimeSpan.FromMinutes(10)));
        Assert.Equal(SituacaoNfse.Pendente, n.Situacao);
        Assert.True(n.RegistrarNaoEncontrada(T0.AddMinutes(15), TimeSpan.FromMinutes(10)));
        Assert.Equal(SituacaoNfse.Rejeitada, n.Situacao);
    }
}

public class NfseServiceTests
{
    private readonly Relogio _relogio = new(new DateTime(2026, 10, 9, 12, 0, 0, DateTimeKind.Utc));
    private readonly NotasFalsas _notas = new();
    private readonly CrudFalso<ConfiguracaoFiscalEmpresa> _configs = new();
    private readonly CrudFalso<Empresa> _empresas = new();
    private readonly ProvedorRoteirizado _roteiro = new();

    public NfseServiceTests()
    {
        _empresas.Itens.Add(new Empresa { Id = "bm", Nome = "BM", Regime = "Lucro Presumido" });
        _configs.Itens.Add(new ConfiguracaoFiscalEmpresa { Id = "bm", Provedor = "simulador", IdEmpresaProvedor = "" });
    }

    private NfseService Motor(INfseProvedor provedor) => new(
        _notas, _configs, _empresas, new NfseProvedores([provedor]), new PedidoNfseValidator(),
        new UsuarioFalso(), _relogio, NullLogger<NfseService>.Instance);

    [Fact]
    public async Task SimuladorEmiteEDepoisCancela()
    {
        var motor = Motor(new SimuladorNfseProvedor(_relogio));
        var r = await motor.EmitirAsync(Exemplo.Pedido());
        Assert.True(r.IsSuccess, r.Error);
        Assert.Equal("Processando", r.Value!.Situacao);
        Assert.True(r.Value.EmAndamento);

        _relogio.Avancar(TimeSpan.FromMinutes(2));
        Assert.Equal(1, await motor.AcompanharAsync());
        var emitida = await motor.ObterAsync(r.Value.Id);
        Assert.Equal("Emitida", emitida!.Situacao);
        Assert.NotEmpty(emitida.Numero);
        Assert.True((await motor.BaixarAsync(r.Value.Id, TipoArquivoNfse.Pdf)).IsSuccess);

        var c = await motor.CancelarAsync(r.Value.Id, "Serviço não prestado");
        Assert.Equal("Cancelando", c.Value!.Situacao);
        _relogio.Avancar(TimeSpan.FromMinutes(2));
        await motor.AcompanharAsync();
        Assert.Equal("Cancelada", (await motor.ObterAsync(r.Value.Id))!.Situacao);
    }

    [Fact]
    public async Task EnvioIncertoConfereAntesEReaproveitaANota()
    {
        var motor = Motor(new SimuladorNfseProvedor(_relogio));
        var r = await motor.EmitirAsync(Exemplo.Pedido("Limpeza [incerto]"));
        // A resposta "se perdeu", mas a consulta pelo identificador achou a nota: nada de reenvio.
        Assert.True(r.IsSuccess, r.Error);
        Assert.Equal("Processando", r.Value!.Situacao);
        Assert.Single(_notas.Itens);
    }

    [Fact]
    public async Task RecusaDoProvedorFicaRegistradaComOMotivo()
    {
        var r = await Motor(new SimuladorNfseProvedor(_relogio)).EmitirAsync(Exemplo.Pedido("Limpeza [recusar]"));
        Assert.True(r.IsSuccess);
        Assert.Equal("Rejeitada", r.Value!.Situacao);
        Assert.Contains("recusado de propósito", r.Value.Mensagem);
    }

    [Fact]
    public async Task EnvioQueNaoChegouLiberaParaEmitirDeNovo()
    {
        _roteiro.Emissao = EnvioNfse.Incerto("sem conexão");
        _roteiro.ConsultaExterna = ConsultaNfse.Inexistente();
        var motor = Motor(_roteiro);
        var r = await motor.EmitirAsync(Exemplo.Pedido());
        Assert.Equal("Pendente", r.Value!.Situacao);

        _relogio.Avancar(TimeSpan.FromMinutes(15));
        await motor.AcompanharAsync();
        var nota = await motor.ObterAsync(r.Value.Id);
        Assert.Equal("Rejeitada", nota!.Situacao);
        Assert.Contains("pode emitir de novo", nota.Mensagem);
        Assert.Equal(1, _roteiro.Emissoes); // nunca reenviou sozinho
    }

    [Fact]
    public async Task PedidoInvalidoNemChegaAoProvedor()
    {
        var r = await Motor(_roteiro).EmitirAsync(Exemplo.Pedido() with { EnderecoImovel = null });
        Assert.False(r.IsSuccess);
        Assert.Contains("endereço do imóvel", r.Error);
        Assert.Equal(0, _roteiro.Emissoes);
        Assert.Empty(_notas.Itens);
    }

    [Fact]
    public async Task LucroPresumidoExigeIbsCbs()
    {
        var r = await Motor(_roteiro).EmitirAsync(Exemplo.Pedido() with { IbsCbs = null, EnderecoImovel = null });
        Assert.False(r.IsSuccess);
        Assert.Contains("IBS/CBS", r.Error);
    }

    [Fact]
    public async Task EmpresaSemConfiguracaoFiscalNaoEmite()
    {
        _configs.Itens.Clear();
        var r = await Motor(_roteiro).EmitirAsync(Exemplo.Pedido());
        Assert.False(r.IsSuccess);
        Assert.Contains("implantação", r.Error);
    }

    [Fact]
    public async Task AvisoRepetidoEhProcessadoUmaVezSo()
    {
        var motor = Motor(new SimuladorNfseProvedor(_relogio));
        var nota = (await motor.EmitirAsync(Exemplo.Pedido())).Value!;
        var aviso = new AvisoNfse("hook-1", "simulador", nota.Id, new RetornoNfse("x", SituacaoNfse.Emitida, "Issued", "", Numero: "900"));
        await motor.ProcessarAvisoAsync(aviso);
        await motor.ProcessarAvisoAsync(aviso);
        Assert.Equal("900", (await motor.ObterAsync(nota.Id))!.Numero);
        Assert.Equal(1, _notas.AvisosMarcados);
    }

    // ───────────────────────────── Falsos ─────────────────────────────

    private sealed class Relogio(DateTime inicio) : TimeProvider
    {
        private DateTime _agora = inicio;
        public void Avancar(TimeSpan t) => _agora += t;
        public override DateTimeOffset GetUtcNow() => new(_agora, TimeSpan.Zero);
    }

    private sealed class UsuarioFalso : IUsuarioAtualProvider
    {
        public Task<UsuarioAtual> QuemAsync() => Task.FromResult(new UsuarioAtual("1", "Ana", "Gestor"));
        public string Ip => "127.0.0.1";
    }

    private sealed class ProvedorRoteirizado : INfseProvedor
    {
        public EnvioNfse Emissao { get; set; } = EnvioNfse.Aceito(new RetornoNfse("p1", SituacaoNfse.Processando, "WaitingSend", ""));
        public ConsultaNfse ConsultaExterna { get; set; } = ConsultaNfse.Inexistente();
        public int Emissoes { get; private set; }
        public string Nome => "simulador";
        public bool Configurado => true;
        public Task<EnvioNfse> EmitirAsync(string e, PedidoNfseDto p, string id, CancellationToken ct = default) { Emissoes++; return Task.FromResult(Emissao); }
        public Task<ConsultaNfse> ConsultarAsync(string e, string id, CancellationToken ct = default) => Task.FromResult(ConsultaNfse.Inexistente());
        public Task<ConsultaNfse> ConsultarPorIdExternoAsync(string e, string id, CancellationToken ct = default) => Task.FromResult(ConsultaExterna);
        public Task<EnvioNfse> CancelarAsync(string e, string id, CancellationToken ct = default) => Task.FromResult(EnvioNfse.Recusado("não"));
        public Task<ArquivoNfse?> BaixarAsync(string e, string id, TipoArquivoNfse t, CancellationToken ct = default) => Task.FromResult<ArquivoNfse?>(null);
    }

    private sealed class NotasFalsas : INotasFiscaisServicoRepository
    {
        public List<NotaFiscalServico> Itens { get; } = [];
        private readonly HashSet<string> _avisos = [];
        public int AvisosMarcados { get; private set; }
        public Task AdicionarAsync(NotaFiscalServico nota, CancellationToken ct = default) { Itens.Add(nota); return Task.CompletedTask; }
        public Task<NotaFiscalServico?> ObterAsync(string id, CancellationToken ct = default) => Task.FromResult(Itens.FirstOrDefault(n => n.Id == id));
        public Task<NotaFiscalServico?> ObterPorIdProvedorAsync(string p, string id, CancellationToken ct = default) =>
            Task.FromResult(Itens.FirstOrDefault(n => n.Provedor == p && n.IdProvedor == id));
        public Task<IReadOnlyList<NotaFiscalServico>> ListarAsync(string? e, int q, CancellationToken ct = default) =>
            Task.FromResult<IReadOnlyList<NotaFiscalServico>>(Itens.Where(n => e == null || n.EmpresaId == e).Take(q).ToList());
        public Task<IReadOnlyList<NotaFiscalServico>> ParaAcompanharAsync(DateTime agora, int q, CancellationToken ct = default) =>
            Task.FromResult<IReadOnlyList<NotaFiscalServico>>(Itens.Where(n => n.EmAndamento && n.ProximaConsultaEm <= agora).Take(q).ToList());
        public Task SalvarAsync(CancellationToken ct = default) => Task.CompletedTask;
        public Task<bool> AvisoJaProcessadoAsync(string id, CancellationToken ct = default) => Task.FromResult(_avisos.Contains(id));
        public void MarcarAvisoProcessado(string id, string p, DateTime agora) { if (_avisos.Add(id)) AvisosMarcados++; }
    }

    private sealed class CrudFalso<T> : ICrudRepository<T> where T : class, IEntity
    {
        public List<T> Itens { get; } = [];
        public Task<List<T>> GetAllAsync() => Task.FromResult(Itens.ToList());
        public Task<List<T>> ListarAsync(Expression<Func<T, bool>> filtro) => Task.FromResult(Itens.Where(filtro.Compile()).ToList());
        public Task<T?> GetByIdAsync(string id) => Task.FromResult(Itens.FirstOrDefault(i => i.Id == id));
        public Task<T> AddAsync(T entity) { Itens.Add(entity); return Task.FromResult(entity); }
        public Task<List<T>> AddRangeAsync(List<T> entities) { Itens.AddRange(entities); return Task.FromResult(entities); }
        public Task<T?> UpdateAsync(string id, T entity) => Task.FromResult<T?>(entity);
        public Task SalvarLoteAsync(IReadOnlyList<T> novos, IReadOnlyList<T> alterados) => Task.CompletedTask;
        public Task<bool> DeleteAsync(string id) => Task.FromResult(Itens.RemoveAll(i => i.Id == id) > 0);
    }
}

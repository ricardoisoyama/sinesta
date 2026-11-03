using System.Linq.Expressions;
using System.Text.Json;
using Elrond.Application.Common;
using Elrond.Application.DTOs;
using Elrond.Application.Interfaces;
using Elrond.Application.Services;
using Elrond.Domain.Common;
using Elrond.Domain.Entities;
using Elrond.Domain.Regras;
using Elrond.Infrastructure.Bancos.Inter;
using Elrond.Infrastructure.Bancos.Simulador;
using Microsoft.Extensions.Logging.Abstractions;

namespace Elrond.Tests;

/// <summary>Pagamento de boleto pelo banco: leitura do código, conferência com o lançamento, envio sem idempotência e baixa.</summary>
public class PagamentoBoletoTests
{
    private static readonly DateOnly Hoje = new(2026, 11, 3);
    private static readonly UsuarioAtual Ricardo = new("u-ric", "Ricardo", "Admin", true);

    // Exemplos do sandbox do Inter (documentação oficial).
    private const string BarrasBancario = "03395988500000666539201493990000372830030102";
    private const string BarrasConvenio = "82670000000653301602023123106000000002830894";

    /// <summary>Linha digitável (47) a partir do código de barras (44), como o banco imprime.</summary>
    private static string Linha(string b)
    {
        static int Dv10(string s)
        {
            var soma = 0;
            var peso = 2;
            for (var i = s.Length - 1; i >= 0; i--) { var n = (s[i] - '0') * peso; soma += n > 9 ? n - 9 : n; peso = 3 - peso; }
            return (10 - soma % 10) % 10;
        }
        var c1 = b[..4] + b[19..24];
        var c2 = b[24..34];
        var c3 = b[34..44];
        return $"{c1}{Dv10(c1)}{c2}{Dv10(c2)}{c3}{Dv10(c3)}{b[4]}{b[5..19]}";
    }

    [Fact]
    public void Codigo_de_barras_bancario_traz_valor_e_vencimento()
    {
        var (c, erro) = CodigoBoleto.Ler(BarrasBancario, Hoje);
        Assert.True(c is not null, erro);
        Assert.False(c!.Arrecadacao);
        Assert.Equal(666.53m, c.Valor);
        Assert.Equal(new DateOnly(1997, 10, 7).AddDays(9885), c.Vencimento);
    }

    [Fact]
    public void Linha_digitavel_com_pontos_e_espacos_vira_o_mesmo_codigo()
    {
        var linha = Linha(BarrasBancario);
        var formatada = $"{linha[..5]}.{linha[5..10]} {linha[10..15]}.{linha[15..21]} {linha[21..26]}.{linha[26..32]} {linha[32]} {linha[33..]}";
        var (c, erro) = CodigoBoleto.Ler(formatada, Hoje);
        Assert.True(c is not null, erro);
        Assert.Equal(BarrasBancario, c!.CodigoBarras);
        Assert.Equal(linha, c.Digitos);
    }

    [Fact]
    public void Linha_com_digito_trocado_e_recusada()
    {
        var linha = Linha(BarrasBancario).ToCharArray();
        linha[12] = linha[12] == '1' ? '2' : '1';
        var (c, erro) = CodigoBoleto.Ler(new string(linha), Hoje);
        Assert.Null(c);
        Assert.Contains("não confere", erro);
        Assert.Contains("tem 47 dígitos", CodigoBoleto.Ler("1234", Hoje).Erro);
    }

    [Fact]
    public void Conta_de_consumo_traz_valor_e_nao_traz_vencimento()
    {
        var (c, erro) = CodigoBoleto.Ler(BarrasConvenio, Hoje);
        Assert.True(c is not null, erro);
        Assert.True(c!.Arrecadacao);
        Assert.Equal(65.33m, c.Valor);
        Assert.Null(c.Vencimento);
    }

    [Fact]
    public void Fator_de_vencimento_usa_a_base_nova_depois_de_2025()
    {
        Assert.Equal(new DateOnly(2025, 2, 22), CodigoBoleto.DataDoFator(1000, Hoje));
        Assert.Equal(new DateOnly(2026, 11, 3), CodigoBoleto.DataDoFator(1000 + (Hoje.DayNumber - new DateOnly(2025, 2, 22).DayNumber), Hoje));
        Assert.Equal(new DateOnly(2025, 2, 21), CodigoBoleto.DataDoFator(9999, new DateOnly(2025, 2, 1)));
        Assert.Null(CodigoBoleto.DataDoFator(0, Hoje));
    }

    [Theory]
    [InlineData("REALIZADO", PagamentoBancario.Pago)]
    [InlineData("PAGO", PagamentoBancario.Pago)]
    [InlineData("AGUARDANDO_APROVACAO", PagamentoBancario.AguardandoAprovacao)]
    [InlineData("AGENDADO", PagamentoBancario.Agendado)]
    [InlineData("EMPROCESSAMENTO", PagamentoBancario.Processando)]
    [InlineData("APROVADO", PagamentoBancario.Processando)]
    [InlineData("REPROVADO", PagamentoBancario.Recusado)]
    [InlineData("APROVACAO_EXPIRADA", PagamentoBancario.Cancelado)]
    [InlineData("NAO_COMPENSADO", PagamentoBancario.Falha)]
    public void Status_do_boleto_vira_o_nosso(string inter, string nossa) => Assert.Equal(nossa, InterPagamento.NossaBoleto(inter));

    [Fact]
    public void Aviso_e_consulta_do_boleto_sao_lidos()
    {
        var avisos = InterPagamento.Aviso("""[{"linhaDigitavel":"123","codigoTransacao":"c42f","dataPagamento":"2026-11-03","status":"REALIZADO","valorPago":"10.00"}]""");
        Assert.Equal(("c42f", "REALIZADO", "2026-11-03"), (avisos.Single().IdBanco, avisos.Single().Situacao, avisos.Single().DataHora));
        using var doc = JsonDocument.Parse("""{"codigoTransacao":"c42f","statusPagamento":"REALIZADO","dataPagamento":"2026-11-03","autenticacao":"AUT123","nomeBeneficiario":"ENERGIA SA"}""");
        var s = InterPagamento.SituacaoBoleto(doc.RootElement);
        Assert.Equal((PagamentoBancario.Pago, "AUT123", "2026-11-03", "ENERGIA SA"), (s.Situacao, s.EndToEnd, s.PagoEm, s.Beneficiario));
    }

    // ── o serviço com o banco simulado ──

    private sealed class Cenario
    {
        public required PagamentoService Svc { get; init; }
        public required Mem<PagamentoBancario> Pagamentos { get; init; }
        public required Mem<Movimento> Movs { get; init; }
        public required SimuladorPagamento Banco { get; init; }
    }

    private static Movimento Conta(string id, decimal valor, string vencimento = "2026-11-10") => new()
    {
        Id = id, Numero = 500 + id.Length, Tipo = "pagar", EmpresaId = "matriz", CarteiraId = "inter", Valor = valor,
        Vencimento = vencimento, Competencia = "2026-11", Descricao = "Conta de energia", Aprovacao = "aprovado", ParceiroNome = "Energia",
    };

    private static Cenario Montar(params Movimento[] lancamentos) => Montar(false, lancamentos);

    private static Cenario Montar(bool represar, params Movimento[] lancamentos)
    {
        var pagamentos = new Mem<PagamentoBancario>();
        var movs = new Mem<Movimento>();
        movs.Itens.AddRange(lancamentos);
        var integracoes = new Mem<IntegracaoBancaria>();
        integracoes.Itens.Add(new IntegracaoBancaria { Id = "integ", EmpresaId = "matriz", Banco = "simulador", Ambiente = "sandbox", Ativa = true, CarteiraId = "inter", Recursos = [IntegracaoBancaria.RecursoPagamento], RepresarPagamentos = represar });
        var carteiras = new Mem<Carteira>();
        carteiras.Itens.Add(new Carteira { Id = "inter", Nome = "Inter Matriz", EmpresaId = "matriz" });
        var empresas = new Mem<Empresa>();
        empresas.Itens.Add(new Empresa { Id = "matriz", Nome = "Mirai - Matriz", Cnpj = "63.736.778/0001-83" });
        var auditoria = new Auditoria();
        var relogio = new Relogio(new DateTimeOffset(2026, 11, 3, 13, 0, 0, TimeSpan.Zero));
        var financeiro = new FinanceiroService(movs, carteiras, new Mem<RegraAprovacao>(), new Mem<ExtratoLinha>(), new SemTransacao(), auditoria, new Sequencia());
        var email = new EmailService(new Mem<ConfiguracaoSmtp>(), new Mem<EmailEnviado>(), new SemSmtp(), new SemCofre(), auditoria, relogio);
        var banco = new SimuladorPagamento();
        var cobranca = new SimuladorCobranca();
        var modulo = new SimuladorModulo(cobranca, new SimuladorExtrato(cobranca), banco);
        var svc = new PagamentoService(pagamentos, movs, integracoes, new Mem<Fornecedor>(), carteiras, empresas, new SemUsuarios(), new Bancos(modulo), new Cofre(),
            financeiro, email, auditoria, relogio, NullLogger<PagamentoService>.Instance);
        return new Cenario { Svc = svc, Pagamentos = pagamentos, Movs = movs, Banco = banco };
    }

    private static AgendarPagamentosDto Boleto(string movimentoId, string codigo, string data = "2026-11-03") =>
        new([new ItemAgendamentoDto(movimentoId, string.Empty, PagamentoBancario.FormaBoleto, codigo)], data);

    [Fact]
    public async Task Boleto_vai_ao_banco_espera_aprovacao_e_o_aviso_da_a_baixa()
    {
        var c = Montar(Conta("m1", 666.53m));
        var r = (await c.Svc.AgendarAsync(Boleto("m1", Linha(BarrasBancario)), Ricardo)).Single();
        Assert.True(r.Ok, r.Mensagem);
        var p = c.Pagamentos.Itens.Single();
        Assert.Equal((PagamentoBancario.FormaBoleto, PagamentoBancario.AguardandoAprovacao), (p.Forma, p.Situacao));
        Assert.Equal(BarrasBancario, p.CodigoBarras);
        Assert.Equal(new DateOnly(1997, 10, 7).AddDays(9885).ToString("yyyy-MM-dd"), p.VencimentoBoleto);

        // Aprovado no app: o aviso (boleto-pagamento) chega e o ELROND confere no banco e baixa.
        c.Banco.LerAviso($$"""[{"codigoTransacao":"{{p.IdBanco}}","status":"REALIZADO"}]""");
        await c.Svc.AtualizarAsync(p.Id);
        p = c.Pagamentos.Itens.Single();
        Assert.Equal(PagamentoBancario.Pago, p.Situacao);
        Assert.Equal("Beneficiário simulado", p.Beneficiario);
        var m = c.Movs.Itens.Single(x => x.Id == "m1");
        Assert.True(m.PagoEm.Length > 0);
        Assert.Equal(p.Id, m.PagamentoBancarioId);

        var comprovante = await c.Svc.ComprovanteAsync("m1");
        Assert.Equal(PagamentoBancario.FormaBoleto, comprovante!.Forma);
        Assert.Equal("Comprovante de pagamento de boleto", ComprovanteEmail.Titulo(comprovante));
        Assert.Contains(ComprovanteEmail.Linhas(comprovante), l => l.Rotulo == "Autenticação bancária" && l.Valor.StartsWith("AUT"));
    }

    [Fact]
    public async Task Valor_do_boleto_diferente_do_lancamento_nao_vai_ao_banco()
    {
        var c = Montar(Conta("m1", 600m));
        var r = (await c.Svc.AgendarAsync(Boleto("m1", BarrasBancario), Ricardo)).Single();
        Assert.False(r.Ok);
        Assert.Contains("R$ 666,53", r.Mensagem);
        Assert.Empty(c.Pagamentos.Itens);
        Assert.Equal(0, c.Banco.BoletosIncluidos(BarrasBancario));
    }

    [Fact]
    public async Task O_mesmo_boleto_nao_vai_duas_vezes_nem_por_outro_lancamento()
    {
        var c = Montar(Conta("m1", 666.53m), Conta("m22", 666.53m));
        Assert.True((await c.Svc.AgendarAsync(Boleto("m1", BarrasBancario), Ricardo)).Single().Ok);
        var r = (await c.Svc.AgendarAsync(Boleto("m22", Linha(BarrasBancario)), Ricardo)).Single();
        Assert.False(r.Ok);
        Assert.Contains("já foi mandado ao banco", r.Mensagem);
        Assert.Equal(1, c.Banco.BoletosIncluidos(BarrasBancario));
    }

    [Fact]
    public async Task Envio_sem_resposta_nunca_e_repetido_a_conferencia_acha_pelo_codigo()
    {
        // Valor terminado em ,13: o simulador inclui o pagamento mas não responde (como uma queda depois do envio).
        var codigo = BarrasConvenio;
        var c = Montar(Conta("m1", 65.33m));
        var semResposta = Montar(Conta("m1", 10.13m));
        var r = (await semResposta.Svc.AgendarAsync(new([new ItemAgendamentoDto("m1", "", PagamentoBancario.FormaBoleto, BarrasSemValor(), "2026-11-10")], "2026-11-03"), Ricardo)).Single();
        Assert.True(r.Ok, r.Mensagem);
        var p = semResposta.Pagamentos.Itens.Single();
        Assert.Equal((PagamentoBancario.Incerto, ""), (p.Situacao, p.IdBanco));

        await semResposta.Svc.ConferirAbertosAsync(incluirAgendadosFuturos: true);
        p = semResposta.Pagamentos.Itens.Single();
        Assert.Equal(PagamentoBancario.AguardandoAprovacao, p.Situacao); // achou no banco pelo código
        Assert.NotEqual("", p.IdBanco);
        Assert.Equal(1, semResposta.Banco.BoletosIncluidos(BarrasSemValor())); // e não mandou de novo

        // Conta de consumo com valor impresso: confere o valor e o vencimento vem do lançamento.
        Assert.True((await c.Svc.AgendarAsync(Boleto("m1", codigo), Ricardo)).Single().Ok);
        Assert.Equal("2026-11-10", c.Pagamentos.Itens.Single().VencimentoBoleto);
    }

    [Fact]
    public async Task Boleto_sem_confirmacao_que_o_banco_nao_tem_pode_ser_descartado()
    {
        var c = Montar(Conta("m1", 10.13m));
        var p = new PagamentoBancario
        {
            Id = "p1", EmpresaId = "matriz", IntegracaoId = "integ", Banco = "simulador", MovimentoId = "m1", Forma = PagamentoBancario.FormaBoleto,
            CodigoBarras = BarrasSemValor(), Valor = 10.13m, Data = "2026-11-03", Situacao = PagamentoBancario.Incerto,
        };
        c.Pagamentos.Itens.Add(p);
        var r = await c.Svc.DescartarAsync("p1", Ricardo);
        Assert.True(r.IsSuccess, r.Error);
        Assert.Equal(PagamentoBancario.Cancelado, c.Pagamentos.Itens.Single().Situacao);
        // Agora o lançamento pode ir de novo.
        Assert.True((await c.Svc.AgendarAsync(new([new ItemAgendamentoDto("m1", "", PagamentoBancario.FormaBoleto, BarrasSemValor(), "2026-11-10")], "2026-11-03"), Ricardo)).Single().Ok);
    }

    [Fact]
    public async Task Represado_nao_vai_ao_banco_ate_liberar_e_a_rotina_nao_manda()
    {
        var c = Montar(true, Conta("m1", 666.53m));
        var r = (await c.Svc.AgendarAsync(Boleto("m1", BarrasBancario), Ricardo)).Single();
        Assert.True(r.Ok, r.Mensagem);
        var p = c.Pagamentos.Itens.Single();
        Assert.Equal(PagamentoBancario.Represado, p.Situacao);
        Assert.Equal(0, c.Banco.BoletosIncluidos(BarrasBancario));

        // A conferência de hora em hora e o "Atualizar" da tela não mandam o represado.
        await c.Svc.ConferirAbertosAsync(incluirAgendadosFuturos: true);
        await c.Svc.AtualizarAsync(p.Id);
        Assert.Equal(0, c.Banco.BoletosIncluidos(BarrasBancario));

        // Monitor: aparece com as conferências.
        var item = (await c.Svc.MonitorAsync()).Single();
        Assert.Contains(item.Conferencias, x => x.Nivel == "ok" && x.Texto.StartsWith("Valor igual"));
        Assert.DoesNotContain(item.Conferencias, x => x.Nivel == "erro");

        // Liberou: vai ao banco uma vez.
        var lib = await c.Svc.LiberarAsync(p.Id, Ricardo);
        Assert.True(lib.IsSuccess, lib.Error);
        Assert.Equal(PagamentoBancario.AguardandoAprovacao, c.Pagamentos.Itens.Single().Situacao);
        Assert.Equal("Ricardo", c.Pagamentos.Itens.Single().LiberadoPor);
        Assert.Equal(1, c.Banco.BoletosIncluidos(BarrasBancario));
        Assert.False((await c.Svc.LiberarAsync(p.Id, Ricardo)).IsSuccess); // não libera duas vezes
        Assert.Equal(1, c.Banco.BoletosIncluidos(BarrasBancario));
    }

    [Fact]
    public async Task Quem_so_agenda_sempre_represa_mesmo_com_o_represamento_desligado()
    {
        var c = Montar(false, Conta("m1", 666.53m));
        var r = (await c.Svc.AgendarAsync(Boleto("m1", BarrasBancario), Ricardo, forcarRepresar: true)).Single();
        Assert.True(r.Ok, r.Mensagem);
        Assert.Equal(PagamentoBancario.Represado, c.Pagamentos.Itens.Single().Situacao);
        Assert.Equal(0, c.Banco.BoletosIncluidos(BarrasBancario));
    }

    [Fact]
    public async Task Represado_nao_libera_se_o_lancamento_mudou_e_pode_ser_cancelado()
    {
        var c = Montar(true, Conta("m1", 666.53m));
        await c.Svc.AgendarAsync(Boleto("m1", BarrasBancario), Ricardo);
        var p = c.Pagamentos.Itens.Single();
        c.Movs.Itens.Single().Valor = 700m;
        var lib = await c.Svc.LiberarAsync(p.Id, Ricardo);
        Assert.False(lib.IsSuccess);
        Assert.Contains("mudou de valor", lib.Error);
        Assert.Equal(0, c.Banco.BoletosIncluidos(BarrasBancario));
        Assert.True((await c.Svc.CancelarRepresadoAsync(p.Id, Ricardo)).IsSuccess);
        Assert.Equal(PagamentoBancario.Cancelado, c.Pagamentos.Itens.Single().Situacao);
    }

    [Fact]
    public void Boleto_vencido_avisa_e_vencido_em_dia_nao_util_nao()
    {
        var m = Conta("m1", 666.53m);
        PagamentoBancario P(string venc) => new() { Id = "p", MovimentoId = "m1", Forma = PagamentoBancario.FormaBoleto, CodigoBarras = BarrasBancario, Valor = 666.53m, Data = "2026-11-03", VencimentoBoleto = venc, FavorecidoEmail = "a@b.com" };
        m.Aprovacao = "aprovado";
        // 01/11 domingo + 02/11 Finados: pagar em 03/11 está no prazo.
        Assert.Contains(PagamentoService.Conferencias(P("2026-11-01"), m, Hoje, []), x => x.Nivel == "ok" && x.Texto.Contains("dia não útil"));
        // 29/10: venceu de verdade.
        Assert.Contains(PagamentoService.Conferencias(P("2026-10-29"), m, Hoje, []), x => x.Nivel == "aviso" && x.Texto.Contains("juros e multa"));
    }

    /// <summary>Conta de consumo com "valor de referência" (3º dígito 7): o código não traz o valor em reais.</summary>
    private static string BarrasSemValor()
    {
        var semDv = "827" + "0000000101301602023123106000000002830894"[..40];
        // DV geral (módulo 10, como a arrecadação com 3º dígito 7)
        var soma = 0;
        var peso = 2;
        for (var i = semDv.Length - 1; i >= 0; i--) { var n = (semDv[i] - '0') * peso; soma += n > 9 ? n - 9 : n; peso = 3 - peso; }
        var dv = (10 - soma % 10) % 10;
        return semDv[..3] + dv + semDv[3..];
    }

    // ── dublês ──

    private sealed class Bancos(IBancoModulo modulo) : IBancos
    {
        public IBancoModulo? Modulo(string codigo) => codigo == modulo.Codigo ? modulo : null;
        public IReadOnlyList<IBancoModulo> Todos => [modulo];
    }

    private sealed class Cofre : ICofreBancario
    {
        public CredencialBanco Abrir(IntegracaoBancaria i) => new(i.Id, i.Ambiente, "", "", Array.Empty<byte>(), Array.Empty<byte>(), "");
        public (byte[] Segredo, byte[] Certificado, byte[] Chave) Fechar(string integracaoId, string clientSecret, byte[] certificado, byte[] chave) => (Array.Empty<byte>(), certificado, chave);
        public string? ConferirCertificado(byte[] certificado, byte[] chave, out string validoAte) { validoAte = ""; return null; }
        public bool Configurado => true;
    }

    private sealed class SemUsuarios : IUserRepository
    {
        public Task<User?> FindByEmailAsync(string email) => Task.FromResult<User?>(null);
        public Task<User?> FindByIdAsync(Guid id) => Task.FromResult<User?>(null);
    }

    private sealed class SemSmtp : IEnvioSmtp
    {
        public Task<string?> EnviarAsync(ServidorSmtp servidor, MensagemEmail mensagem, CancellationToken ct = default) => Task.FromResult<string?>(null);
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

    private sealed class Relogio(DateTimeOffset agora) : TimeProvider
    {
        public override DateTimeOffset GetUtcNow() => agora;
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

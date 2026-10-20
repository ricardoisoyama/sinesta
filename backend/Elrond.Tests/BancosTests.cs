using System.Linq.Expressions;
using System.Security.Cryptography;
using System.Security.Cryptography.X509Certificates;
using System.Text;
using System.Text.Json;
using Elrond.Application.DTOs;
using Elrond.Application.Interfaces;
using Elrond.Application.Services;
using Elrond.Domain.Common;
using Elrond.Domain.Entities;
using Elrond.Infrastructure.Bancos;
using Elrond.Infrastructure.Bancos.Inter;
using Elrond.Infrastructure.Bancos.Simulador;
using Elrond.Infrastructure.Services;
using Microsoft.Extensions.Logging.Abstractions;

namespace Elrond.Tests;

/// <summary>Motor de bancos: orquestrador de cobranças, cofre das credenciais e tradução do Inter.</summary>
public class BancosTests
{
    private static readonly string Venc = DateTime.Today.AddDays(5).ToString("yyyy-MM-dd");
    private static readonly OrigemCobranca Parcela1 = new("siimp-fatura", "61", "900", "Fatura 61 · parcela 1/1");

    private static NovaCobranca Pedido(string nome = "Cliente Exemplo Ltda", decimal valor = 1180.70m, string? vencimento = null) => new(
        valor, vencimento ?? Venc,
        new PagadorCobranca("11.222.333/0001-81", nome, "Av 02", "S/N", "", "Distrito Industrial", "Três Lagoas", "MS", "79601-970", "financeiro@exemplo.com", "(67) 99999-0000"),
        new[] { "Fatura 61 · parcela 1/1" });

    private static (CobrancaService Svc, MemRepo<CobrancaBancaria> Cobrancas, MemRepo<IntegracaoBancaria> Integracoes, CofreBancario Cofre) Montar(bool ativa = true)
    {
        var cofre = new CofreBancario(new CertificadoOpcoes { ChaveBase64 = Convert.ToBase64String(RandomNumberGenerator.GetBytes(32)) });
        var integracoes = new MemRepo<IntegracaoBancaria>();
        var i = new IntegracaoBancaria { Id = "int-1", EmpresaId = "emp", Banco = "simulador", Ambiente = "sandbox", ClientId = "id", Ativa = ativa, Recursos = new() { IntegracaoBancaria.RecursoCobranca } };
        (i.SegredoCifrado, i.CertificadoCifrado, i.ChaveCifrada) = cofre.Fechar(i.Id, "segredo", Encoding.UTF8.GetBytes("cert"), Encoding.UTF8.GetBytes("chave"));
        integracoes.Itens.Add(i);
        var cobrancas = new MemRepo<CobrancaBancaria>();
        var bancos = new BancosRegistro(new IBancoModulo[] { NovoSimulador() });
        var svc = new CobrancaService(cobrancas, integracoes, bancos, cofre, new FakeAuditoria(), TimeProvider.System, NullLogger<CobrancaService>.Instance);
        return (svc, cobrancas, integracoes, cofre);
    }

    [Fact]
    public async Task Sem_integracao_ativa_nao_emite()
    {
        var (svc, cobrancas, _, _) = Montar(ativa: false);
        var r = await svc.EmitirAsync("emp", Parcela1, Pedido());
        Assert.False(r.IsSuccess);
        Assert.Contains("integração bancária", r.Error);
        Assert.Empty(cobrancas.Itens);
    }

    [Fact]
    public async Task Emite_grava_e_nao_deixa_a_mesma_parcela_virar_dois_boletos()
    {
        var (svc, cobrancas, _, _) = Montar();
        var r = await svc.EmitirAsync("emp", Parcela1, Pedido());
        Assert.True(r.IsSuccess, r.Error);
        var c = r.Value!;
        Assert.Equal(CobrancaBancaria.AReceber, c.Situacao);
        Assert.Equal("000001", c.SeuNumero);
        Assert.NotEmpty(c.LinhaDigitavel);
        Assert.NotEmpty(c.PixCopiaECola);
        Assert.Equal("11222333000181", c.PagadorDocumento);

        var outra = await svc.EmitirAsync("emp", Parcela1, Pedido());
        Assert.False(outra.IsSuccess);
        Assert.Contains("já tem um boleto", outra.Error);
        Assert.Single(cobrancas.Itens);

        // Outra parcela usa o próximo seu número.
        var p2 = await svc.EmitirAsync("emp", Parcela1 with { ParcelaId = "901" }, Pedido());
        Assert.Equal("000002", p2.Value!.SeuNumero);
    }

    [Fact]
    public async Task Recusa_do_banco_libera_a_parcela_para_emitir_de_novo()
    {
        var (svc, cobrancas, _, _) = Montar();
        var r = await svc.EmitirAsync("emp", Parcela1, Pedido("Pagador [recusar]"));
        Assert.False(r.IsSuccess);
        Assert.Contains("recusou", r.Error);
        Assert.Equal(CobrancaBancaria.Falha, cobrancas.Itens.Single().Situacao);

        var deNovo = await svc.EmitirAsync("emp", Parcela1, Pedido());
        Assert.True(deNovo.IsSuccess, deNovo.Error);
    }

    [Fact]
    public async Task Envio_incerto_e_procurado_pelo_seu_numero_antes_de_emitir_de_novo()
    {
        var (svc, _, _, _) = Montar();
        var r = await svc.EmitirAsync("emp", Parcela1, Pedido("Pagador [incerto]"));
        Assert.True(r.IsSuccess);
        Assert.Equal(CobrancaBancaria.Incerta, r.Value!.Situacao);
        Assert.False((await svc.EmitirAsync("emp", Parcela1, Pedido())).IsSuccess); // incerta ainda ocupa a parcela

        var atual = await svc.AtualizarAsync(r.Value.Id);
        Assert.Equal(CobrancaBancaria.AReceber, atual.Value!.Situacao); // o banco tinha recebido
        Assert.NotEmpty(atual.Value.LinhaDigitavel);
    }

    [Fact]
    public async Task Cancelar_libera_a_parcela_e_o_pdf_vem_do_banco()
    {
        var (svc, _, _, _) = Montar();
        var c = (await svc.EmitirAsync("emp", Parcela1, Pedido())).Value!;
        var pdf = await svc.PdfAsync(c.Id);
        Assert.True(pdf.IsSuccess);
        Assert.StartsWith("%PDF", Encoding.ASCII.GetString(pdf.Value!, 0, 4));

        var cancelada = await svc.CancelarAsync(c.Id, "teste");
        Assert.Equal(CobrancaBancaria.Cancelada, cancelada.Value!.Situacao);
        Assert.False((await svc.CancelarAsync(c.Id, "de novo")).IsSuccess);
        Assert.True((await svc.EmitirAsync("emp", Parcela1, Pedido())).IsSuccess);
    }

    [Theory]
    [InlineData(2.49, null, "valor mínimo")]
    [InlineData(100, "2020-01-01", "já passou")]
    public async Task Pedido_invalido_nem_chega_ao_banco(decimal valor, string? vencimento, string motivo)
    {
        var (svc, cobrancas, _, _) = Montar();
        var r = await svc.EmitirAsync("emp", Parcela1, Pedido(valor: valor, vencimento: vencimento));
        Assert.False(r.IsSuccess);
        Assert.Contains(motivo, r.Error);
        Assert.Empty(cobrancas.Itens);
    }

    [Fact]
    public async Task Pagador_sem_cep_ou_documento_invalido_e_recusado()
    {
        var (svc, _, _, _) = Montar();
        var semCep = Pedido() with { Pagador = Pedido().Pagador with { Cep = "123" } };
        Assert.Contains("CEP", (await svc.EmitirAsync("emp", Parcela1, semCep)).Error);
        var docRuim = Pedido() with { Pagador = Pedido().Pagador with { CpfCnpj = "11.111.111/1111-11" } };
        Assert.Contains("CPF/CNPJ", (await svc.EmitirAsync("emp", Parcela1, docRuim)).Error);
    }

    // ── cofre ──

    [Fact]
    public void Cofre_abre_o_que_fechou_e_o_segredo_nao_serve_em_outra_integracao()
    {
        var (_, _, integracoes, cofre) = Montar();
        var i = integracoes.Itens.Single();
        var c = cofre.Abrir(i);
        Assert.Equal("segredo", c.ClientSecret);
        Assert.Equal("cert", Encoding.UTF8.GetString(c.Certificado));

        var copiada = new IntegracaoBancaria { Id = "outra", SegredoCifrado = i.SegredoCifrado, CertificadoCifrado = i.CertificadoCifrado, ChaveCifrada = i.ChaveCifrada };
        Assert.ThrowsAny<CryptographicException>(() => cofre.Abrir(copiada));
    }

    [Fact]
    public void Cofre_confere_o_par_certificado_e_chave()
    {
        var (_, _, _, cofre) = Montar();
        var (cert, chave) = CertificadoTeste();
        Assert.Null(cofre.ConferirCertificado(cert, chave, out var validoAte));
        Assert.Equal(DateTime.Today.AddDays(30).ToString("yyyy-MM-dd"), validoAte);

        var (_, outraChave) = CertificadoTeste();
        Assert.NotNull(cofre.ConferirCertificado(cert, outraChave, out _));
        Assert.NotNull(cofre.ConferirCertificado(Encoding.UTF8.GetBytes("lixo"), chave, out _));
    }

    [Fact]
    public async Task Implantacao_exige_os_segredos_na_primeira_vez_e_nunca_os_devolve()
    {
        var (_, _, integracoes, cofre) = Montar();
        var empresas = new MemRepo<Empresa>();
        empresas.Itens.Add(new Empresa { Id = "emp2", Nome = "Mirai" });
        var bancos = new BancosRegistro(new IBancoModulo[] { NovoSimulador() });
        var svc = new IntegracaoBancariaService(integracoes, empresas, new MemRepo<Carteira>(), bancos, cofre, new FakeAuditoria());

        var semSegredo = await svc.ConfigurarAsync("emp2", new ConfigurarIntegracaoDto("simulador", "sandbox", "client", null, null, null, null, null, true));
        Assert.Contains("primeira configuração", semSegredo.Error);
        Assert.Contains("não suportado", (await svc.ConfigurarAsync("emp2", new ConfigurarIntegracaoDto("banco-x", "sandbox", "client", "s", "c", "k", null, null, true))).Error);

        var (cert, chave) = CertificadoTeste();
        var ok = await svc.ConfigurarAsync("emp2", new ConfigurarIntegracaoDto("simulador", "sandbox", "client", "segredo", Encoding.UTF8.GetString(cert), Encoding.UTF8.GetString(chave), "12.345-6", new() { "cobranca", "invalido" }, true));
        Assert.True(ok.IsSuccess, ok.Error);
        Assert.Equal(new[] { "cobranca" }, ok.Value!.Recursos);
        Assert.Equal("123456", ok.Value.ContaCorrente);
        Assert.DoesNotContain("segredo", JsonSerializer.Serialize(ok.Value));

        // Reconfigurar sem segredos mantém os gravados.
        var mantem = await svc.ConfigurarAsync("emp2", new ConfigurarIntegracaoDto("simulador", "sandbox", "client", null, null, null, null, new() { "cobranca" }, false));
        Assert.True(mantem.IsSuccess, mantem.Error);
        Assert.Equal("segredo", cofre.Abrir(integracoes.Itens.Single(x => x.EmpresaId == "emp2")).ClientSecret);
    }

    [Fact]
    public async Task Padroes_do_boleto_e_conta_do_caixa_sao_conferidos_e_gravados()
    {
        var (_, _, integracoes, cofre) = Montar();
        var empresas = new MemRepo<Empresa>();
        empresas.Itens.Add(new Empresa { Id = "emp", Nome = "Mirai" });
        var carteiras = new MemRepo<Carteira>();
        carteiras.Itens.Add(new Carteira { Id = "cx-inter", EmpresaId = "emp", Tipo = "banco", Nome = "Inter" });
        carteiras.Itens.Add(new Carteira { Id = "cx-outra", EmpresaId = "emp-b", Tipo = "banco", Nome = "Itaú da filial" });
        carteiras.Itens.Add(new Carteira { Id = "cx-caixinha", EmpresaId = "emp", Tipo = "caixa", Nome = "Caixinha" });
        var bancos = new BancosRegistro(new IBancoModulo[] { NovoSimulador() });
        var svc = new IntegracaoBancariaService(integracoes, empresas, carteiras, bancos, cofre, new FakeAuditoria());
        ConfigurarIntegracaoDto Dto(string? carteira = null, RegrasBoleto? regras = null) =>
            new("simulador", "sandbox", "id", null, null, null, null, new() { "cobranca" }, true, carteira, regras);

        Assert.Contains("outra empresa", (await svc.ConfigurarAsync("emp", Dto("cx-outra"))).Error);
        Assert.Contains("conta bancária", (await svc.ConfigurarAsync("emp", Dto("cx-caixinha"))).Error);
        Assert.Contains("valor da multa", (await svc.ConfigurarAsync("emp", Dto(regras: new RegrasBoleto { MultaTipo = RegrasBoleto.Percentual }))).Error);
        Assert.Contains("0 a 60", (await svc.ConfigurarAsync("emp", Dto(regras: new RegrasBoleto { DiasBaixa = 90 }))).Error);
        Assert.Contains("até 3 linhas", (await svc.ConfigurarAsync("emp", Dto(regras: new RegrasBoleto { Instrucoes = new() { "a", "b", "c", "d" } }))).Error);

        var ok = await svc.ConfigurarAsync("emp", Dto("cx-inter", new RegrasBoleto
        {
            MultaTipo = RegrasBoleto.Percentual, Multa = 2, JurosTipo = RegrasBoleto.PercentualMes, Juros = 1,
            DescontoTipo = RegrasBoleto.Nenhum, Desconto = 5, DiasBaixa = 15, Instrucoes = new() { " Não receber após 15 dias ", "" },
        }));
        Assert.True(ok.IsSuccess, ok.Error);
        Assert.Equal("cx-inter", ok.Value!.CarteiraId);
        Assert.Equal(0, ok.Value.Boleto.Desconto); // sem desconto não guarda valor solto
        Assert.Equal(new[] { "Não receber após 15 dias" }, ok.Value.Boleto.Instrucoes);

        // Reconfigurar sem mandar regras nem carteira mantém as gravadas.
        var mantem = await svc.ConfigurarAsync("emp", Dto());
        Assert.Equal(("cx-inter", 15), (mantem.Value!.CarteiraId, mantem.Value.Boleto.DiasBaixa));
    }

    [Fact]
    public async Task Emissao_usa_os_padroes_da_integracao()
    {
        var (svc, _, integracoes, _) = Montar();
        integracoes.Itens.Single().Boleto = new RegrasBoleto { DiasBaixa = 10, Instrucoes = new() { "Após o vencimento, multa de 2%" } };
        var c = (await svc.EmitirAsync("emp", Parcela1, Pedido())).Value!;
        Assert.Equal(CobrancaBancaria.AReceber, c.Situacao);
        Assert.Equal(new[] { "Fatura 61 · parcela 1/1", "Após o vencimento, multa de 2%" },
            CobrancaService.Mensagens(new[] { "Fatura 61 · parcela 1/1" }, integracoes.Itens.Single().RegrasDoBoleto));
        // Nunca passa de 5 linhas, a referência vem primeiro.
        var muitas = CobrancaService.Mensagens(new[] { "r1", "r2" }, new RegrasBoleto { Instrucoes = new() { "i1", "i2", "i3", "i4" } });
        Assert.Equal(new[] { "r1", "r2", "i1", "i2", "i3" }, muitas);
    }

    [Fact]
    public void Multa_juros_desconto_e_pix_vao_no_formato_do_Inter()
    {
        var pagador = new PagadorCobranca("529.982.247-25", "Fulano", "Rua", "1", "", "Centro", "Santos", "SP", "11010-000", "", "");
        var regras = new RegrasBoleto
        {
            MultaTipo = RegrasBoleto.Percentual, Multa = 2, JurosTipo = RegrasBoleto.ValorDia, Juros = 0.333m,
            DescontoTipo = RegrasBoleto.Valor, Desconto = 5, DescontoDiasAntes = 3, ComPix = false,
        };
        var p = InterMapeador.Pedido(new PedidoCobranca("000001", 100m, Venc, 15, pagador, Array.Empty<string>(), regras));
        Assert.Equal(new InterEncargo("PERCENTUAL", Taxa: 2), p.Multa);
        Assert.Equal(new InterEncargo("VALORDIA", Valor: 0.33m), p.Mora);
        Assert.Equal(new InterEncargo("VALORFIXODATAINFORMADA", Valor: 5, QuantidadeDias: 3), p.Desconto);
        Assert.Equal(new[] { "BOLETO" }, p.FormasRecebimento);
        Assert.Equal(15, p.NumDiasAgenda);

        var json = JsonSerializer.Serialize(p, InterJson.Opcoes);
        Assert.Contains("\"multa\":{\"codigo\":\"PERCENTUAL\",\"taxa\":2}", json);

        // Sem regras: nada de multa/mora/desconto e o Inter decide boleto + Pix (como antes).
        var simples = InterMapeador.Pedido(new PedidoCobranca("000002", 100m, Venc, 30, pagador, Array.Empty<string>()));
        Assert.Null(simples.Multa);
        Assert.Null(simples.Mora);
        Assert.Null(simples.Desconto);
        Assert.Null(simples.FormasRecebimento);
    }

    [Fact]
    public async Task Aviso_do_banco_confere_a_cobranca_e_guarda_a_metrica()
    {
        var (svc, cobrancas, integracoes, _) = Montar();
        var token = new string('a', 48);
        integracoes.Itens.Single().AvisoToken = token;
        var c = (await svc.EmitirAsync("emp", Parcela1, Pedido())).Value!;

        Assert.False((await svc.ReceberAvisoAsync("token-errado-de-outra-origem-000000", "[]")).IsSuccess);
        var corpo = $$"""[{"codigoSolicitacao":"{{c.IdBanco}}","seuNumero":"{{c.SeuNumero}}","situacao":"RECEBIDO","dataHoraSituacao":"2026-10-17T10:02:00-03:00"},{"codigoSolicitacao":"de-outro-sistema","situacao":"RECEBIDO","dataHoraSituacao":"2026-10-17T10:00:00-03:00"}]""";
        var r = await svc.ReceberAvisoAsync(token, corpo);

        Assert.Equal(1, r.Value); // a de outro sistema é ignorada
        var paga = cobrancas.Itens.Single();
        Assert.Equal(CobrancaBancaria.Recebida, paga.Situacao); // confirmada pela consulta ao banco
        Assert.Equal("aviso", paga.ConfirmadaPor);
        Assert.Equal("2026-10-17T10:02:00-03:00", paga.PagaEm);
        Assert.NotEmpty(paga.AvisoEm);
        Assert.Equal(0, await svc.ConferirAbertasAsync()); // nada mais em aberto
    }

    // ── extrato ──

    [Fact]
    public void Extrato_do_Inter_vira_linha_de_conciliacao()
    {
        var corpo = """
        {"ultimaPagina":true,"transacoes":[
          {"idTransacao":"abc-1","dataTransacao":"2026-10-18","tipoTransacao":"PIX","tipoOperacao":"C","valor":"2.50","titulo":"Pix recebido","descricao":"PIX RECEBIDO","detalhes":{"tipoDetalhe":"PIX","nomePagador":"Fulano de Tal","cpfCnpjPagador":"529.982.247-25"}},
          {"idTransacao":"abc-2","dataTransacao":"2026-10-18","tipoTransacao":"TRANSFERENCIA","tipoOperacao":"D","valor":"1.99","titulo":"TED enviada","detalhes":{"tipoDetalhe":"TRANSFERENCIA","nomePagador":"Mirai","nomeRecebedor":"Fornecedor Y","cpfCnpjRecebedor":"33444555000166","descricaoTransferencia":"NF 123"}},
          {"dataInclusao":"2026-10-17 10:00:00","tipoOperacao":"C","valor":"100","titulo":"Boleto","detalhes":{"tipoDetalhe":"BOLETO_COBRANCA","nome":"Cliente X","cpfCnpj":"11222333000181","seuNumero":"000123"}}
        ]}
        """;
        var (t, ultima) = InterExtrato.Pagina(corpo);
        Assert.True(ultima);
        Assert.Equal(3, t.Count);
        Assert.Equal(("abc-1", "2026-10-18", 2.50m), (t[0].Id, t[0].Data, t[0].Valor));
        Assert.Contains("Fulano de Tal", t[0].Descricao); // o nome ajuda a sugestão de par
        Assert.Equal(-1.99m, t[1].Valor);                // débito negativo
        Assert.Contains("Fornecedor Y", t[1].Descricao);    // no débito, quem recebeu (não a própria empresa)
        Assert.DoesNotContain("Mirai", t[1].Descricao);
        Assert.Contains("NF 123", t[1].Descricao);
        Assert.Equal("2026-10-17", t[2].Data);
        Assert.StartsWith("inter-", t[2].Id);              // sem idTransacao: id estável pelos dados
        Assert.Equal(t[2].Id, InterExtrato.Pagina(corpo).Transacoes[2].Id);
        Assert.Contains("seu nº 000123", t[2].Descricao);
    }

    [Fact]
    public async Task Simulador_entrega_no_extrato_as_cobrancas_pagas()
    {
        var cobranca = new SimuladorCobranca();
        var extrato = new SimuladorExtrato(cobranca);
        var c = new CredencialBanco("i", "sandbox", "", "", Array.Empty<byte>(), Array.Empty<byte>(), "");
        var env = await cobranca.EmitirAsync(c, new PedidoCobranca("000009", 10m, Venc, 30,
            new PagadorCobranca("52998224725", "Pagador Teste", "Rua", "1", "", "Centro", "São Paulo", "SP", "01001000", "", ""), new[] { "x" }));
        var hoje = DateTime.Today.ToString("yyyy-MM-dd");
        Assert.Empty((await extrato.LerAsync(c, hoje, hoje)).Transacoes);
        cobranca.Pagar(env.IdBanco);
        var lido = (await extrato.LerAsync(c, hoje, hoje)).Transacoes.Single();
        Assert.Equal(10m, lido.Valor);
        Assert.Contains("Pagador Teste", lido.Descricao);
    }

    // ── pagamentos (Pix) ──

    [Theory]
    [InlineData("PAGO", PagamentoBancario.Pago)]
    [InlineData("AGUARDANDO_APROVACAO", PagamentoBancario.AguardandoAprovacao)]
    [InlineData("AGENDADO", PagamentoBancario.Agendado)]
    [InlineData("APROVADO", PagamentoBancario.Processando)]
    [InlineData("DEBITADO", PagamentoBancario.Processando)]
    [InlineData("REPROVADO", PagamentoBancario.Recusado)]
    [InlineData("CANCELADO_SEM_SALDO", PagamentoBancario.Cancelado)]
    [InlineData("FALHA", PagamentoBancario.Falha)]
    public void Status_do_pix_vira_o_nosso(string inter, string nossa) => Assert.Equal(nossa, InterPagamento.Nossa(inter));

    [Fact]
    public void Consulta_e_aviso_do_pix_sao_lidos()
    {
        var s = InterPagamento.Situacao("""{"transacaoPix":{"status":"PAGO","endToEnd":"E0041","dataHoraMovimento":"2026-10-20T15:04:00","valor":4000},"historico":[]}""");
        Assert.Equal((PagamentoBancario.Pago, "E0041", "2026-10-20T15:04:00"), (s.Situacao, s.EndToEnd, s.PagoEm));
        var avisos = InterPagamento.Aviso("""[{"codigoSolicitacao":"c42f","status":"PROCESSADO","dataHoraMovimento":"2026-10-20T15:04:00"},{"status":"x"}]""");
        Assert.Equal(("c42f", "PROCESSADO"), (avisos.Single().IdBanco, avisos.Single().Situacao));
        Assert.Single(InterPagamento.Aviso("""{"codigoSolicitacao":"um-so","status":"PAGO"}"""));
        Assert.Empty(InterPagamento.Aviso("lixo"));
    }

    [Fact]
    public async Task Simulador_de_pix_espera_aprovacao_e_e_idempotente()
    {
        var pag = new SimuladorPagamento();
        var c = new CredencialBanco("i", "sandbox", "", "", Array.Empty<byte>(), Array.Empty<byte>(), "");
        var pedido = new PedidoPix(Guid.NewGuid().ToString(), 4000m, "2026-10-20", "Lanç. 12 · reembolso", "52998224725");
        var e1 = await pag.PagarPixAsync(c, pedido);
        Assert.Equal(DesfechoPagamento.AguardandoAprovacao, e1.Desfecho);
        Assert.Equal(e1.IdBanco, (await pag.PagarPixAsync(c, pedido)).IdBanco); // reenviar o mesmo pedido não cria outro Pix
        Assert.Equal(PagamentoBancario.AguardandoAprovacao, (await pag.ConsultarPixAsync(c, e1.IdBanco)).Situacao!.Situacao);
        pag.LerAviso($$"""[{"codigoSolicitacao":"{{e1.IdBanco}}","status":"PROCESSADO"}]""");
        Assert.Equal(PagamentoBancario.Pago, (await pag.ConsultarPixAsync(c, e1.IdBanco)).Situacao!.Situacao);
    }

    // ── tradução do Inter ──

    [Theory]
    [InlineData("RECEBIDO", CobrancaBancaria.Recebida)]
    [InlineData("MARCADO_RECEBIDO", CobrancaBancaria.Recebida)]
    [InlineData("A_RECEBER", CobrancaBancaria.AReceber)]
    [InlineData("ATRASADO", CobrancaBancaria.AReceber)]
    [InlineData("CANCELADO", CobrancaBancaria.Cancelada)]
    [InlineData("EXPIRADO", CobrancaBancaria.Expirada)]
    [InlineData("FALHA_EMISSAO", CobrancaBancaria.Falha)]
    [InlineData("EM_PROCESSAMENTO", CobrancaBancaria.Processando)]
    public void Situacoes_do_Inter_viram_as_nossas(string inter, string nossa) => Assert.Equal(nossa, InterMapeador.Situacao(inter));

    [Fact]
    public void Pedido_ao_Inter_segue_os_limites_do_swagger()
    {
        var longo = new string('x', 120);
        var p = InterMapeador.Pedido(new PedidoCobranca("000001", 10.005m, Venc, 30,
            new PagadorCobranca("529.982.247-25", longo, longo, "123456789012", longo, longo, longo, "ms", "79.601-970", "", "(67) 99999-0000"),
            new[] { longo, "", "linha 2" }));
        Assert.Equal("FISICA", p.Pagador.TipoPessoa);
        Assert.Equal("52998224725", p.Pagador.CpfCnpj);
        Assert.Equal(100, p.Pagador.Nome.Length);
        Assert.Equal(10, p.Pagador.Numero!.Length);
        Assert.Equal("MS", p.Pagador.Uf);
        Assert.Equal("79601970", p.Pagador.Cep);
        Assert.Null(p.Pagador.Email);
        Assert.Equal(("67", "999990000"), (p.Pagador.Ddd, p.Pagador.Telefone));
        Assert.Equal(78, p.Mensagem!.Linha1!.Length);
        Assert.Equal("linha 2", p.Mensagem.Linha2);
        Assert.Equal(10.01m, p.ValorNominal);
    }

    [Fact]
    public void Erro_do_Inter_vira_uma_mensagem_legivel()
    {
        Assert.Equal("pagador.cep: CEP inválido", InterMapeador.Erro("""{"title":"Erro","violacoes":[{"razao":"CEP inválido","propriedade":"pagador.cep"}]}""", 400));
        Assert.Equal("Cobrança já existe", InterMapeador.Erro("""{"title":"Conflito","detail":"Cobrança já existe"}""", 409));
        Assert.Contains("HTTP 502", InterMapeador.Erro("<html>", 502));
    }

    private static (byte[] Cert, byte[] Chave) CertificadoTeste()
    {
        using var rsa = RSA.Create(2048);
        var req = new CertificateRequest("CN=Teste", rsa, HashAlgorithmName.SHA256, RSASignaturePadding.Pkcs1);
        using var cert = req.CreateSelfSigned(DateTimeOffset.Now.AddDays(-1), DateTimeOffset.Now.Date.AddDays(30).AddHours(12));
        return (Encoding.UTF8.GetBytes(cert.ExportCertificatePem()), Encoding.UTF8.GetBytes(rsa.ExportPkcs8PrivateKeyPem()));
    }

    private sealed class FakeAuditoria : IAuditoriaService
    {
        public Task RegistrarAsync(string acao, string entidade, string entidadeId, string descricao, object? antes = null, object? depois = null, UsuarioAtual? quem = null) => Task.CompletedTask;
        public Task<List<RegistroAuditoria>> ListarAsync(int limite, string? entidade = null, string? usuario = null, string? acao = null, string? entidadeId = null) =>
            Task.FromResult(new List<RegistroAuditoria>());
    }

    private static SimuladorModulo NovoSimulador()
    {
        var c = new SimuladorCobranca();
        return new SimuladorModulo(c, new SimuladorExtrato(c), new SimuladorPagamento());
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

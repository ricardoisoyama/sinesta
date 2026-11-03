using System.Collections.Concurrent;
using System.Text;
using Elrond.Application.Interfaces;
using Elrond.Domain.Entities;

namespace Elrond.Infrastructure.Bancos.Simulador;

/// <summary>
/// Banco de mentira para testes e para empresas sem banco real: registra na memória e responde
/// como um banco assíncrono. Marcas no nome do pagador forçam cenários: [recusar] e [incerto].
/// </summary>
public sealed class SimuladorCobranca : ICobrancaBancaria
{
    private sealed record Registro(string Id, PedidoCobranca Pedido, string Situacao, string PagaEm = "");
    private readonly ConcurrentDictionary<string, Registro> _cobrancas = new();

    public Task<EnvioBanco> EmitirAsync(CredencialBanco c, PedidoCobranca p, CancellationToken ct = default)
    {
        if (p.Pagador.Nome.Contains("[recusar]", StringComparison.OrdinalIgnoreCase)) return Task.FromResult(EnvioBanco.Recusado("pagador: dados recusados (simulador)"));
        var id = Guid.NewGuid().ToString();
        _cobrancas[id] = new Registro(id, p, CobrancaBancaria.AReceber);
        return Task.FromResult(p.Pagador.Nome.Contains("[incerto]", StringComparison.OrdinalIgnoreCase) ? EnvioBanco.Incerto("sem resposta (simulador)") : EnvioBanco.Aceito(id));
    }

    public Task<ConsultaBanco> ConsultarAsync(CredencialBanco c, string idBanco, CancellationToken ct = default) =>
        Task.FromResult(_cobrancas.TryGetValue(idBanco, out var r) ? ConsultaBanco.Encontrada(Situacao(r)) : ConsultaBanco.Inexistente());

    public Task<ConsultaBanco> ConsultarPorSeuNumeroAsync(CredencialBanco c, string seuNumero, string vencimento, CancellationToken ct = default) =>
        Task.FromResult(_cobrancas.Values.FirstOrDefault(r => r.Pedido.SeuNumero == seuNumero) is { } r ? ConsultaBanco.Encontrada(Situacao(r)) : ConsultaBanco.Inexistente());

    public Task<byte[]?> PdfAsync(CredencialBanco c, string idBanco, CancellationToken ct = default) =>
        Task.FromResult(_cobrancas.ContainsKey(idBanco) ? Encoding.ASCII.GetBytes(PdfMinimo($"Boleto simulado {idBanco}")) : null);

    public Task<EnvioBanco> CancelarAsync(CredencialBanco c, string idBanco, string motivo, CancellationToken ct = default)
    {
        if (!_cobrancas.TryGetValue(idBanco, out var r)) return Task.FromResult(EnvioBanco.Recusado("cobrança não encontrada (simulador)"));
        _cobrancas[idBanco] = r with { Situacao = CobrancaBancaria.Cancelada };
        return Task.FromResult(EnvioBanco.Aceito(idBanco));
    }

    public Task<string?> RegistrarAvisoAsync(CredencialBanco c, string url, CancellationToken ct = default) => Task.FromResult<string?>(null);

    /// <summary>Simula o pagamento (usado pelo aviso de RECEBIDO).</summary>
    public void Pagar(string idBanco)
    {
        if (_cobrancas.TryGetValue(idBanco, out var r)) _cobrancas[idBanco] = r with { Situacao = CobrancaBancaria.Recebida, PagaEm = DateTime.Today.ToString("yyyy-MM-dd") };
    }

    /// <summary>Cobranças pagas viram crédito no extrato simulado (com o nome do pagador, como no banco).</summary>
    public IReadOnlyList<TransacaoExtrato> Pagas(string de, string ate) =>
        _cobrancas.Values
            .Where(r => r.Situacao == CobrancaBancaria.Recebida && string.CompareOrdinal(r.PagaEm, de) >= 0 && string.CompareOrdinal(r.PagaEm, ate) <= 0)
            .Select(r => new TransacaoExtrato($"sim-{r.Id}", r.PagaEm, r.Pedido.Valor, $"PIX RECEBIDO · {r.Pedido.Pagador.Nome} · {r.Pedido.Pagador.CpfCnpj} · seu nº {r.Pedido.SeuNumero}"))
            .ToList();

    private static SituacaoNoBanco Situacao(Registro r)
    {
        var numero = r.Pedido.SeuNumero.PadLeft(10, '0');
        var paga = r.Situacao == CobrancaBancaria.Recebida;
        return new SituacaoNoBanco(r.Situacao, r.Situacao.ToUpperInvariant(), numero,
            $"07790.00116 {numero[..5]}.{numero[5..]}1 00000.000001 1 {DateTime.Today:yyMMdd}{(long)(r.Pedido.Valor * 100):D10}",
            $"0779{(long)(r.Pedido.Valor * 100):D10}{numero}", $"00020126SIMULADO{numero}",
            paga ? r.Pedido.Valor : 0m, paga ? DateTime.Today.ToString("yyyy-MM-dd") : string.Empty, paga ? "PIX" : string.Empty, string.Empty);
    }

    private static string PdfMinimo(string texto) =>
        "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj " +
        "3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 595 842]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj " +
        $"4 0 obj<</Length {texto.Length + 30}>>stream\nBT /F1 14 Tf 60 780 Td ({texto}) Tj ET\nendstream endobj " +
        "5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF";
}

/// <summary>
/// Pagamento simulado: como a conta da Mirai, todo Pix espera aprovação no app. "[direto]" na descrição
/// efetiva na hora; "[recusar]" recusa. O aviso PROCESSADO (pela tela de testes) "aprova".
/// </summary>
public sealed class SimuladorPagamento : IPagamentoBancario
{
    private sealed record Registro(string Id, PedidoPix Pedido, string Status, string PagoEm);
    private readonly ConcurrentDictionary<string, Registro> _pix = new();

    public Task<EnvioPagamento> PagarPixAsync(CredencialBanco c, PedidoPix p, CancellationToken ct = default)
    {
        if (p.Descricao.Contains("[recusar]", StringComparison.OrdinalIgnoreCase)) return Task.FromResult(new EnvioPagamento(DesfechoPagamento.Recusado, string.Empty, "chave Pix não encontrada (simulador)"));
        // Idempotência: o mesmo pedido devolve o mesmo pagamento.
        var existente = _pix.Values.FirstOrDefault(r => r.Pedido.Id == p.Id);
        if (existente is not null) return Task.FromResult(new EnvioPagamento(Desfecho(existente.Status), existente.Id, string.Empty));
        var direto = p.Descricao.Contains("[direto]", StringComparison.OrdinalIgnoreCase);
        var id = Guid.NewGuid().ToString();
        _pix[id] = new Registro(id, p, direto ? "PAGO" : "AGUARDANDO_APROVACAO", direto ? DateTime.Now.ToString("yyyy-MM-ddTHH:mm:ss") : string.Empty);
        return Task.FromResult(new EnvioPagamento(direto ? DesfechoPagamento.Processado : DesfechoPagamento.AguardandoAprovacao, id, string.Empty));
    }

    public Task<ConsultaPagamento> ConsultarPixAsync(CredencialBanco c, string idBanco, CancellationToken ct = default) =>
        Task.FromResult(_pix.TryGetValue(idBanco, out var r)
            ? ConsultaPagamento.Encontrado(new SituacaoPagamento(Inter.InterPagamento.Nossa(r.Status), r.Status, r.Status == "PAGO" ? $"E{r.Id[..8]}SIMULADO" : string.Empty, r.PagoEm, string.Empty))
            : ConsultaPagamento.Inexistente());

    public Task<string?> RegistrarAvisoAsync(CredencialBanco c, string url, CancellationToken ct = default) => Task.FromResult<string?>(null);

    // Boleto: como no Inter, NÃO há idempotência (pedir duas vezes inclui dois pagamentos). Valor terminado
    // em ,13 simula envio sem resposta (o pagamento fica incluído); ,66 recusa.
    private sealed record Boleto(string Id, PedidoBoleto Pedido, string Status, string PagoEm, string IncluidoEm);
    private readonly ConcurrentDictionary<string, Boleto> _boletos = new();

    /// <summary>Quantos pagamentos de boleto o simulador incluiu (o teste confere que nunca paga duas vezes).</summary>
    public int BoletosIncluidos(string codigo) => _boletos.Values.Count(b => b.Pedido.Codigo == codigo);

    public Task<EnvioPagamento> PagarBoletoAsync(CredencialBanco c, PedidoBoleto p, CancellationToken ct = default)
    {
        var centavos = (int)(p.Valor * 100 % 100);
        if (centavos == 66) return Task.FromResult(new EnvioPagamento(DesfechoPagamento.Recusado, string.Empty, "boleto já pago ou vencido (simulador)"));
        var id = Guid.NewGuid().ToString();
        _boletos[id] = new Boleto(id, p, "AGUARDANDO_APROVACAO", string.Empty, DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss.fff"));
        return Task.FromResult(centavos == 13
            ? new EnvioPagamento(DesfechoPagamento.Incerto, string.Empty, "sem resposta (simulador)")
            : new EnvioPagamento(DesfechoPagamento.AguardandoAprovacao, id, string.Empty));
    }

    public Task<ConsultaPagamento> ConsultarBoletoAsync(CredencialBanco c, string idBanco, CancellationToken ct = default) =>
        Task.FromResult(_boletos.TryGetValue(idBanco, out var b)
            ? ConsultaPagamento.Encontrado(new SituacaoPagamento(Inter.InterPagamento.NossaBoleto(b.Status), b.Status, b.Status == "REALIZADO" ? $"AUT{b.Id[..8]}" : string.Empty, b.PagoEm, string.Empty, "Beneficiário simulado"))
            : ConsultaPagamento.Inexistente());

    public Task<(string IdBanco, string Falha)> ProcurarBoletoAsync(CredencialBanco c, string codigo, CancellationToken ct = default) =>
        Task.FromResult((_boletos.Values.Where(b => b.Pedido.Codigo == codigo).OrderByDescending(b => b.IncluidoEm).Select(b => b.Id).FirstOrDefault() ?? string.Empty, string.Empty));

    /// <summary>Mesmo formato do Inter. PROCESSADO/PAGO (Pix) e REALIZADO (boleto) "aprovam" no simulador (para a conferência achar pago).</summary>
    public IReadOnlyList<AvisoPagamento> LerAviso(string corpo)
    {
        var avisos = Inter.InterPagamento.Aviso(corpo);
        var agora = DateTime.Now.ToString("yyyy-MM-ddTHH:mm:ss");
        foreach (var a in avisos.Where(a => a.Situacao is "PROCESSADO" or "PAGO" or "REALIZADO"))
        {
            if (_pix.TryGetValue(a.IdBanco, out var r)) _pix[a.IdBanco] = r with { Status = "PAGO", PagoEm = agora };
            if (_boletos.TryGetValue(a.IdBanco, out var b)) _boletos[a.IdBanco] = b with { Status = "REALIZADO", PagoEm = agora[..10] };
        }
        return avisos;
    }

    private static DesfechoPagamento Desfecho(string status) => status switch
    {
        "PAGO" => DesfechoPagamento.Processado,
        "AGENDADO" => DesfechoPagamento.Agendado,
        _ => DesfechoPagamento.AguardandoAprovacao,
    };
}

/// <summary>Extrato simulado: os créditos das cobranças pagas no simulador.</summary>
public sealed class SimuladorExtrato(SimuladorCobranca cobranca) : IExtratoBancario
{
    public Task<ExtratoBanco> LerAsync(CredencialBanco c, string de, string ate, CancellationToken ct = default) =>
        Task.FromResult(ExtratoBanco.Lido(cobranca.Pagas(de, ate)));
}

public sealed class SimuladorModulo(SimuladorCobranca cobranca, SimuladorExtrato extrato, SimuladorPagamento pagamento) : IBancoModulo
{
    public string Codigo => "simulador";
    public string Nome => "Simulador";
    public IReadOnlyList<string> Recursos => [IntegracaoBancaria.RecursoCobranca, IntegracaoBancaria.RecursoExtrato, IntegracaoBancaria.RecursoPagamento];
    public ICobrancaBancaria? Cobranca => cobranca;
    public IExtratoBancario? Extrato => extrato;
    public IPagamentoBancario? Pagamento => pagamento;
    public Task<string?> TestarConexaoAsync(CredencialBanco credencial, CancellationToken ct = default) => Task.FromResult<string?>(null);
    /// <summary>Mesmo formato do Inter. Aviso de RECEBIDO "paga" a cobrança no simulador (para a conferência achar paga).</summary>
    public IReadOnlyList<AvisoCobranca> LerAviso(string corpo)
    {
        var avisos = Inter.InterMapeador.Aviso(corpo);
        foreach (var a in avisos.Where(a => a.Situacao == "RECEBIDO")) cobranca.Pagar(a.IdBanco);
        return avisos;
    }
}

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
    private sealed record Registro(string Id, PedidoCobranca Pedido, string Situacao);
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

    private static SituacaoNoBanco Situacao(Registro r)
    {
        var numero = r.Pedido.SeuNumero.PadLeft(10, '0');
        return new SituacaoNoBanco(r.Situacao, r.Situacao.ToUpperInvariant(), numero,
            $"07790.00116 {numero[..5]}.{numero[5..]}1 00000.000001 1 {DateTime.Today:yyMMdd}{(long)(r.Pedido.Valor * 100):D10}",
            $"0779{(long)(r.Pedido.Valor * 100):D10}{numero}", $"00020126SIMULADO{numero}", 0m, string.Empty, string.Empty, string.Empty);
    }

    private static string PdfMinimo(string texto) =>
        "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj " +
        "3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 595 842]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj " +
        $"4 0 obj<</Length {texto.Length + 30}>>stream\nBT /F1 14 Tf 60 780 Td ({texto}) Tj ET\nendstream endobj " +
        "5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF";
}

public sealed class SimuladorModulo(SimuladorCobranca cobranca) : IBancoModulo
{
    public string Codigo => "simulador";
    public string Nome => "Simulador";
    public ICobrancaBancaria? Cobranca => cobranca;
}

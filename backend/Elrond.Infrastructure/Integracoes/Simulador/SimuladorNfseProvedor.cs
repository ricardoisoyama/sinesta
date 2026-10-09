using System.Collections.Concurrent;
using System.Globalization;
using System.Text;
using Elrond.Application.DTOs;
using Elrond.Application.Interfaces;
using Elrond.Domain.Entities;

namespace Elrond.Infrastructure.Integracoes.Simulador;

/// <summary>
/// Provedor de mentira para testar o motor inteiro sem nota real nem chave de API. Responde como a
/// NFE.io: aceita na hora e "a prefeitura" decide alguns segundos depois. Marcas na descrição da nota
/// escolhem o cenário:
///   [recusar]               o provedor recusa o envio na hora;
///   [incerto]               o envio chega, mas a resposta "se perde" (testa a conferência antes de reenviar);
///   [rejeitar]              a prefeitura rejeita depois;
///   [cancelamento-recusado] a prefeitura recusa o cancelamento.
/// Guarda as notas em memória (somem ao reiniciar a API).
/// </summary>
public sealed class SimuladorNfseProvedor(TimeProvider relogio) : INfseProvedor
{
    private static readonly TimeSpan TempoPrefeitura = TimeSpan.FromSeconds(5);

    private sealed class NotaSimulada
    {
        public required string Id { get; init; }
        public required string IdExterno { get; init; }
        public required PedidoNfseDto Pedido { get; init; }
        public required DateTime RecebidaEm { get; init; }
        public string Numero { get; set; } = string.Empty;
        public DateTime? CancelamentoPedidoEm { get; set; }
    }

    private readonly ConcurrentDictionary<string, NotaSimulada> _porId = new();
    private readonly ConcurrentDictionary<string, string> _idPorExterno = new();
    private int _ultimoNumero;

    public string Nome => ConfiguracaoFiscalEmpresa.ProvedorSimulador;
    public bool Configurado => true;

    public Task<EnvioNfse> EmitirAsync(string idEmpresaProvedor, PedidoNfseDto pedido, string idExterno, CancellationToken ct = default)
    {
        if (Marca(pedido, "recusar"))
            return Task.FromResult(EnvioNfse.Recusado("Simulador: envio recusado de propósito ([recusar] na descrição)."));
        if (_idPorExterno.TryGetValue(idExterno, out var existente))
            return Task.FromResult(EnvioNfse.Aceito(Retorno(_porId[existente])));

        var nota = new NotaSimulada { Id = "sim_" + Guid.NewGuid().ToString("N")[..12], IdExterno = idExterno, Pedido = pedido, RecebidaEm = Agora() };
        _porId[nota.Id] = nota;
        _idPorExterno[idExterno] = nota.Id;
        return Task.FromResult(Marca(pedido, "incerto")
            ? EnvioNfse.Incerto("Simulador: resposta perdida de propósito ([incerto] na descrição)")
            : EnvioNfse.Aceito(Retorno(nota)));
    }

    public Task<ConsultaNfse> ConsultarAsync(string idEmpresaProvedor, string idProvedor, CancellationToken ct = default) =>
        Task.FromResult(_porId.TryGetValue(idProvedor, out var nota) ? ConsultaNfse.Encontrada(Retorno(nota)) : ConsultaNfse.Inexistente());

    public Task<ConsultaNfse> ConsultarPorIdExternoAsync(string idEmpresaProvedor, string idExterno, CancellationToken ct = default) =>
        Task.FromResult(_idPorExterno.TryGetValue(idExterno, out var id) && _porId.TryGetValue(id, out var nota)
            ? ConsultaNfse.Encontrada(Retorno(nota))
            : ConsultaNfse.Inexistente());

    public Task<EnvioNfse> CancelarAsync(string idEmpresaProvedor, string idProvedor, CancellationToken ct = default)
    {
        if (!_porId.TryGetValue(idProvedor, out var nota)) return Task.FromResult(EnvioNfse.Recusado("Simulador: nota não encontrada."));
        if (Retorno(nota).Situacao != SituacaoNfse.Emitida) return Task.FromResult(EnvioNfse.Recusado("Simulador: só nota emitida pode ser cancelada."));
        nota.CancelamentoPedidoEm = Agora();
        return Task.FromResult(EnvioNfse.Aceito(Retorno(nota)));
    }

    public Task<ArquivoNfse?> BaixarAsync(string idEmpresaProvedor, string idProvedor, TipoArquivoNfse tipo, CancellationToken ct = default)
    {
        if (!_porId.TryGetValue(idProvedor, out var nota) || nota.Numero.Length == 0) return Task.FromResult<ArquivoNfse?>(null);
        var arquivo = tipo == TipoArquivoNfse.Pdf
            ? new ArquivoNfse(PdfSimples(Linhas(nota)), "application/pdf", $"nfse-simulada-{nota.Numero}.pdf")
            : new ArquivoNfse(Encoding.UTF8.GetBytes(Xml(nota)), "application/xml", $"nfse-simulada-{nota.Numero}.xml");
        return Task.FromResult<ArquivoNfse?>(arquivo);
    }

    // ───────────────────────────── Comportamento simulado ─────────────────────────────

    /// <summary>Situação da nota agora, como a NFE.io responderia.</summary>
    private RetornoNfse Retorno(NotaSimulada n)
    {
        var agora = Agora();
        var r = n.Pedido.Retencoes;
        var retido = r?.Total ?? 0m;
        var liquido = n.Pedido.Valores.ValorServicos - n.Pedido.Valores.DescontoIncondicionado - retido;
        var aliquota = n.Pedido.Iss?.Aliquota ?? 0.02m;
        var iss = Math.Round((n.Pedido.Valores.ValorServicos - n.Pedido.Valores.DescontoIncondicionado - n.Pedido.Valores.Deducoes) * aliquota, 2);

        RetornoNfse Montar(SituacaoNfse s, string etapa, string msg = "", bool cancelamentoRecusado = false) => new(
            n.Id, s, etapa, msg, cancelamentoRecusado, "Simulador", n.Numero, n.Numero.Length > 0 ? $"SIM{n.Numero}" : string.Empty,
            "SIM", n.Numero, iss, retido, liquido, n.Numero.Length > 0 ? n.RecebidaEm.Add(TempoPrefeitura) : null, null);

        if (agora - n.RecebidaEm < TempoPrefeitura) return Montar(SituacaoNfse.Processando, "WaitingReturn");
        if (Marca(n.Pedido, "rejeitar")) return Montar(SituacaoNfse.Rejeitada, "IssueFailed", "Recusada: Simulador: a prefeitura rejeitou de propósito ([rejeitar] na descrição).");

        if (n.Numero.Length == 0)
            n.Numero = Interlocked.Increment(ref _ultimoNumero).ToString(CultureInfo.InvariantCulture);
        if (n.CancelamentoPedidoEm is not { } pedido) return Montar(SituacaoNfse.Emitida, "Issued");
        if (agora - pedido < TempoPrefeitura) return Montar(SituacaoNfse.Cancelando, "WaitingReturnCancel");
        return Marca(n.Pedido, "cancelamento-recusado")
            ? Montar(SituacaoNfse.Emitida, "CancelFailed", "Simulador: a prefeitura recusou o cancelamento de propósito.", cancelamentoRecusado: true)
            : Montar(SituacaoNfse.Cancelada, "Cancelled") with { CanceladaEm = pedido.Add(TempoPrefeitura) };
    }

    private static bool Marca(PedidoNfseDto p, string marca) =>
        p.Servico.Descricao.Contains($"[{marca}]", StringComparison.OrdinalIgnoreCase);

    private DateTime Agora() => relogio.GetUtcNow().UtcDateTime;

    private static IEnumerable<string> Linhas(NotaSimulada n)
    {
        var p = n.Pedido;
        yield return "NFS-e SIMULADA - SEM VALOR FISCAL";
        yield return $"Numero: {n.Numero}   Codigo de verificacao: SIM{n.Numero}";
        yield return $"Tomador: {p.Tomador.Nome}   Documento: {p.Tomador.Documento}";
        yield return $"Servico: {p.Servico.ItemLc116} / municipal {p.Servico.CodigoMunicipal} / NBS {p.Servico.Nbs}";
        yield return $"Valor: {p.Valores.ValorServicos.ToString("N2", CultureInfo.GetCultureInfo("pt-BR"))}";
        yield return $"Descricao: {p.Servico.Descricao}";
    }

    private static string Xml(NotaSimulada n) =>
        $"""
        <?xml version="1.0" encoding="UTF-8"?>
        <NFSeSimulada aviso="sem valor fiscal">
          <Numero>{n.Numero}</Numero>
          <IdExterno>{n.IdExterno}</IdExterno>
          <Tomador>{System.Security.SecurityElement.Escape(n.Pedido.Tomador.Nome)}</Tomador>
          <ValorServicos>{n.Pedido.Valores.ValorServicos.ToString(CultureInfo.InvariantCulture)}</ValorServicos>
        </NFSeSimulada>
        """;

    /// <summary>PDF mínimo de uma página com as linhas em texto (só para testar o download).</summary>
    private static byte[] PdfSimples(IEnumerable<string> linhas)
    {
        static string Ascii(string s)
        {
            var semAcento = new string(s.Normalize(NormalizationForm.FormD)
                .Where(c => CharUnicodeInfo.GetUnicodeCategory(c) != UnicodeCategory.NonSpacingMark).ToArray());
            return new string(semAcento.Select(c => c is >= ' ' and <= '~' ? c : '?').ToArray())
                .Replace("\\", "\\\\").Replace("(", "\\(").Replace(")", "\\)");
        }
        var texto = new StringBuilder("BT /F1 11 Tf 50 790 Td 16 TL\n");
        foreach (var l in linhas) texto.Append('(').Append(Ascii(l.Length > 95 ? l[..95] : l)).Append(") Tj T*\n");
        texto.Append("ET");
        var objetos = new[]
        {
            "<< /Type /Catalog /Pages 2 0 R >>",
            "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
            "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
            "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
            $"<< /Length {texto.Length} >>\nstream\n{texto}\nendstream",
        };
        var pdf = new StringBuilder("%PDF-1.4\n");
        var posicoes = new List<int>();
        for (var i = 0; i < objetos.Length; i++)
        {
            posicoes.Add(pdf.Length);
            pdf.Append(i + 1).Append(" 0 obj\n").Append(objetos[i]).Append("\nendobj\n");
        }
        var xref = pdf.Length;
        pdf.Append("xref\n0 ").Append(objetos.Length + 1).Append("\n0000000000 65535 f \n");
        foreach (var p in posicoes) pdf.Append(p.ToString("D10", CultureInfo.InvariantCulture)).Append(" 00000 n \n");
        pdf.Append("trailer\n<< /Size ").Append(objetos.Length + 1).Append(" /Root 1 0 R >>\nstartxref\n").Append(xref).Append("\n%%EOF");
        return Encoding.ASCII.GetBytes(pdf.ToString());
    }
}

/// <summary>Os provedores registrados, pelo nome usado na configuração fiscal da empresa.</summary>
public sealed class NfseProvedores(IEnumerable<INfseProvedor> todos) : INfseProvedores
{
    private readonly Dictionary<string, INfseProvedor> _porNome = todos.ToDictionary(p => p.Nome, StringComparer.OrdinalIgnoreCase);

    public INfseProvedor? Para(string nome) => _porNome.GetValueOrDefault(nome ?? string.Empty);
}

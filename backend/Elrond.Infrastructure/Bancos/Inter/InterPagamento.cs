using System.Globalization;
using System.Net;
using System.Text.Json;
using Elrond.Application.Interfaces;
using Elrond.Domain.Entities;
using Microsoft.Extensions.Logging;

namespace Elrond.Infrastructure.Bancos.Inter;

/// <summary>
/// Pagamentos pela API Banking v2 do Inter: Pix (POST /banking/v2/pix) e boleto (POST /banking/v2/pagamento, abaixo).
/// Pix (POST /banking/v2/pix). O id do nosso pagamento vai
/// em x-id-idempotente: reenviar o mesmo pedido devolve o mesmo pagamento, nunca paga duas vezes.
/// A resposta diz se foi efetivado (PROCESSADO), se espera aprovação no app (APROVACAO) ou se ficou
/// agendado (AGENDADO). O aviso pix-pagamento chega quando o Pix é efetivado.
/// </summary>
public sealed class InterPagamento(InterConexao conexao, ILogger<InterPagamento> log) : IPagamentoBancario
{
    private const string Base = "/banking/v2/pix";

    public async Task<EnvioPagamento> PagarPixAsync(CredencialBanco c, PedidoPix p, CancellationToken ct = default)
    {
        try
        {
            var corpo = new
            {
                valor = Math.Round(p.Valor, 2),
                dataPagamento = p.Data,
                descricao = p.Descricao.Length > 140 ? p.Descricao[..140] : p.Descricao,
                destinatario = new { tipo = "CHAVE", chave = p.Chave },
            };
            using var resp = await conexao.EnviarAsync(c, HttpMethod.Post, Base, corpo, ct, InterConexao.EscoposPagamento,
                new Dictionary<string, string> { ["x-id-idempotente"] = p.Id });
            var texto = await resp.Content.ReadAsStringAsync(ct);
            if (resp.IsSuccessStatusCode)
            {
                using var doc = JsonDocument.Parse(texto);
                var r = doc.RootElement;
                var id = Str(r, "codigoSolicitacao");
                if (id.Length == 0) return new EnvioPagamento(DesfechoPagamento.Incerto, string.Empty, "o Inter aceitou mas não devolveu o código do pagamento");
                return Str(r, "tipoRetorno") switch
                {
                    "PROCESSADO" => new EnvioPagamento(DesfechoPagamento.Processado, id, string.Empty),
                    "AGENDADO" => new EnvioPagamento(DesfechoPagamento.Agendado, id, string.Empty),
                    _ => new EnvioPagamento(DesfechoPagamento.AguardandoAprovacao, id, string.Empty),
                };
            }
            var erro = InterMapeador.Erro(texto, (int)resp.StatusCode);
            return resp.StatusCode is HttpStatusCode.BadRequest or HttpStatusCode.Forbidden or HttpStatusCode.NotFound or HttpStatusCode.UnprocessableEntity
                ? new EnvioPagamento(DesfechoPagamento.Recusado, string.Empty, resp.StatusCode == HttpStatusCode.Forbidden ? "a integração no Inter não libera pagamento Pix (escopo pagamento-pix.write)." : erro)
                : new EnvioPagamento(DesfechoPagamento.Incerto, string.Empty, erro);
        }
        catch (InterIndisponivel e) when (e.Recusa)
        {
            return new EnvioPagamento(DesfechoPagamento.Recusado, string.Empty, e.Message);
        }
        catch (Exception e) when (e is InterIndisponivel or HttpRequestException or TaskCanceledException or JsonException)
        {
            log.LogWarning(e, "Pagamento Pix no Inter sem confirmação ({Id})", p.Id);
            return new EnvioPagamento(DesfechoPagamento.Incerto, string.Empty, e is TaskCanceledException ? "o Inter demorou demais para responder" : e.Message);
        }
    }

    public async Task<ConsultaPagamento> ConsultarPixAsync(CredencialBanco c, string idBanco, CancellationToken ct = default)
    {
        try
        {
            using var resp = await conexao.EnviarAsync(c, HttpMethod.Get, $"{Base}/{Uri.EscapeDataString(idBanco)}", null, ct, InterConexao.EscoposPagamento);
            if (resp.StatusCode == HttpStatusCode.NotFound) return ConsultaPagamento.Inexistente();
            var texto = await resp.Content.ReadAsStringAsync(ct);
            if (!resp.IsSuccessStatusCode) return ConsultaPagamento.Falhou(InterMapeador.Erro(texto, (int)resp.StatusCode));
            return ConsultaPagamento.Encontrado(Situacao(texto));
        }
        catch (Exception e) when (e is InterIndisponivel or HttpRequestException or TaskCanceledException or JsonException)
        {
            log.LogWarning(e, "Consulta de pagamento Pix no Inter falhou ({IdBanco})", idBanco);
            return ConsultaPagamento.Falhou(e is TaskCanceledException ? "o Inter demorou demais para responder" : e.Message);
        }
    }

    // ── Boleto (POST /banking/v2/pagamento) ─────────────────────────────────────────────────
    // Sem x-id-idempotente no Inter: um envio sem resposta NUNCA é repetido; procura-se pelo código.

    private const string BaseBoleto = "/banking/v2/pagamento";

    public async Task<EnvioPagamento> PagarBoletoAsync(CredencialBanco c, PedidoBoleto p, CancellationToken ct = default)
    {
        try
        {
            var corpo = new
            {
                codBarraLinhaDigitavel = p.Codigo,
                valorPagar = Math.Round(p.Valor, 2).ToString("0.00", CultureInfo.InvariantCulture),
                dataPagamento = p.Data,
                dataVencimento = p.Vencimento,
            };
            using var resp = await conexao.EnviarAsync(c, HttpMethod.Post, BaseBoleto, corpo, ct, InterConexao.EscoposBoleto);
            var texto = await resp.Content.ReadAsStringAsync(ct);
            if (resp.IsSuccessStatusCode)
            {
                using var doc = JsonDocument.Parse(texto);
                var r = doc.RootElement;
                var id = Str(r, "codigoTransacao");
                if (id.Length == 0) return new EnvioPagamento(DesfechoPagamento.Incerto, string.Empty, "o Inter aceitou mas não devolveu o código do pagamento");
                return NossaBoleto(Str(r, "statusPagamento")) switch
                {
                    PagamentoBancario.AguardandoAprovacao => new EnvioPagamento(DesfechoPagamento.AguardandoAprovacao, id, string.Empty),
                    PagamentoBancario.Agendado => new EnvioPagamento(DesfechoPagamento.Agendado, id, string.Empty),
                    PagamentoBancario.Recusado or PagamentoBancario.Falha or PagamentoBancario.Cancelado => new EnvioPagamento(DesfechoPagamento.Recusado, id, $"o Inter respondeu {Str(r, "statusPagamento")}"),
                    _ => new EnvioPagamento(DesfechoPagamento.Processado, id, string.Empty),
                };
            }
            var erro = InterMapeador.Erro(texto, (int)resp.StatusCode);
            return resp.StatusCode is HttpStatusCode.BadRequest or HttpStatusCode.Forbidden or HttpStatusCode.NotFound or HttpStatusCode.NotAcceptable or HttpStatusCode.Conflict or HttpStatusCode.UnprocessableEntity
                ? new EnvioPagamento(DesfechoPagamento.Recusado, string.Empty, resp.StatusCode == HttpStatusCode.Forbidden ? "a integração no Inter não libera pagamento de boleto (permissão pagamento-boleto.write na aplicação)." : erro)
                : new EnvioPagamento(DesfechoPagamento.Incerto, string.Empty, erro);
        }
        catch (InterIndisponivel e) when (e.Recusa)
        {
            return new EnvioPagamento(DesfechoPagamento.Recusado, string.Empty, e.Message);
        }
        catch (Exception e) when (e is InterIndisponivel or HttpRequestException or TaskCanceledException or JsonException)
        {
            log.LogWarning(e, "Pagamento de boleto no Inter sem confirmação ({Id})", p.Id);
            return new EnvioPagamento(DesfechoPagamento.Incerto, string.Empty, e is TaskCanceledException ? "o Inter demorou demais para responder" : e.Message);
        }
    }

    public async Task<ConsultaPagamento> ConsultarBoletoAsync(CredencialBanco c, string idBanco, CancellationToken ct = default)
    {
        var (lista, falha) = await BuscarBoletosAsync(c, $"codigoTransacao={Uri.EscapeDataString(idBanco)}", ct);
        if (falha.Length > 0) return ConsultaPagamento.Falhou(falha);
        var item = lista.FirstOrDefault(i => Str(i, "codigoTransacao") == idBanco);
        return item.ValueKind == JsonValueKind.Object ? ConsultaPagamento.Encontrado(SituacaoBoleto(item)) : ConsultaPagamento.Inexistente();
    }

    public async Task<(string IdBanco, string Falha)> ProcurarBoletoAsync(CredencialBanco c, string codigo, CancellationToken ct = default)
    {
        var (lista, falha) = await BuscarBoletosAsync(c, $"codBarraLinhaDigitavel={Uri.EscapeDataString(codigo)}", ct);
        if (falha.Length > 0) return (string.Empty, falha);
        // O mais recente que não terminou cancelado/recusado (um cancelado antes não é este envio).
        var achado = lista
            .Where(i => NossaBoleto(Str(i, "statusPagamento")) is not (PagamentoBancario.Cancelado or PagamentoBancario.Recusado))
            .OrderByDescending(i => Str(i, "dataInclusao"), StringComparer.Ordinal)
            .Select(i => Str(i, "codigoTransacao"))
            .FirstOrDefault(id => id.Length > 0);
        return (achado ?? string.Empty, string.Empty);
    }

    /// <summary>GET /pagamento com filtro; últimos 89 dias de inclusão (o Inter aceita até 90).</summary>
    private async Task<(List<JsonElement> Lista, string Falha)> BuscarBoletosAsync(CredencialBanco c, string filtro, CancellationToken ct)
    {
        try
        {
            var hoje = DateTime.Today;
            var url = $"{BaseBoleto}?{filtro}&dataInicio={hoje.AddDays(-89):yyyy-MM-dd}&dataFim={hoje.AddDays(1):yyyy-MM-dd}";
            using var resp = await conexao.EnviarAsync(c, HttpMethod.Get, url, null, ct, InterConexao.EscoposBoleto);
            var texto = await resp.Content.ReadAsStringAsync(ct);
            if (!resp.IsSuccessStatusCode) return (new(), InterMapeador.Erro(texto, (int)resp.StatusCode));
            using var doc = JsonDocument.Parse(texto);
            var raiz = doc.RootElement;
            return (raiz.ValueKind == JsonValueKind.Array ? raiz.EnumerateArray().Select(i => i.Clone()).ToList() : new(), string.Empty);
        }
        catch (Exception e) when (e is InterIndisponivel or HttpRequestException or TaskCanceledException or JsonException)
        {
            log.LogWarning(e, "Consulta de pagamento de boleto no Inter falhou ({Filtro})", filtro);
            return (new(), e is TaskCanceledException ? "o Inter demorou demais para responder" : e.Message);
        }
    }

    /// <summary>Item da consulta de pagamentos de boleto → situação nossa (autenticação no lugar do endToEnd).</summary>
    public static SituacaoPagamento SituacaoBoleto(JsonElement i)
    {
        var status = Str(i, "statusPagamento");
        var nossa = NossaBoleto(status);
        var pagoEm = nossa == PagamentoBancario.Pago ? Str(i, "dataPagamento") : string.Empty;
        return new SituacaoPagamento(nossa, status, Str(i, "autenticacao"), pagoEm, string.Empty, Str(i, "nomeBeneficiario"));
    }

    /// <summary>Status do pagamento de boleto no Inter → situação do pagamento no ELROND.</summary>
    public static string NossaBoleto(string status) => status.ToUpperInvariant() switch
    {
        "REALIZADO" or "PAGO" or "AGENDADO_REALIZADO" => PagamentoBancario.Pago,
        "AGUARDANDO_APROVACAO" => PagamentoBancario.AguardandoAprovacao,
        "AGENDADO" or "PAGAMENTO_AGENDADO" or "PAGAMENTO_COBRANCA_AGENDADO" => PagamentoBancario.Agendado,
        "REPROVADO" => PagamentoBancario.Recusado,
        "CANCELADO" or "AGENDADO_CANCELADO" or "AGENDAMENTO_CANCELADO" or "APROVACAO_EXPIRADA" or "AGENDADO_NAO_REALIZADO" => PagamentoBancario.Cancelado,
        "ERRO" or "ERRO_PAGAMENTO" or "NAO_COMPENSADO" => PagamentoBancario.Falha,
        _ => PagamentoBancario.Processando, // EMPROCESSAMENTO, APROVADO, APROVADO_*: segue em andamento
    };

    public async Task<string?> RegistrarAvisoAsync(CredencialBanco c, string url, CancellationToken ct = default)
    {
        try
        {
            using var resp = await conexao.EnviarAsync(c, HttpMethod.Put, "/banking/v2/webhooks/pix-pagamento", new { webhookUrl = url }, ct, InterConexao.EscoposPagamento);
            if (!resp.IsSuccessStatusCode) return InterMapeador.Erro(await resp.Content.ReadAsStringAsync(ct), (int)resp.StatusCode);
        }
        catch (Exception e) when (e is InterIndisponivel or HttpRequestException or TaskCanceledException)
        {
            return e.Message;
        }
        // O do boleto vai no mesmo endereço. Sem a permissão de boleto na aplicação, só registra no log:
        // o Pix continua avisando e a conferência de hora em hora acompanha os boletos.
        try
        {
            using var resp = await conexao.EnviarAsync(c, HttpMethod.Put, "/banking/v2/webhooks/boleto-pagamento", new { webhookUrl = url }, ct, InterConexao.EscoposBoleto);
            if (!resp.IsSuccessStatusCode) log.LogWarning("Aviso de pagamento de boleto não cadastrado no Inter: {Erro}", InterMapeador.Erro(await resp.Content.ReadAsStringAsync(ct), (int)resp.StatusCode));
        }
        catch (Exception e) when (e is InterIndisponivel or HttpRequestException or TaskCanceledException)
        {
            log.LogWarning(e, "Aviso de pagamento de boleto não cadastrado no Inter");
        }
        return null;
    }

    public IReadOnlyList<AvisoPagamento> LerAviso(string corpo) => Aviso(corpo);

    /// <summary>
    /// Aviso pix-pagamento: lista de { codigoSolicitacao, status, dataHoraMovimento, ... }; boleto-pagamento:
    /// { codigoTransacao, status, dataPagamento, ... } (aceita um item solto também).
    /// </summary>
    public static IReadOnlyList<AvisoPagamento> Aviso(string corpo)
    {
        try
        {
            using var doc = JsonDocument.Parse(corpo);
            var itens = doc.RootElement.ValueKind == JsonValueKind.Array ? doc.RootElement.EnumerateArray().ToList() : new List<JsonElement> { doc.RootElement };
            return itens.Where(i => i.ValueKind == JsonValueKind.Object && (Str(i, "codigoSolicitacao").Length > 0 || Str(i, "codigoTransacao").Length > 0))
                .Select(i => Str(i, "codigoSolicitacao").Length > 0
                    ? new AvisoPagamento(Str(i, "codigoSolicitacao"), Str(i, "status"), Str(i, "dataHoraMovimento"))
                    : new AvisoPagamento(Str(i, "codigoTransacao"), Str(i, "status"), Str(i, "dataPagamento")))
                .ToList();
        }
        catch (JsonException)
        {
            return Array.Empty<AvisoPagamento>();
        }
    }

    /// <summary>Consulta (GET /pix/{codigo}) → situação nossa.</summary>
    public static SituacaoPagamento Situacao(string corpo)
    {
        using var doc = JsonDocument.Parse(corpo);
        var t = doc.RootElement.TryGetProperty("transacaoPix", out var x) && x.ValueKind == JsonValueKind.Object ? x : doc.RootElement;
        var status = Str(t, "status");
        var erros = t.TryGetProperty("erros", out var e) && e.ValueKind == JsonValueKind.Array
            ? string.Join("; ", e.EnumerateArray().Select(i => Str(i, "descricaoErro") is { Length: > 0 } d ? d : Str(i, "codigoErro")).Where(s => s.Length > 0))
            : string.Empty;
        return new SituacaoPagamento(Nossa(status), status, Str(t, "endToEnd"), Str(t, "dataHoraMovimento"), erros);
    }

    /// <summary>Status do Pix no Inter → situação do pagamento no ELROND.</summary>
    public static string Nossa(string status) => status.ToUpperInvariant() switch
    {
        "PAGO" or "PROCESSADO" => PagamentoBancario.Pago,
        "AGUARDANDO_APROVACAO" => PagamentoBancario.AguardandoAprovacao,
        "AGENDADO" => PagamentoBancario.Agendado,
        "REPROVADO" => PagamentoBancario.Recusado,
        "EXPIRADO" or "CANCELADO" or "CANCELADO_SEM_SALDO" or "AGENDAMENTO_CANCELADO" or "NAO_DEBITADO" => PagamentoBancario.Cancelado,
        "FALHA" => PagamentoBancario.Falha,
        _ => PagamentoBancario.Processando, // CRIADO, APROVADO, ENVIADO, DEBITADO, PARCIALMENTE_*: segue em andamento
    };

    private static string Str(JsonElement o, string nome) =>
        o.ValueKind == JsonValueKind.Object && o.TryGetProperty(nome, out var v)
            ? v.ValueKind switch { JsonValueKind.String => v.GetString() ?? string.Empty, JsonValueKind.Number => v.GetRawText(), _ => string.Empty }
            : string.Empty;
}

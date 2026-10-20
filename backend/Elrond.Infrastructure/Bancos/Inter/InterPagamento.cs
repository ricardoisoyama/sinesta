using System.Globalization;
using System.Net;
using System.Text.Json;
using Elrond.Application.Interfaces;
using Elrond.Domain.Entities;
using Microsoft.Extensions.Logging;

namespace Elrond.Infrastructure.Bancos.Inter;

/// <summary>
/// Pagamento Pix pela API Banking v2 do Inter (POST /banking/v2/pix). O id do nosso pagamento vai
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

    public async Task<string?> RegistrarAvisoAsync(CredencialBanco c, string url, CancellationToken ct = default)
    {
        try
        {
            using var resp = await conexao.EnviarAsync(c, HttpMethod.Put, "/banking/v2/webhooks/pix-pagamento", new { webhookUrl = url }, ct, InterConexao.EscoposPagamento);
            return resp.IsSuccessStatusCode ? null : InterMapeador.Erro(await resp.Content.ReadAsStringAsync(ct), (int)resp.StatusCode);
        }
        catch (Exception e) when (e is InterIndisponivel or HttpRequestException or TaskCanceledException)
        {
            return e.Message;
        }
    }

    public IReadOnlyList<AvisoPagamento> LerAviso(string corpo) => Aviso(corpo);

    /// <summary>Aviso pix-pagamento: lista de { codigoSolicitacao, status, dataHoraMovimento, ... } (aceita um item solto também).</summary>
    public static IReadOnlyList<AvisoPagamento> Aviso(string corpo)
    {
        try
        {
            using var doc = JsonDocument.Parse(corpo);
            var itens = doc.RootElement.ValueKind == JsonValueKind.Array ? doc.RootElement.EnumerateArray().ToList() : new List<JsonElement> { doc.RootElement };
            return itens.Where(i => i.ValueKind == JsonValueKind.Object && Str(i, "codigoSolicitacao").Length > 0)
                .Select(i => new AvisoPagamento(Str(i, "codigoSolicitacao"), Str(i, "status"), Str(i, "dataHoraMovimento"))).ToList();
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

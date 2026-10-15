using System.Globalization;
using System.Text.Json;
using Elrond.Application.Interfaces;
using Elrond.Domain.Entities;
using Elrond.Domain.Regras;

namespace Elrond.Infrastructure.Bancos.Inter;

/// <summary>Tradução entre o ELROND e a API do Inter (pedido, situações e mensagens de erro).</summary>
public static class InterMapeador
{
    /// <summary>Situação do Inter → a nossa (igual para qualquer banco).</summary>
    public static string Situacao(string? situacaoInter) => (situacaoInter ?? string.Empty).ToUpperInvariant() switch
    {
        "RECEBIDO" or "MARCADO_RECEBIDO" => CobrancaBancaria.Recebida,
        "A_RECEBER" or "ATRASADO" or "PROTESTO" => CobrancaBancaria.AReceber,
        "CANCELADO" => CobrancaBancaria.Cancelada,
        "EXPIRADO" => CobrancaBancaria.Expirada,
        "FALHA_EMISSAO" => CobrancaBancaria.Falha,
        _ => CobrancaBancaria.Processando, // EM_PROCESSAMENTO ou ainda sem situação
    };

    public static InterEmitirCobranca Pedido(PedidoCobranca p)
    {
        var g = p.Pagador;
        var doc = DocumentoFiscal.Digitos(g.CpfCnpj);
        var fone = DocumentoFiscal.Digitos(g.Telefone);
        var linhas = p.Mensagens.Where(m => !string.IsNullOrWhiteSpace(m)).Select(m => Cortar(m, 78)).Take(5).ToList();
        string? Linha(int i) => i < linhas.Count ? linhas[i] : null;
        return new InterEmitirCobranca(
            p.SeuNumero,
            Math.Round(p.Valor, 2, MidpointRounding.AwayFromZero),
            p.Vencimento,
            p.DiasAgenda,
            new InterPagador(
                doc,
                doc.Length == 11 ? "FISICA" : "JURIDICA",
                Cortar(g.Nome, 100),
                Cortar(g.Endereco, 100),
                Cortar(g.Cidade, 60),
                g.Uf.Trim().ToUpperInvariant(),
                DocumentoFiscal.Digitos(g.Cep),
                Vazio(Cortar(g.Numero, 10)),
                Vazio(Cortar(g.Complemento, 30)),
                Vazio(Cortar(g.Bairro, 60)),
                Vazio(Cortar(g.Email, 50)),
                fone.Length >= 10 ? fone[..2] : null,
                fone.Length >= 10 ? fone[2..Math.Min(fone.Length, 11)] : null),
            linhas.Count > 0 ? new InterMensagem(Linha(0), Linha(1), Linha(2), Linha(3), Linha(4)) : null);
    }

    public static SituacaoNoBanco Situacao(InterCobrancaResposta r)
    {
        var c = r.Cobranca;
        var nossa = Situacao(c?.Situacao);
        var recebido = nossa == CobrancaBancaria.Recebida ? Numero(c?.ValorTotalRecebido) : 0m;
        return new SituacaoNoBanco(
            nossa,
            c?.Situacao ?? string.Empty,
            r.Boleto?.NossoNumero ?? string.Empty,
            r.Boleto?.LinhaDigitavel ?? string.Empty,
            r.Boleto?.CodigoBarras ?? string.Empty,
            r.Pix?.PixCopiaECola ?? string.Empty,
            recebido,
            nossa == CobrancaBancaria.Recebida ? c?.DataSituacao ?? string.Empty : string.Empty,
            nossa == CobrancaBancaria.Recebida ? c?.OrigemRecebimento ?? string.Empty : string.Empty,
            nossa == CobrancaBancaria.Cancelada && !string.IsNullOrWhiteSpace(c?.MotivoCancelamento) ? $"Cancelado: {c!.MotivoCancelamento}" : string.Empty);
    }

    /// <summary>Mensagem de erro do Inter em uma linha: violações (campo: razão) ou o detail/title.</summary>
    public static string Erro(string corpo, int status)
    {
        try
        {
            var p = JsonSerializer.Deserialize<InterProblema>(corpo, InterJson.Opcoes);
            if (p?.Violacoes is { Count: > 0 } v)
                return string.Join("; ", v.Select(x => string.IsNullOrWhiteSpace(x.Propriedade) ? x.Razao : $"{x.Propriedade}: {x.Razao}"));
            if (!string.IsNullOrWhiteSpace(p?.Detail)) return p!.Detail!;
            if (!string.IsNullOrWhiteSpace(p?.Title)) return p!.Title!;
        }
        catch (JsonException)
        {
            // corpo fora do padrão: cai na mensagem genérica
        }
        return $"o Inter respondeu HTTP {status}.";
    }

    /// <summary>O Inter manda valores ora como número, ora como texto ("1180.70").</summary>
    private static decimal Numero(JsonElement? e) => e switch
    {
        { ValueKind: JsonValueKind.Number } n => n.GetDecimal(),
        { ValueKind: JsonValueKind.String } s when decimal.TryParse(s.GetString(), NumberStyles.Number, CultureInfo.InvariantCulture, out var d) => d,
        _ => 0m,
    };

    private static string Cortar(string? s, int max)
    {
        var t = (s ?? string.Empty).Trim();
        return t.Length <= max ? t : t[..max];
    }

    private static string? Vazio(string s) => s.Length == 0 ? null : s;
}

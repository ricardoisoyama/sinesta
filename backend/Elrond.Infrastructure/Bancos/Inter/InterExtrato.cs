using System.Globalization;
using System.Net;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Elrond.Application.Interfaces;
using Microsoft.Extensions.Logging;

namespace Elrond.Infrastructure.Bancos.Inter;

/// <summary>
/// Extrato enriquecido do Inter (GET /banking/v2/extrato/completo): paginado, no máximo 90 dias por
/// consulta (o período maior vira janelas). O idTransacao vira o FITID da conciliação; nome e
/// documento do pagador/recebedor vão na descrição para a sugestão de par achar o lançamento.
/// </summary>
public sealed class InterExtrato(InterConexao conexao, ILogger<InterExtrato> log) : IExtratoBancario
{
    private const string Caminho = "/banking/v2/extrato/completo";
    private const int TamanhoPagina = 1000;
    private const int MaxPaginas = 50;
    private const int DiasPorJanela = 90;

    public async Task<ExtratoBanco> LerAsync(CredencialBanco c, string de, string ate, CancellationToken ct = default)
    {
        if (!DateOnly.TryParseExact(de, "yyyy-MM-dd", out var inicio) || !DateOnly.TryParseExact(ate, "yyyy-MM-dd", out var fim) || fim < inicio)
            return ExtratoBanco.Falhou("período inválido");
        var todas = new List<TransacaoExtrato>();
        try
        {
            for (var janela = inicio; janela <= fim; janela = janela.AddDays(DiasPorJanela))
            {
                var fimJanela = janela.AddDays(DiasPorJanela - 1);
                if (fimJanela > fim) fimJanela = fim;
                for (var pagina = 0; pagina < MaxPaginas; pagina++)
                {
                    var url = $"{Caminho}?dataInicio={janela:yyyy-MM-dd}&dataFim={fimJanela:yyyy-MM-dd}&pagina={pagina}&tamanhoPagina={TamanhoPagina}";
                    using var resp = await conexao.EnviarAsync(c, HttpMethod.Get, url, null, ct);
                    var corpo = await resp.Content.ReadAsStringAsync(ct);
                    if (resp.StatusCode == HttpStatusCode.Forbidden)
                        return ExtratoBanco.Falhou("o Inter não libera o extrato para esta integração (escopo extrato.read).");
                    if (!resp.IsSuccessStatusCode) return ExtratoBanco.Falhou(InterMapeador.Erro(corpo, (int)resp.StatusCode));
                    var (lote, ultima) = Pagina(corpo);
                    todas.AddRange(lote);
                    if (lote.Count == 0 || ultima) break;
                }
            }
            return ExtratoBanco.Lido(todas);
        }
        catch (Exception e) when (e is InterIndisponivel or HttpRequestException or TaskCanceledException or JsonException)
        {
            log.LogWarning(e, "Leitura do extrato no Inter falhou");
            return ExtratoBanco.Falhou(e is TaskCanceledException ? "o Inter demorou demais para responder" : e.Message);
        }
    }

    /// <summary>Uma página da resposta do Inter: as transações convertidas e se é a última.</summary>
    public static (IReadOnlyList<TransacaoExtrato> Transacoes, bool Ultima) Pagina(string corpo)
    {
        var r = JsonSerializer.Deserialize<InterExtratoResposta>(corpo, InterJson.Opcoes);
        return ((r?.Transacoes ?? new()).Select(Transacao).ToList(), r?.UltimaPagina != false);
    }

    /// <summary>Converte a transação do Inter. Valor vem em texto; D = débito (negativo).</summary>
    private static TransacaoExtrato Transacao(InterTransacao t)
    {
        var valor = decimal.TryParse(t.Valor, NumberStyles.Number, CultureInfo.InvariantCulture, out var v) ? Math.Abs(v) : 0m;
        if (string.Equals(t.TipoOperacao, "D", StringComparison.OrdinalIgnoreCase)) valor = -valor;
        var data = (t.DataTransacao ?? t.DataInclusao ?? string.Empty) is { Length: >= 10 } d ? d[..10] : string.Empty;
        var detalhes = Detalhes(t.Detalhes);
        var partes = new[] { t.Titulo, t.Descricao, detalhes.Nome, detalhes.Documento, detalhes.SeuNumero is { Length: > 0 } sn ? $"seu nº {sn}" : null }
            .Where(x => !string.IsNullOrWhiteSpace(x)).Select(x => x!.Trim()).Distinct();
        var descricao = string.Join(" · ", partes);
        if (descricao.Length > 400) descricao = descricao[..400];
        // Sem idTransacao (contingência do Inter): id estável pelos dados, para não duplicar ao buscar de novo.
        var id = t.IdTransacao is { Length: > 0 } x ? x : "inter-" + Convert.ToHexString(SHA1.HashData(Encoding.UTF8.GetBytes($"{data}|{valor}|{descricao}|{t.NumeroDocumento}")))[..20];
        return new TransacaoExtrato(id, data, valor, descricao);
    }

    /// <summary>Nome, documento e seu número de quem pagou/recebeu, seja qual for o tipo de detalhe.</summary>
    private static (string? Nome, string? Documento, string? SeuNumero) Detalhes(JsonElement? detalhes)
    {
        if (detalhes is not { ValueKind: JsonValueKind.Object } d) return (null, null, null);
        string? Ler(params string[] nomes) =>
            nomes.Select(n => d.TryGetProperty(n, out var p) && p.ValueKind == JsonValueKind.String ? p.GetString() : null).FirstOrDefault(s => !string.IsNullOrWhiteSpace(s));
        return (Ler("nomePagador", "nome", "nomeRecebedor", "nomeEmpresa"), Ler("cpfCnpjPagador", "cpfCnpj", "cpfCnpjRecebedor"), Ler("seuNumero"));
    }
}

internal sealed record InterExtratoResposta(List<InterTransacao>? Transacoes, bool? UltimaPagina, int? TotalPaginas);

internal sealed record InterTransacao(
    string? IdTransacao, string? DataInclusao, string? DataTransacao, string? TipoTransacao, string? TipoOperacao,
    string? Valor, string? Titulo, string? Descricao, string? NumeroDocumento, JsonElement? Detalhes);

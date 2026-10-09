using System.Net;
using System.Text;
using System.Text.Json;
using Elrond.Application.DTOs;
using Elrond.Application.Interfaces;
using Elrond.Domain.Entities;
using Microsoft.Extensions.Logging;

namespace Elrond.Infrastructure.Integracoes.NfeIo;

/// <summary>Configuração da NFE.io (NfeIo__ChaveApi etc. no ambiente do servidor; nunca no código).</summary>
public sealed class NfeIoOpcoes
{
    /// <summary>Chave de Nota Fiscal da conta (vai no cabeçalho Authorization, sem "Bearer").</summary>
    public string ChaveApi { get; init; } = string.Empty;
    /// <summary>Host da emissão de NFS-e (API v1).</summary>
    public string UrlBase { get; init; } = "https://api.nfe.io";
    /// <summary>Segredo do webhook cadastrado na conta (confere a assinatura dos avisos).</summary>
    public string SegredoAviso { get; init; } = string.Empty;

    public bool Configurada => ChaveApi.Length > 0;
}

/// <summary>
/// Emissão, consulta e cancelamento de NFS-e pela NFE.io. O ambiente (teste ou produção) não vai
/// na nota: é o da Inscrição Municipal cadastrada na NFE.io para a empresa.
/// </summary>
public sealed class NfeIoProvedor(HttpClient http, NfeIoOpcoes opcoes, ILogger<NfeIoProvedor> log) : INfseProvedor
{
    public string Nome => ConfiguracaoFiscalEmpresa.ProvedorNfeIo;
    public bool Configurado => opcoes.Configurada;

    public async Task<EnvioNfse> EmitirAsync(string idEmpresaProvedor, PedidoNfseDto pedido, string idExterno, CancellationToken ct = default)
    {
        var corpo = NfeIoMapeador.ParaEmissao(pedido, idExterno);
        var resposta = await EnviarAsync(HttpMethod.Post, Rota(idEmpresaProvedor), corpo, ct);
        return resposta.Status switch
        {
            HttpStatusCode.OK or HttpStatusCode.Created or HttpStatusCode.Accepted
                => Ler(resposta.Corpo) is { } nota && nota.IdProvedor.Length > 0
                    ? EnvioNfse.Aceito(nota)
                    : EnvioNfse.Incerto("o provedor aceitou, mas não devolveu o identificador da nota"),
            // RPS/identificador já enviado: confere pelo identificador antes de qualquer coisa.
            HttpStatusCode.Conflict => EnvioNfse.Incerto("o provedor indica que esta nota já foi enviada"),
            _ => DesfechoDeErro(resposta, "emissão"),
        };
    }

    public async Task<ConsultaNfse> ConsultarAsync(string idEmpresaProvedor, string idProvedor, CancellationToken ct = default) =>
        Consulta(await EnviarAsync(HttpMethod.Get, $"{Rota(idEmpresaProvedor)}/{Uri.EscapeDataString(idProvedor)}", null, ct));

    public async Task<ConsultaNfse> ConsultarPorIdExternoAsync(string idEmpresaProvedor, string idExterno, CancellationToken ct = default) =>
        Consulta(await EnviarAsync(HttpMethod.Get, $"{Rota(idEmpresaProvedor)}/external/{Uri.EscapeDataString(idExterno)}", null, ct));

    public async Task<EnvioNfse> CancelarAsync(string idEmpresaProvedor, string idProvedor, CancellationToken ct = default)
    {
        var resposta = await EnviarAsync(HttpMethod.Delete, $"{Rota(idEmpresaProvedor)}/{Uri.EscapeDataString(idProvedor)}", null, ct);
        if (resposta.Status is HttpStatusCode.OK or HttpStatusCode.Accepted or HttpStatusCode.NoContent)
        {
            // O cancelamento também é assíncrono: sem corpo, fica "cancelando" até a prefeitura responder.
            var retorno = Ler(resposta.Corpo) ?? new RetornoNfse(idProvedor, SituacaoNfse.Cancelando, "WaitingSendCancel", string.Empty);
            return EnvioNfse.Aceito(retorno);
        }
        return DesfechoDeErro(resposta, "cancelamento");
    }

    public async Task<ArquivoNfse?> BaixarAsync(string idEmpresaProvedor, string idProvedor, TipoArquivoNfse tipo, CancellationToken ct = default)
    {
        var sufixo = tipo == TipoArquivoNfse.Pdf ? "pdf" : "xml";
        using var req = Requisicao(HttpMethod.Get, $"{Rota(idEmpresaProvedor)}/{Uri.EscapeDataString(idProvedor)}/{sufixo}", null);
        try
        {
            // O provedor redireciona para uma URL assinada e temporária; o HttpClient segue e não repassa a chave.
            using var resp = await http.SendAsync(req, ct);
            if (!resp.IsSuccessStatusCode)
            {
                log.LogInformation("NFE.io: {Tipo} da nota {Nota} indisponível ({Status}).", sufixo, idProvedor, (int)resp.StatusCode);
                return null;
            }
            var conteudo = await resp.Content.ReadAsByteArrayAsync(ct);
            var tipoConteudo = resp.Content.Headers.ContentType?.MediaType ?? (tipo == TipoArquivoNfse.Pdf ? "application/pdf" : "application/xml");
            return new ArquivoNfse(conteudo, tipoConteudo, $"nfse-{idProvedor}.{sufixo}");
        }
        catch (Exception e) when (e is HttpRequestException or TaskCanceledException)
        {
            log.LogWarning("NFE.io: download do {Tipo} da nota {Nota} falhou: {Erro}", sufixo, idProvedor, e.Message);
            return null;
        }
    }

    // ───────────────────────────── HTTP ─────────────────────────────

    private sealed record Resposta(HttpStatusCode? Status, string Corpo, string Falha);

    private static string Rota(string idEmpresaProvedor) => $"/v1/companies/{Uri.EscapeDataString(idEmpresaProvedor)}/serviceinvoices";

    private HttpRequestMessage Requisicao(HttpMethod metodo, string caminho, string? corpoJson)
    {
        var req = new HttpRequestMessage(metodo, new Uri(new Uri(opcoes.UrlBase), caminho));
        req.Headers.TryAddWithoutValidation("Authorization", opcoes.ChaveApi);
        req.Headers.Accept.ParseAdd("application/json");
        if (corpoJson is not null) req.Content = new StringContent(corpoJson, Encoding.UTF8, "application/json");
        return req;
    }

    /// <summary>Faz a chamada e devolve status + corpo. Falha de rede ou tempo esgotado viram "sem status" (incerto).</summary>
    private async Task<Resposta> EnviarAsync(HttpMethod metodo, string caminho, string? corpoJson, CancellationToken ct)
    {
        using var req = Requisicao(metodo, caminho, corpoJson);
        try
        {
            using var resp = await http.SendAsync(req, ct);
            var corpo = await resp.Content.ReadAsStringAsync(ct);
            if (!resp.IsSuccessStatusCode)
                log.LogWarning("NFE.io {Metodo} {Rota} respondeu {Status}: {Erro}", metodo, caminho, (int)resp.StatusCode, Resumo(corpo, 300));
            return new Resposta(resp.StatusCode, corpo, string.Empty);
        }
        catch (TaskCanceledException) when (!ct.IsCancellationRequested)
        {
            return new Resposta(null, string.Empty, "o provedor demorou a responder");
        }
        catch (HttpRequestException e)
        {
            log.LogWarning("NFE.io {Metodo} {Rota} sem resposta: {Erro}", metodo, caminho, e.Message);
            return new Resposta(null, string.Empty, "sem conexão com o provedor");
        }
    }

    private static ConsultaNfse Consulta(Resposta r) => r.Status switch
    {
        HttpStatusCode.OK => Ler(r.Corpo) is { } nota ? ConsultaNfse.Encontrada(nota) : ConsultaNfse.Falhou("resposta ilegível do provedor"),
        HttpStatusCode.NotFound => ConsultaNfse.Inexistente(),
        null => ConsultaNfse.Falhou(r.Falha),
        _ => ConsultaNfse.Falhou($"o provedor respondeu {(int)r.Status}"),
    };

    /// <summary>
    /// Erro de envio: 4xx de dado ou configuração = recusado (nada emitido); tempo esgotado, 5xx e
    /// falha de rede = incerto (pode ter chegado: o motor confere antes de reenviar).
    /// </summary>
    private static EnvioNfse DesfechoDeErro(Resposta r, string operacao) => r.Status switch
    {
        null => EnvioNfse.Incerto(r.Falha),
        HttpStatusCode.Unauthorized or HttpStatusCode.Forbidden
            => EnvioNfse.Recusado("A NFE.io recusou a chave de API (inválida ou sem permissão). Confira a configuração do ambiente."),
        HttpStatusCode.NotFound => EnvioNfse.Recusado(NaoEncontrado(r.Corpo, operacao)),
        HttpStatusCode.BadRequest or HttpStatusCode.UnprocessableEntity
            => EnvioNfse.Recusado($"A NFE.io recusou a {operacao}: {MensagemDeErro(r.Corpo)}"),
        HttpStatusCode.RequestTimeout or HttpStatusCode.GatewayTimeout or HttpStatusCode.BadGateway or HttpStatusCode.ServiceUnavailable
            or HttpStatusCode.InternalServerError
            => EnvioNfse.Incerto($"o provedor respondeu {(int)r.Status}"),
        _ => EnvioNfse.Incerto($"resposta inesperada do provedor ({(int)r.Status})"),
    };

    /// <summary>404 da NFE.io: diz o que faltou no cadastro da empresa lá (implantação), em português quando conhecido.</summary>
    public static string NaoEncontrado(string corpo, string operacao)
    {
        var detalhe = MensagemDeErro(corpo);
        if (detalhe.Contains("municipal tax", StringComparison.OrdinalIgnoreCase))
            return "A empresa não tem Inscrição Municipal cadastrada na NFE.io. Isso é feito na implantação (cadastro da empresa lá).";
        if (detalhe.Contains("company", StringComparison.OrdinalIgnoreCase))
            return "A NFE.io não encontrou a empresa. Confira o identificador da empresa (company_id) na configuração fiscal.";
        return $"A NFE.io não encontrou o que a {operacao} precisa: {detalhe}";
    }

    private static RetornoNfse? Ler(string corpo)
    {
        if (string.IsNullOrWhiteSpace(corpo)) return null;
        try
        {
            using var doc = JsonDocument.Parse(corpo);
            return doc.RootElement.ValueKind == JsonValueKind.Object ? NfeIoMapeador.ParaRetorno(doc.RootElement) : null;
        }
        catch (JsonException)
        {
            return null;
        }
    }

    /// <summary>O 400 da NFE.io é um texto (às vezes JSON com "message" ou "errors"): extrai a parte útil.</summary>
    public static string MensagemDeErro(string corpo)
    {
        var texto = corpo.Trim();
        if (texto.StartsWith('{') || texto.StartsWith('['))
        {
            try
            {
                using var doc = JsonDocument.Parse(texto);
                var raiz = doc.RootElement;
                var partes = new List<string>();
                Coletar(raiz, partes);
                if (partes.Count > 0) return Resumo(string.Join("; ", partes.Distinct()), 600);
            }
            catch (JsonException)
            {
                // cai no texto bruto
            }
        }
        if (texto.StartsWith('"') && texto.EndsWith('"') && texto.Length > 1) texto = texto[1..^1];
        return texto.Length == 0 ? "sem detalhe" : Resumo(texto, 600);
    }

    private static void Coletar(JsonElement e, List<string> partes)
    {
        switch (e.ValueKind)
        {
            case JsonValueKind.Object:
                foreach (var p in e.EnumerateObject())
                {
                    if (p.Name.Equals("message", StringComparison.OrdinalIgnoreCase) && p.Value.ValueKind == JsonValueKind.String)
                        partes.Add(p.Value.GetString()!);
                    else if (p.Value.ValueKind is JsonValueKind.Object or JsonValueKind.Array) Coletar(p.Value, partes);
                    else if (p.Name.Equals("detail", StringComparison.OrdinalIgnoreCase) && p.Value.ValueKind == JsonValueKind.String)
                        partes.Add(p.Value.GetString()!);
                }
                break;
            case JsonValueKind.Array:
                foreach (var item in e.EnumerateArray())
                {
                    if (item.ValueKind == JsonValueKind.String) partes.Add(item.GetString()!);
                    else Coletar(item, partes);
                }
                break;
        }
    }

    private static string Resumo(string s, int max) => s.Length <= max ? s : s[..max] + "…";
}

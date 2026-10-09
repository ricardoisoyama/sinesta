using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Elrond.Application.Interfaces;
using Elrond.Domain.Entities;

namespace Elrond.Infrastructure.Integracoes.NfeIo;

/// <summary>
/// Avisos (webhook) da NFE.io: confere a assinatura e traduz o corpo. A assinatura é HMAC-SHA1
/// dos bytes crus do corpo com o segredo cadastrado na conta, no cabeçalho X-Hub-Signature ("sha1=hex").
/// </summary>
public sealed class NfeIoAvisos(NfeIoOpcoes opcoes)
{
    public bool Configurado => opcoes.SegredoAviso.Length > 0;

    /// <summary>A assinatura confere com o segredo? Sem segredo configurado, nenhum aviso é aceito.</summary>
    public bool AssinaturaValida(byte[] corpo, string? assinatura) => AssinaturaValida(corpo, assinatura, opcoes.SegredoAviso);

    public static bool AssinaturaValida(byte[] corpo, string? assinatura, string segredo)
    {
        if (segredo.Length == 0 || string.IsNullOrWhiteSpace(assinatura)) return false;
        var informada = assinatura.Trim();
        if (informada.StartsWith("sha1=", StringComparison.OrdinalIgnoreCase)) informada = informada[5..];
        var esperada = Convert.ToHexString(HMACSHA1.HashData(Encoding.UTF8.GetBytes(segredo), corpo)).ToLowerInvariant();
        return CryptographicOperations.FixedTimeEquals(Encoding.ASCII.GetBytes(esperada), Encoding.ASCII.GetBytes(informada.ToLowerInvariant()));
    }

    /// <summary>
    /// Traduz o aviso de NFS-e ({"action": "...", "payload": {nota}}). Null quando não é de nota de
    /// serviço (outros eventos da conta) ou não dá para identificar a nota.
    /// </summary>
    public static AvisoNfse? Interpretar(byte[] corpo, string? idAviso)
    {
        using var doc = JsonDocument.Parse(corpo);
        var raiz = doc.RootElement;
        if (raiz.ValueKind != JsonValueKind.Object) return null;
        var nota = raiz.TryGetProperty("payload", out var p) && p.ValueKind == JsonValueKind.Object ? p : raiz;
        var retorno = NfeIoMapeador.ParaRetorno(nota);
        var idExterno = nota.TryGetProperty("externalId", out var e) && e.ValueKind == JsonValueKind.String ? e.GetString() ?? string.Empty : string.Empty;
        if (retorno.IdProvedor.Length == 0 && idExterno.Length == 0) return null;

        // Sem X-Hook-Id, a identidade do aviso é o conteúdo (o mesmo aviso repetido tem o mesmo hash).
        var id = string.IsNullOrWhiteSpace(idAviso) ? "sha256:" + Convert.ToHexString(SHA256.HashData(corpo)) : idAviso.Trim();
        return new AvisoNfse(id, ConfiguracaoFiscalEmpresa.ProvedorNfeIo, idExterno, retorno);
    }
}

using System.Security.Cryptography;
using System.Text;

namespace Elrond.Infrastructure.Integracoes.Google;

/// <summary>
/// Configuração do app ELROND no Google Cloud. Vem do ambiente do servidor (Google__ClientId,
/// Google__ClientSecret, Google__ChaveCriptografia, Google__RetornoUrl, App__UrlPublica), nunca do código.
/// </summary>
public sealed class GoogleOpcoes
{
    public string ClientId { get; init; } = string.Empty;
    public string ClientSecret { get; init; } = string.Empty;
    /// <summary>32 bytes em base64: cifra as chaves do Google no banco e assina o estado do OAuth.</summary>
    public string ChaveCriptografia { get; init; } = string.Empty;
    /// <summary>URI de retorno cadastrada no Google (ex.: https://elrond.sinesta.com.br/api/integracoes/google/retorno).</summary>
    public string RetornoUrl { get; init; } = string.Empty;
    /// <summary>Endereço público do ELROND (links nos eventos e volta depois da autorização).</summary>
    public string UrlPublica { get; init; } = string.Empty;

    public bool Configurado =>
        ClientId.Length > 0 && ClientSecret.Length > 0 && RetornoUrl.Length > 0 && Chave() is { Length: 32 };

    public byte[]? Chave()
    {
        try
        {
            return ChaveCriptografia.Length == 0 ? null : Convert.FromBase64String(ChaveCriptografia);
        }
        catch (FormatException)
        {
            return null;
        }
    }
}

/// <summary>
/// Cofre das chaves do Google: AES-GCM para guardar no banco e HMAC para o "state" do OAuth
/// (o retorno do Google só é aceito se o estado foi emitido por este servidor e não venceu).
/// </summary>
public static class CofreGoogle
{
    public static string Cifrar(string texto, byte[] chave)
    {
        if (string.IsNullOrEmpty(texto)) return string.Empty;
        var nonce = RandomNumberGenerator.GetBytes(12);
        var claro = Encoding.UTF8.GetBytes(texto);
        var cifrado = new byte[claro.Length];
        var tag = new byte[16];
        using var aes = new AesGcm(chave, 16);
        aes.Encrypt(nonce, claro, cifrado, tag);
        return Convert.ToBase64String(nonce.Concat(tag).Concat(cifrado).ToArray());
    }

    public static string Decifrar(string pacote, byte[] chave)
    {
        if (string.IsNullOrEmpty(pacote)) return string.Empty;
        var bytes = Convert.FromBase64String(pacote);
        var nonce = bytes[..12];
        var tag = bytes[12..28];
        var cifrado = bytes[28..];
        var claro = new byte[cifrado.Length];
        using var aes = new AesGcm(chave, 16);
        aes.Decrypt(nonce, cifrado, tag, claro);
        return Encoding.UTF8.GetString(claro);
    }

    /// <summary>Estado do OAuth: usuário + validade, assinado. Vale 15 minutos.</summary>
    public static string EmitirEstado(string usuarioId, byte[] chave, DateTimeOffset agora)
    {
        var corpo = $"{usuarioId}|{agora.AddMinutes(15).ToUnixTimeSeconds()}|{Convert.ToHexString(RandomNumberGenerator.GetBytes(8))}";
        var b64 = Base64Url(Encoding.UTF8.GetBytes(corpo));
        return $"{b64}.{Base64Url(HMACSHA256.HashData(chave, Encoding.UTF8.GetBytes(b64)))}";
    }

    /// <summary>Id do usuário do estado, ou null se a assinatura não confere ou venceu.</summary>
    public static string? ValidarEstado(string estado, byte[] chave, DateTimeOffset agora)
    {
        var partes = (estado ?? string.Empty).Split('.');
        if (partes.Length != 2) return null;
        var esperada = Base64Url(HMACSHA256.HashData(chave, Encoding.UTF8.GetBytes(partes[0])));
        if (!CryptographicOperations.FixedTimeEquals(Encoding.ASCII.GetBytes(esperada), Encoding.ASCII.GetBytes(partes[1]))) return null;
        string corpo;
        try
        {
            corpo = Encoding.UTF8.GetString(DeBase64Url(partes[0]));
        }
        catch (FormatException)
        {
            return null;
        }
        var campos = corpo.Split('|');
        if (campos.Length != 3 || !long.TryParse(campos[1], out var vence)) return null;
        return agora.ToUnixTimeSeconds() > vence ? null : campos[0];
    }

    private static string Base64Url(byte[] b) => Convert.ToBase64String(b).TrimEnd('=').Replace('+', '-').Replace('/', '_');

    private static byte[] DeBase64Url(string s)
    {
        var t = s.Replace('-', '+').Replace('_', '/');
        return Convert.FromBase64String(t.PadRight(t.Length + (4 - t.Length % 4) % 4, '='));
    }
}

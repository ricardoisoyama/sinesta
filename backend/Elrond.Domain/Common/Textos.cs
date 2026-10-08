using System.Globalization;
using System.Text;

namespace Elrond.Domain.Common;

public static class Textos
{
    /// <summary>Normaliza para busca: minúsculo e sem acentos ("São Paulo" → "sao paulo").</summary>
    public static string Normalizar(string texto)
    {
        var decomposto = texto.Trim().ToLowerInvariant().Normalize(NormalizationForm.FormD);
        var sb = new StringBuilder(decomposto.Length);
        foreach (var ch in decomposto)
            if (CharUnicodeInfo.GetUnicodeCategory(ch) != UnicodeCategory.NonSpacingMark)
                sb.Append(ch);
        return sb.ToString().Normalize(NormalizationForm.FormC);
    }
}

using System.Text.RegularExpressions;
using Elrond.Domain.Common;

namespace Elrond.Domain.Regras;

/// <summary>
/// Interpreta o que a pessoa digitou na busca de cidade. Aceita só o nome ("são pa") ou o
/// formato da lista, "UF - nome" ("SP - são pa"). A UF informada à parte (o campo de UF da
/// tela) prevalece sobre a digitada.
/// </summary>
public static partial class BuscaCidade
{
    [GeneratedRegex(@"^\s*([A-Za-z]{2})\s*-\s*(.*)$")]
    private static partial Regex UfNoInicio();

    /// <summary>As 27 UFs: "Ji-Paraná" não pode virar UF "JI".</summary>
    public static readonly HashSet<string> Ufs = new(StringComparer.OrdinalIgnoreCase)
    {
        "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB", "PR",
        "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
    };

    /// <summary>
    /// Separa nome e UF de um texto de cidade nos dois formatos do sistema: "Campinas - SP"
    /// (endereços) e "SP - Campinas" (campos de Dados da Operação). Só aceita UF válida, então
    /// "Ji-Paraná - RO" dá (Ji-Paraná, RO). Sem UF reconhecível: (texto, "").
    /// </summary>
    public static (string Nome, string Uf) Separar(string texto)
    {
        var t = (texto ?? string.Empty).Trim();
        var i = t.LastIndexOf('-');
        if (i > 0 && Ufs.Contains(t[(i + 1)..].Trim())) return (t[..i].Trim(), t[(i + 1)..].Trim().ToUpperInvariant());
        var m = UfNoInicio().Match(t);
        if (m.Success && Ufs.Contains(m.Groups[1].Value)) return (m.Groups[2].Value.Trim(), m.Groups[1].Value.ToUpperInvariant());
        return (t, string.Empty);
    }

    /// <summary>(UF em maiúsculas ou vazia, nome normalizado para a busca).</summary>
    public static (string Uf, string Nome) Interpretar(string termo, string? uf = null)
    {
        var texto = termo ?? string.Empty;
        var ufDigitada = string.Empty;
        var m = UfNoInicio().Match(texto);
        if (m.Success && Ufs.Contains(m.Groups[1].Value))
        {
            ufDigitada = m.Groups[1].Value.ToUpperInvariant();
            texto = m.Groups[2].Value;
        }
        var ufFinal = string.IsNullOrWhiteSpace(uf) ? ufDigitada : uf.Trim().ToUpperInvariant();
        return (Ufs.Contains(ufFinal) ? ufFinal : string.Empty, Textos.Normalizar(texto));
    }
}

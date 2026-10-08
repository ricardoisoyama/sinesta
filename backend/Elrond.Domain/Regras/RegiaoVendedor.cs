using System.Globalization;
using System.Text;
using Elrond.Domain.Entities;

namespace Elrond.Domain.Regras;

/// <summary>
/// Região de atendimento do vendedor como LISTA DE EXCLUSÃO: o vendedor não pode vender
/// para cliente das regiões cadastradas (país inteiro, um estado ou uma cidade).
/// A cidade do cliente vem no formato "Cidade - UF".
/// </summary>
public static class RegiaoVendedor
{
    private static string Normalizar(string s)
    {
        var d = s.Normalize(NormalizationForm.FormD);
        var sb = new StringBuilder(d.Length);
        foreach (var c in d)
            if (CharUnicodeInfo.GetUnicodeCategory(c) != UnicodeCategory.NonSpacingMark) sb.Append(c);
        return sb.ToString().Normalize(NormalizationForm.FormC).Trim().ToLowerInvariant();
    }

    /// <summary>UF da cidade "Campinas - SP" → "SP". Vazio quando não há UF.</summary>
    public static string UfDe(string cidadeCliente)
    {
        var i = cidadeCliente.LastIndexOf('-');
        return i < 0 ? string.Empty : cidadeCliente[(i + 1)..].Trim().ToUpperInvariant();
    }

    /// <summary>Devolve a região que bloqueia, ou null quando o vendedor pode atender.</summary>
    public static RegiaoBloqueada? Bloqueio(IEnumerable<RegiaoBloqueada> regioes, string cidadeCliente)
    {
        if (string.IsNullOrWhiteSpace(cidadeCliente)) return null;
        var cidade = Normalizar(cidadeCliente);
        var uf = UfDe(cidadeCliente);
        foreach (var r in regioes)
        {
            var valor = Normalizar(r.Valor);
            if (valor.Length == 0) continue;
            switch (r.Tipo)
            {
                case "pais":
                    // Cliente com cidade brasileira ("... - UF") está no Brasil.
                    if (valor == "brasil" && uf.Length == 2) return r;
                    break;
                case "estado":
                    if (uf.Length == 2 && valor.ToUpperInvariant() == uf) return r;
                    break;
                case "cidade":
                    if (valor == cidade) return r;
                    break;
            }
        }
        return null;
    }

    public static bool Bloqueia(IEnumerable<RegiaoBloqueada> regioes, string cidadeCliente) =>
        Bloqueio(regioes, cidadeCliente) is not null;
}

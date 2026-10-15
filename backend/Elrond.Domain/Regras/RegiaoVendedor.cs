using System.Globalization;
using System.Text;
using Elrond.Domain.Entities;

namespace Elrond.Domain.Regras;

/// <summary>
/// Região de atendimento do vendedor como LISTA DE EXCLUSÃO: o vendedor não pode vender
/// para cliente das regiões cadastradas (país inteiro, um estado ou uma cidade).
/// A cidade vem como "Cidade - UF" (endereço) ou "UF - Cidade" (Dados da Operação): as duas valem.
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

    /// <summary>UF da cidade ("Campinas - SP" ou "SP - Campinas" → "SP"). Vazio quando não há UF válida.</summary>
    public static string UfDe(string cidadeCliente) => BuscaCidade.Separar(cidadeCliente).Uf;

    /// <summary>Forma única para comparar cidades escritas em qualquer dos dois formatos.</summary>
    private static string Canonica(string texto)
    {
        var (nome, uf) = BuscaCidade.Separar(texto);
        return Normalizar(uf.Length > 0 ? $"{nome} - {uf}" : nome);
    }

    /// <summary>Devolve a região que bloqueia, ou null quando o vendedor pode atender.</summary>
    public static RegiaoBloqueada? Bloqueio(IEnumerable<RegiaoBloqueada> regioes, string cidadeCliente)
    {
        if (string.IsNullOrWhiteSpace(cidadeCliente)) return null;
        var cidade = Canonica(cidadeCliente);
        var uf = UfDe(cidadeCliente);
        foreach (var r in regioes)
        {
            var valor = Normalizar(r.Valor);
            if (valor.Length == 0) continue;
            switch (r.Tipo)
            {
                case "pais":
                    // Cliente com cidade brasileira (com UF válida) está no Brasil.
                    if (valor == "brasil" && uf.Length == 2) return r;
                    break;
                case "estado":
                    if (uf.Length == 2 && valor.ToUpperInvariant() == uf) return r;
                    break;
                case "cidade":
                    if (Canonica(r.Valor) == cidade) return r;
                    break;
            }
        }
        return null;
    }

    public static bool Bloqueia(IEnumerable<RegiaoBloqueada> regioes, string cidadeCliente) =>
        Bloqueio(regioes, cidadeCliente) is not null;
}

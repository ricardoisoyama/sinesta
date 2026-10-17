using System.Globalization;
using Elrond.Domain.Entities;

namespace Elrond.Domain.Regras;

/// <summary>
/// Apólices da seguradora (cadastro de fornecedor): arruma o que veio da tela ou da planilha e
/// recusa o que não faz sentido (vigência invertida, percentual fora de 0–100%, UF inexistente).
/// </summary>
public static class ApolicesSeguro
{
    public static readonly string[] Tipos = { "RCTR-C", "RCF-DC", "RC-V", "Ambiental", "Outro" };
    public static readonly string[] Documentos = { "cte", "nfse", "minuta" };
    public static readonly string[] Ufs =
    {
        "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA",
        "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
    };
    private const int MaxApolices = 30;

    /// <summary>Normaliza as apólices do fornecedor. Devolve a mensagem de erro, ou null quando está tudo certo.</summary>
    public static string? Normalizar(Fornecedor f)
    {
        f.Apolices ??= new();
        if (f.Apolices.Count > MaxApolices) return $"No máximo {MaxApolices} apólices por seguradora.";
        foreach (var a in f.Apolices)
        {
            var nome = $"Apólice {(string.IsNullOrWhiteSpace(a.Numero) ? a.Tipo : a.Numero.Trim())}";
            a.Id = string.IsNullOrWhiteSpace(a.Id) ? Guid.NewGuid().ToString() : a.Id.Trim();
            a.Tipo = Tipos.FirstOrDefault(t => t.Equals(a.Tipo?.Trim(), StringComparison.OrdinalIgnoreCase)) ?? "Outro";
            a.Numero = (a.Numero ?? string.Empty).Trim();
            a.Observacao = (a.Observacao ?? string.Empty).Trim();
            a.Status = a.Status == "inativo" ? "inativo" : "ativo";
            a.EmpresaIds = (a.EmpresaIds ?? new()).Where(e => !string.IsNullOrWhiteSpace(e)).Distinct().ToList();
            a.Documentos = (a.Documentos ?? new()).Where(Documentos.Contains).Distinct().ToList();

            if (!DataValida(a.VigenciaInicio) || !DataValida(a.VigenciaFim)) return $"{nome}: vigência com data inválida.";
            if (a.VigenciaInicio.Length > 0 && a.VigenciaFim.Length > 0 && string.CompareOrdinal(a.VigenciaFim, a.VigenciaInicio) < 0)
                return $"{nome}: o fim da vigência vem antes do início.";
            if (a.LimitePorEmbarque < 0 || a.CustoEmissao < 0) return $"{nome}: valores não podem ser negativos.";
            if (!Fracao(a.Iof) || !Fracao(a.TaxaUrbana) || !Fracao(a.TaxaPadrao)) return $"{nome}: percentual fora de 0% a 100%.";

            // Uma linha por par de UFs: a última informada vale (é o que a planilha faria ao corrigir).
            var taxas = new Dictionary<(string, string), TaxaApolice>();
            foreach (var t in a.Taxas ?? new())
            {
                var o = (t.UfOrigem ?? string.Empty).Trim().ToUpperInvariant();
                var d = (t.UfDestino ?? string.Empty).Trim().ToUpperInvariant();
                if (!Ufs.Contains(o) || !Ufs.Contains(d)) return $"{nome}: UF inválida na tabela de prêmio ({t.UfOrigem} → {t.UfDestino}).";
                if (!Fracao(t.Percentual)) return $"{nome}: prêmio fora de 0% a 100% em {o} → {d}.";
                taxas[(o, d)] = new TaxaApolice { UfOrigem = o, UfDestino = d, Percentual = t.Percentual };
            }
            a.Taxas = taxas.Values.OrderBy(t => t.UfOrigem).ThenBy(t => t.UfDestino).ToList();
        }
        return null;
    }

    private static bool Fracao(decimal v) => v is >= 0 and <= 1;

    private static bool DataValida(string? s)
    {
        if (string.IsNullOrEmpty(s)) return true;
        return DateOnly.TryParseExact(s, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out _);
    }
}

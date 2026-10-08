using Elrond.Domain.Entities;

namespace Elrond.Domain.Regras;

/// <summary>
/// Total de uma ficha técnica (espelho de frontend/src/features/fichaTecnica/calculo.ts):
/// valores digitados entram direto; percentuais e fórmulas se resolvem em passadas (fórmula pode
/// depender de outra fórmula, em qualquer ordem); referência circular ou desconhecida vale zero.
/// </summary>
public static class FichaCalculo
{
    public static readonly string[] TiposNumericos = { "numero", "valor", "percentual", "calculo" };

    /// <param name="colunas">Colunas ATIVAS da empresa.</param>
    /// <param name="valores">Valores da ficha, por Id da coluna.</param>
    /// <param name="formulaTotal">Fórmula do total da ficha; vazia = soma das colunas marcadas.</param>
    public static decimal Total(IReadOnlyList<FichaColuna> colunas, IReadOnlyDictionary<string, FichaValor> valores, string? formulaTotal = null)
    {
        var resolvido = new Dictionary<string, decimal>();
        decimal Num(FichaColuna c) => valores.TryGetValue(c.Id, out var v) ? v.Numero ?? 0m : 0m;

        foreach (var c in colunas)
        {
            if (c.Tipo is "valor" or "numero") resolvido[c.Chave] = Num(c);
            else if (c.Tipo is "texto" or "lista") resolvido[c.Chave] = 0m;
        }

        var restantes = colunas.Where(c => c.Tipo is "percentual" or "calculo").ToList();
        var chaves = colunas.Select(c => c.Chave).ToHashSet();
        for (var passada = 0; restantes.Count > 0 && passada <= colunas.Count; passada++)
        {
            var ainda = new List<FichaColuna>();
            foreach (var c in restantes)
            {
                var deps = c.Tipo == "percentual"
                    ? (string.IsNullOrEmpty(c.Base) ? Array.Empty<string>() : new[] { c.Base })
                    : Formula.Referencias(c.Formula);
                if (deps.Any(d => !resolvido.ContainsKey(d)))
                {
                    if (deps.Any(d => !chaves.Contains(d))) resolvido[c.Chave] = 0m; // coluna desconhecida
                    else ainda.Add(c);
                    continue;
                }
                resolvido[c.Chave] = c.Tipo == "percentual"
                    ? (string.IsNullOrEmpty(c.Base) ? 0m : Num(c) * resolvido[c.Base])
                    : Formula.Avaliar(c.Formula, resolvido).Valor ?? 0m;
            }
            restantes = ainda;
        }
        foreach (var c in restantes) resolvido[c.Chave] = 0m; // circular

        if (!string.IsNullOrWhiteSpace(formulaTotal))
            return Math.Round(Formula.Avaliar(formulaTotal, resolvido).Valor ?? 0m, 2, MidpointRounding.AwayFromZero);

        var total = colunas
            .Where(c => c.CompoeTotal && TiposNumericos.Contains(c.Tipo))
            .Sum(c => resolvido.TryGetValue(c.Chave, out var v) ? v : 0m);
        return Math.Round(total, 2, MidpointRounding.AwayFromZero);
    }
}

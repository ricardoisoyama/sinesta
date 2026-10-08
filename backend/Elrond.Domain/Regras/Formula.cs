using System.Globalization;
using System.Text;

namespace Elrond.Domain.Regras;

/// <summary>
/// Avaliador de fórmulas simples, como uma célula de planilha (espelho de frontend/src/lib/formula.ts):
/// + - * / parênteses, números com vírgula ou ponto, "20%" (= 0,2) e chaves de outras colunas.
/// Sem eval/compilação: o texto é tokenizado e avaliado aqui.
/// </summary>
public static class Formula
{
    public readonly record struct Resultado(decimal? Valor, string? Erro);

    private enum T { Num, Id, Op, Abre, Fecha }
    private readonly record struct Token(T Tipo, decimal Num = 0, string Texto = "", char Op = ' ');

    /// <summary>"Salário base" → "salario_base".</summary>
    public static string ChaveDe(string nome)
    {
        var semAcento = new StringBuilder();
        foreach (var c in (nome ?? string.Empty).Normalize(NormalizationForm.FormD))
            if (CharUnicodeInfo.GetUnicodeCategory(c) != UnicodeCategory.NonSpacingMark) semAcento.Append(c);
        var sb = new StringBuilder();
        foreach (var c in semAcento.ToString().ToLowerInvariant())
            sb.Append(c is >= 'a' and <= 'z' or >= '0' and <= '9' ? c : '_');
        var k = System.Text.RegularExpressions.Regex.Replace(sb.ToString(), "_+", "_").Trim('_');
        return k.Length > 0 && char.IsDigit(k[0]) ? "_" + k : k;
    }

    private static bool Letra(char c) => char.IsLetter(c) || c == '_';

    private static List<Token>? Tokenizar(string expr, out string? erro)
    {
        erro = null;
        var tokens = new List<Token>();
        var i = 0;
        while (i < expr.Length)
        {
            var c = expr[i];
            if (c is ' ' or '\t') { i++; continue; }
            if (c == '(') { tokens.Add(new Token(T.Abre)); i++; continue; }
            if (c == ')') { tokens.Add(new Token(T.Fecha)); i++; continue; }
            if (c is '+' or '-' or '*' or '/') { tokens.Add(new Token(T.Op, Op: c)); i++; continue; }
            // Os botões da tela escrevem × e ÷ (mais fácil de ler); valem como * e /.
            if (c == '×') { tokens.Add(new Token(T.Op, Op: '*')); i++; continue; }
            if (c == '÷') { tokens.Add(new Token(T.Op, Op: '/')); i++; continue; }
            if (char.IsDigit(c) || c is '.' or ',')
            {
                var j = i;
                while (j < expr.Length && (char.IsDigit(expr[j]) || expr[j] is '.' or ',')) j++;
                var bruto = expr[i..j];
                // "1.500,50" e "1500.50": vírgula é o separador decimal quando existe.
                var norm = bruto.Contains(',') ? bruto.Replace(".", "").Replace(',', '.') : bruto;
                if (!decimal.TryParse(norm, NumberStyles.Number, CultureInfo.InvariantCulture, out var n))
                {
                    erro = $"Número inválido: {bruto}";
                    return null;
                }
                if (j < expr.Length && expr[j] == '%') { n /= 100m; j++; }
                tokens.Add(new Token(T.Num, Num: n));
                i = j;
                continue;
            }
            if (Letra(c))
            {
                var j = i;
                while (j < expr.Length && (Letra(expr[j]) || char.IsDigit(expr[j]))) j++;
                tokens.Add(new Token(T.Id, Texto: ChaveDe(expr[i..j])));
                i = j;
                continue;
            }
            erro = $"Caractere inválido: \"{c}\"";
            return null;
        }
        return tokens;
    }

    /// <summary>Chaves referenciadas na fórmula.</summary>
    public static IReadOnlyList<string> Referencias(string expr)
    {
        var t = Tokenizar(expr ?? string.Empty, out _);
        return t is null ? Array.Empty<string>() : t.Where(x => x.Tipo == T.Id).Select(x => x.Texto).Distinct().ToList();
    }

    private sealed class ErroFormula(string m) : Exception(m);

    public static Resultado Avaliar(string expr, IReadOnlyDictionary<string, decimal> vars)
    {
        var texto = (expr ?? string.Empty).Trim();
        if (texto.Length == 0) return new Resultado(0m, null);
        var tokens = Tokenizar(texto, out var erroTok);
        if (tokens is null) return new Resultado(null, erroTok);

        var pos = 0;
        Token? Olhar() => pos < tokens.Count ? tokens[pos] : null;

        decimal Fator()
        {
            var tk = Olhar() ?? throw new ErroFormula("Fórmula incompleta");
            switch (tk.Tipo)
            {
                case T.Num: pos++; return tk.Num;
                case T.Id:
                    pos++;
                    return vars.TryGetValue(tk.Texto, out var v) ? v : throw new ErroFormula($"Campo desconhecido: {tk.Texto}");
                case T.Abre:
                    pos++;
                    var dentro = Expr();
                    if (Olhar()?.Tipo != T.Fecha) throw new ErroFormula("Falta fechar parêntese");
                    pos++;
                    return dentro;
                case T.Op when tk.Op == '-':
                    pos++;
                    return -Fator();
                default:
                    throw new ErroFormula("Fórmula inválida");
            }
        }
        decimal Termo()
        {
            var v = Fator();
            while (Olhar() is { Tipo: T.Op, Op: '*' or '/' } op)
            {
                pos++;
                var d = Fator();
                if (op.Op == '/')
                {
                    if (d == 0) throw new ErroFormula("Divisão por zero");
                    v /= d;
                }
                else v *= d;
            }
            return v;
        }
        decimal Expr()
        {
            var v = Termo();
            while (Olhar() is { Tipo: T.Op, Op: '+' or '-' } op)
            {
                pos++;
                var d = Termo();
                v = op.Op == '+' ? v + d : v - d;
            }
            return v;
        }

        try
        {
            var v = Expr();
            return pos < tokens.Count ? new Resultado(null, "Fórmula inválida") : new Resultado(v, null);
        }
        catch (ErroFormula e) { return new Resultado(null, e.Message); }
        catch (OverflowException) { return new Resultado(null, "Resultado inválido"); }
    }
}

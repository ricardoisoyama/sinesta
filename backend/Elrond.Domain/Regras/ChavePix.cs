using System.Text.RegularExpressions;

namespace Elrond.Domain.Regras;

/// <summary>
/// Chave Pix no formato que o banco espera: CPF e CNPJ só com dígitos, celular com +55, e-mail em
/// minúsculas e chave aleatória (EVP) em minúsculas. O cadastro aceita a chave como a pessoa escreve
/// ("(11) 98765-4321", "123.456.789-09"); aqui ela vira o formato do Pix ou volta com o erro.
/// </summary>
public static partial class ChavePix
{
    public const string Cpf = "cpf";
    public const string Cnpj = "cnpj";
    public const string Celular = "celular";
    public const string Email = "email";
    public const string Aleatoria = "aleatoria";

    public sealed record Resultado(string Chave, string Tipo, string Erro)
    {
        public bool Ok => Erro.Length == 0;
    }

    private static Resultado Falha(string erro) => new(string.Empty, string.Empty, erro);

    public static Resultado Normalizar(string? bruta)
    {
        var s = (bruta ?? string.Empty).Trim();
        if (s.Length == 0) return Falha("Informe a chave Pix do favorecido.");
        if (s.Length > 77) return Falha("Chave Pix longa demais.");

        if (s.Contains('@'))
            return EmailValido().IsMatch(s) ? new(s.ToLowerInvariant(), Email, string.Empty) : Falha("E-mail da chave Pix inválido.");
        if (Evp().IsMatch(s)) return new(s.ToLowerInvariant(), Aleatoria, string.Empty);

        // Daqui para baixo só dígitos e a pontuação de CPF, CNPJ e telefone.
        if (!SoNumero().IsMatch(s)) return Falha("Chave Pix inválida: use CPF, CNPJ, celular, e-mail ou a chave aleatória.");
        var d = new string(s.Where(char.IsDigit).ToArray());

        // "+55..." ou 55 + DDD + número: celular.
        if (s.StartsWith('+') || (d.Length == 13 && d.StartsWith("55", StringComparison.Ordinal)))
            return d.Length == 13 && d.StartsWith("55", StringComparison.Ordinal) && CelularValido(d[2..])
                ? new($"+{d}", Celular, string.Empty)
                : Falha("Celular da chave Pix inválido: use +55, DDD e o número (ex.: +55 11 98765-4321).");

        if (d.Length == 14)
            return CnpjValido(d) ? new(d, Cnpj, string.Empty) : Falha("CNPJ da chave Pix inválido.");

        if (d.Length == 11)
        {
            var cpf = CpfValido(d);
            var celular = CelularValido(d);
            // A pontuação diz a intenção quando os dois servem: "123.456.789-09" é CPF; "(11) 9..." é celular.
            var pareceCpf = s.Contains('.');
            var pareceCelular = s.Contains('(') || s.Contains(' ');
            if (cpf && (!celular || pareceCpf) && !pareceCelular) return new(d, Cpf, string.Empty);
            if (celular && (!cpf || pareceCelular) && !pareceCpf) return new($"+55{d}", Celular, string.Empty);
            if (cpf && celular)
                return Falha("Esta chave pode ser CPF ou celular. Para celular, escreva com +55 (ex.: +55 11 98765-4321); para CPF, com pontos (ex.: 123.456.789-09).");
            return Falha("CPF ou celular da chave Pix inválido.");
        }
        return Falha("Chave Pix inválida: use CPF, CNPJ, celular, e-mail ou a chave aleatória.");
    }

    /// <summary>
    /// Chave para exibir (comprovante, tela): CPF como o banco mostra (***.456.789-**), celular com o meio
    /// escondido, e-mail com o começo; CNPJ e chave aleatória aparecem inteiros (não são dado pessoal).
    /// </summary>
    public static string Mascarar(string? chave)
    {
        var r = Normalizar(chave);
        if (!r.Ok) return string.Empty;
        var c = r.Chave;
        return r.Tipo switch
        {
            Cpf => $"***.{c[3..6]}.{c[6..9]}-**",
            Celular => $"+55 ({c[3..5]}) {c[5]}****-{c[^4..]}",
            Email => $"{c[..Math.Min(2, c.IndexOf('@'))]}***{c[c.IndexOf('@')..]}",
            Cnpj => $"{c[..2]}.{c[2..5]}.{c[5..8]}/{c[8..12]}-{c[12..]}",
            _ => c,
        };
    }

    /// <summary>DDD válido (11 a 99, sem zero) e número de celular (9 dígitos, começa com 9).</summary>
    private static bool CelularValido(string d) =>
        d.Length == 11 && d[0] != '0' && d[1] != '0' && d[2] == '9';

    public static bool CpfValido(string d)
    {
        if (d.Length != 11 || d.All(c => c == d[0])) return false;
        int Dv(int n)
        {
            var soma = 0;
            for (var i = 0; i < n; i++) soma += (d[i] - '0') * (n + 1 - i);
            var r = soma * 10 % 11;
            return r == 10 ? 0 : r;
        }
        return Dv(9) == d[9] - '0' && Dv(10) == d[10] - '0';
    }

    public static bool CnpjValido(string d)
    {
        if (d.Length != 14 || d.All(c => c == d[0])) return false;
        int Dv(int n)
        {
            int[] pesos = n == 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
            var soma = 0;
            for (var i = 0; i < n; i++) soma += (d[i] - '0') * pesos[i];
            var r = soma % 11;
            return r < 2 ? 0 : 11 - r;
        }
        return Dv(12) == d[12] - '0' && Dv(13) == d[13] - '0';
    }

    [GeneratedRegex(@"^[^@\s]+@[^@\s]+\.[^@\s]+$")]
    private static partial Regex EmailValido();

    [GeneratedRegex(@"^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$")]
    private static partial Regex Evp();

    [GeneratedRegex(@"^\+?[0-9 .()/-]+$")]
    private static partial Regex SoNumero();
}

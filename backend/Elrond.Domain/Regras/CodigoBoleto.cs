namespace Elrond.Domain.Regras;

/// <summary>
/// Lê a linha digitável (47 dígitos, boleto bancário; 48, convênio/arrecadação) ou o código de barras
/// (44): confere os dígitos verificadores e tira o valor e o vencimento que vêm impressos no código.
/// Boleto bancário: fator de vencimento contado de 07/10/1997 e, desde 22/02/2025, recomeçando em
/// 1000 (Febraban); vale a data mais perto de hoje. Arrecadação não traz vencimento.
/// </summary>
public sealed record CodigoBoleto(string Digitos, string CodigoBarras, bool Arrecadacao, decimal Valor, DateOnly? Vencimento)
{
    private static readonly DateOnly BaseAntiga = new(1997, 10, 7);
    private static readonly DateOnly BaseNova = new(2025, 2, 22);

    /// <summary>Só os dígitos, para guardar e mandar ao banco.</summary>
    public static string SoDigitos(string? texto) => new((texto ?? string.Empty).Where(char.IsDigit).ToArray());

    /// <summary>Lê o código; erro em português quando não serve (tamanho, dígito verificador).</summary>
    public static (CodigoBoleto? Codigo, string Erro) Ler(string? texto, DateOnly hoje)
    {
        var d = SoDigitos(texto);
        if (d.Length == 0) return (null, "Informe a linha digitável ou o código de barras do boleto.");
        if (d.Length is not (44 or 47 or 48)) return (null, $"A linha digitável tem 47 dígitos (48 em conta de consumo/tributo) e o código de barras, 44. Este tem {d.Length}.");
        var arrecadacao = d[0] == '8';
        string barras;
        if (d.Length == 44) barras = d;
        else if (arrecadacao)
        {
            if (d.Length != 48) return (null, "Conta de consumo/tributo: a linha digitável tem 48 dígitos.");
            var mod10 = d[2] is '6' or '7';
            for (var b = 0; b < 4; b++)
            {
                var bloco = d.Substring(b * 12, 11);
                var dv = d[b * 12 + 11] - '0';
                if ((mod10 ? Modulo10(bloco) : ModuloArrecadacao11(bloco)) != dv) return (null, $"O {b + 1}º bloco da linha digitável não confere (dígito verificador). Confira a digitação.");
            }
            barras = string.Concat(Enumerable.Range(0, 4).Select(b => d.Substring(b * 12, 11)));
        }
        else
        {
            if (d.Length != 47) return (null, "Boleto bancário: a linha digitável tem 47 dígitos.");
            if (Modulo10(d[..9]) != d[9] - '0' || Modulo10(d[10..20]) != d[20] - '0' || Modulo10(d[21..31]) != d[31] - '0')
                return (null, "A linha digitável não confere (dígito de um dos campos). Confira a digitação.");
            barras = d[..4] + d[32] + d[33..47] + d[4..9] + d[10..20] + d[21..31];
        }

        if (barras[0] == '8')
        {
            var mod10 = barras[2] is '6' or '7';
            var semDv = barras[..3] + barras[4..];
            if ((mod10 ? Modulo10(semDv) : ModuloArrecadacao11(semDv)) != barras[3] - '0') return (null, "O código de barras não confere (dígito verificador geral).");
            // Valor efetivo em reais só quando o 3º dígito é 6 ou 8 (7 e 9 = quantidade de moeda).
            var valor = barras[2] is '6' or '8' ? long.Parse(barras[4..15]) / 100m : 0m;
            return (new CodigoBoleto(d, barras, true, valor, null), string.Empty);
        }

        if (ModuloBancario11(barras[..4] + barras[5..]) != barras[4] - '0') return (null, "O código de barras não confere (dígito verificador geral).");
        var fator = int.Parse(barras[5..9]);
        var valorBanco = long.Parse(barras[9..19]) / 100m;
        return (new CodigoBoleto(d, barras, false, valorBanco, DataDoFator(fator, hoje)), string.Empty);
    }

    /// <summary>Fator 0000 = sem vencimento; senão, a data (base antiga ou nova) mais perto de hoje.</summary>
    public static DateOnly? DataDoFator(int fator, DateOnly hoje)
    {
        if (fator == 0) return null;
        var antiga = BaseAntiga.AddDays(fator);
        if (fator < 1000) return antiga;
        var nova = BaseNova.AddDays(fator - 1000);
        return Math.Abs(nova.DayNumber - hoje.DayNumber) < Math.Abs(antiga.DayNumber - hoje.DayNumber) ? nova : antiga;
    }

    private static int Modulo10(string s)
    {
        var soma = 0;
        var peso = 2;
        for (var i = s.Length - 1; i >= 0; i--)
        {
            var n = (s[i] - '0') * peso;
            soma += n > 9 ? n / 10 + n % 10 : n;
            peso = peso == 2 ? 1 : 2;
        }
        var resto = soma % 10;
        return resto == 0 ? 0 : 10 - resto;
    }

    private static int Soma11(string s)
    {
        var soma = 0;
        var peso = 2;
        for (var i = s.Length - 1; i >= 0; i--)
        {
            soma += (s[i] - '0') * peso;
            peso = peso == 9 ? 2 : peso + 1;
        }
        return soma;
    }

    /// <summary>DV geral do boleto bancário: resto 0, 1 ou 10 vira 1.</summary>
    private static int ModuloBancario11(string s)
    {
        var dv = 11 - Soma11(s) % 11;
        return dv is 0 or 10 or 11 ? 1 : dv;
    }

    /// <summary>DV da arrecadação (módulo 11): resto 0 ou 1 vira 0.</summary>
    private static int ModuloArrecadacao11(string s)
    {
        var resto = Soma11(s) % 11;
        return resto is 0 or 1 ? 0 : 11 - resto;
    }
}

namespace Elrond.Domain.Regras;

/// <summary>CPF, CNPJ, CEP e código IBGE: conferência de formato e dígitos (sem consultar ninguém).</summary>
public static class DocumentoFiscal
{
    /// <summary>Código IBGE das UFs (os 2 primeiros dígitos do código do município).</summary>
    private static readonly Dictionary<string, string> CodigoUf = new(StringComparer.OrdinalIgnoreCase)
    {
        ["RO"] = "11", ["AC"] = "12", ["AM"] = "13", ["RR"] = "14", ["PA"] = "15", ["AP"] = "16", ["TO"] = "17",
        ["MA"] = "21", ["PI"] = "22", ["CE"] = "23", ["RN"] = "24", ["PB"] = "25", ["PE"] = "26", ["AL"] = "27",
        ["SE"] = "28", ["BA"] = "29", ["MG"] = "31", ["ES"] = "32", ["RJ"] = "33", ["SP"] = "35", ["PR"] = "41",
        ["SC"] = "42", ["RS"] = "43", ["MS"] = "50", ["MT"] = "51", ["GO"] = "52", ["DF"] = "53",
    };

    public static string Digitos(string? texto) => new((texto ?? string.Empty).Where(char.IsDigit).ToArray());

    public static bool CpfValido(string? cpf)
    {
        var d = Digitos(cpf);
        if (d.Length != 11 || d.Distinct().Count() == 1) return false;
        return Dv(d[..9], 10) == d[9] - '0' && Dv(d[..10], 11) == d[10] - '0';
    }

    public static bool CnpjValido(string? cnpj)
    {
        var d = Digitos(cnpj);
        if (d.Length != 14 || d.Distinct().Count() == 1) return false;
        int[] p1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
        int[] p2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
        return DvPesos(d[..12], p1) == d[12] - '0' && DvPesos(d[..13], p2) == d[13] - '0';
    }

    public static bool CepValido(string? cep) => Digitos(cep).Length == 8;

    /// <summary>"11010000" → "11010-000".</summary>
    public static string FormatarCep(string? cep)
    {
        var d = Digitos(cep);
        return d.Length == 8 ? $"{d[..5]}-{d[5..]}" : d;
    }

    /// <summary>Código IBGE do município com 7 dígitos e coerente com a UF (ex.: 3548500 é de SP).</summary>
    public static bool IbgeDaUf(string? codigoIbge, string? uf)
    {
        var d = Digitos(codigoIbge);
        return d.Length == 7 && uf is not null && CodigoUf.TryGetValue(uf.Trim(), out var c) && d.StartsWith(c, StringComparison.Ordinal);
    }

    private static int Dv(string base_, int pesoInicial)
    {
        var soma = 0;
        for (var i = 0; i < base_.Length; i++) soma += (base_[i] - '0') * (pesoInicial - i);
        var r = soma % 11;
        return r < 2 ? 0 : 11 - r;
    }

    private static int DvPesos(string base_, int[] pesos)
    {
        var soma = 0;
        for (var i = 0; i < base_.Length; i++) soma += (base_[i] - '0') * pesos[i];
        var r = soma % 11;
        return r < 2 ? 0 : 11 - r;
    }
}

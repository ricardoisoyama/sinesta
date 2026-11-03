using Elrond.Domain.Common;

namespace Elrond.Domain.Entities;

/// <summary>
/// Feriado do cadastro (estadual, municipal, ponto facultativo da empresa). Os nacionais e bancários o
/// sistema já sabe (<see cref="Regras.DiasUteis"/>). "Todo ano" vale no mesmo dia e mês de cada ano.
/// </summary>
public class Feriado : Rastreavel, IEntity, IInativavel
{
    public string Id { get; set; } = string.Empty;
    /// <summary>yyyy-MM-dd (o ano não importa quando é todo ano).</summary>
    public string Data { get; set; } = string.Empty;
    public string Nome { get; set; } = string.Empty;
    public bool TodoAno { get; set; } = true;
    public const string Todas = "todas";
    public const string Estadual = "uf";
    public const string Municipal = "cidade";
    /// <summary>
    /// Onde vale: todas (as empresas), uf (estadual: empresas daquele estado) ou cidade (municipal: empresas
    /// daquela cidade). Os CNPJs podem ser de cidades diferentes (Matriz em São Paulo, Filial em São Vicente).
    /// </summary>
    public string Abrangencia { get; set; } = Todas;
    /// <summary>UF do feriado estadual ("SP").</summary>
    public string Uf { get; set; } = string.Empty;
    /// <summary>Cidade do feriado municipal, no formato do cadastro ("Santos - SP").</summary>
    public string Cidade { get; set; } = string.Empty;
    public string Status { get; set; } = "ativo";

    /// <summary>Vale para a empresa desta cidade ("São Vicente - SP")? Sem cidade na empresa, só os de todas.</summary>
    public bool ValePara(string cidadeEmpresa)
    {
        var cidade = Normalizar(cidadeEmpresa);
        var uf = cidade.Length >= 2 && cidade.Contains(" - ") ? cidade[(cidade.LastIndexOf(" - ", StringComparison.Ordinal) + 3)..] : string.Empty;
        return Abrangencia switch
        {
            Estadual => uf.Length > 0 && string.Equals(uf, (Uf ?? string.Empty).Trim(), StringComparison.OrdinalIgnoreCase),
            Municipal => cidade.Length > 0 && cidade == Normalizar(Cidade),
            _ => true,
        };
    }

    private static string Normalizar(string? s) => new string((s ?? string.Empty).Trim().Normalize(System.Text.NormalizationForm.FormD)
        .Where(c => System.Globalization.CharUnicodeInfo.GetUnicodeCategory(c) != System.Globalization.UnicodeCategory.NonSpacingMark).ToArray()).ToUpperInvariant();
}

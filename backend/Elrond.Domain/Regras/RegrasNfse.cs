namespace Elrond.Domain.Regras;

/// <summary>
/// Regras da NFS-e que valem para qualquer provedor (reforma tributária, LC 116). O indicador da
/// operação (cIndOp) decide onde o IBS/CBS é devido e, por isso, qual endereço precisa ir na nota.
/// </summary>
public static class RegrasNfse
{
    public const int TamanhoMaximoDescricao = 2000;
    public const int TamanhoMaximoInformacoes = 500;
    /// <summary>Teto do ISS (LC 116: alíquota máxima de 5%).</summary>
    public const decimal AliquotaIssMaxima = 0.05m;

    /// <summary>Operações com bem imóvel (ex.: 020201 limpeza/conservação): exigem o endereço do imóvel.</summary>
    public static bool ExigeEnderecoImovel(string? indicadorOperacao) =>
        indicadorOperacao is { Length: 6 } i && (i.StartsWith("0201", StringComparison.Ordinal) || i.StartsWith("0202", StringComparison.Ordinal));

    /// <summary>Operações em que o IBS/CBS vai para o local da prestação: exigem esse endereço.</summary>
    public static bool ExigeLocalPrestacao(string? indicadorOperacao) =>
        indicadorOperacao is "010102" or "050102" or "060101";

    /// <summary>Lucro Presumido e Real precisam do grupo IBS/CBS (indicador e classificação) desde 2026.</summary>
    public static bool ExigeIbsCbs(string? regimeEmpresa) =>
        regimeEmpresa is "Lucro Presumido" or "Lucro Real";

    /// <summary>Item da LC 116 no formato "17.05".</summary>
    public static bool ItemLc116Valido(string? item) =>
        item is { Length: 5 } i && char.IsDigit(i[0]) && char.IsDigit(i[1]) && i[2] == '.' && char.IsDigit(i[3]) && char.IsDigit(i[4]);
}

using Elrond.Domain.Common;

namespace Elrond.Domain.Entities;

/// <summary>Documentos que têm numeração própria por empresa (CNPJ).</summary>
public static class TipoNumeracao
{
    public const string Fatura = "fatura";
    public const string NfE = "nfe";
    public const string NfsE = "nfse";
    public const string Rps = "rps";
    public const string CtE = "cte";
    public const string MdfE = "mdfe";

    public static readonly IReadOnlyList<(string Tipo, string Nome)> Todos =
    [
        (Fatura, "Fatura"), (NfE, "NF-e"), (NfsE, "NFS-e"), (Rps, "RPS (NFS-e)"), (CtE, "CT-e"), (MdfE, "MDF-e"),
    ];

    public static bool Valido(string tipo) => Todos.Any(t => t.Tipo == tipo);
}

/// <summary>
/// Último número usado de um documento numa empresa (a implantação informa de onde parte: a fatura
/// continua a da SIIMP, a NF continua a que está na SEFAZ). O número só avança: o sistema pega o
/// seguinte numa operação atômica, e a tela não deixa voltar para trás de um número já usado.
/// </summary>
public class NumeracaoDocumento : IEntity
{
    /// <summary>"{EmpresaId}:{Tipo}".</summary>
    public string Id { get; set; } = string.Empty;
    public string EmpresaId { get; set; } = string.Empty;
    public string Tipo { get; set; } = TipoNumeracao.Fatura;
    public string Serie { get; set; } = string.Empty;
    /// <summary>Último número usado (0 = nenhum ainda; o próximo é Ultimo + 1).</summary>
    public long Ultimo { get; set; }
    public string AlteradoEm { get; set; } = string.Empty;
    public string AlteradoPor { get; set; } = string.Empty;

    public static string IdDe(string empresaId, string tipo) => $"{empresaId}:{tipo}";
}

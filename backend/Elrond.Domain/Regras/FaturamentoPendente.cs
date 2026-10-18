using Elrond.Domain.Entities;

namespace Elrond.Domain.Regras;

/// <summary>Regras dos documentos a faturar vindos da SIIMP (CT-e e minuta).</summary>
public static class FaturamentoPendente
{
    /// <summary>Códigos da SIIMP: CT-e 4 cancelado, 6 inutilizado, 0 só cadastrado; minuta 6 cancelada, 7 inutilizada.</summary>
    public static bool Cancelado(string tipo, int situacaoSiimp) =>
        tipo == "cte" ? situacaoSiimp is 4 or 6 : situacaoSiimp is 6 or 7;

    /// <summary>CNPJ do emitente pela chave do CT-e (posições 7 a 20 dos 44 dígitos). Vazio se a chave não serve.</summary>
    public static string CnpjDaChave(string chave)
    {
        var d = new string((chave ?? string.Empty).Where(char.IsDigit).ToArray());
        return d.Length == 44 ? d.Substring(6, 14) : string.Empty;
    }

    public static string Digitos(string? s) => new((s ?? string.Empty).Where(char.IsDigit).ToArray());

    /// <summary>
    /// Situação do documento depois da leitura. O que o ELROND já faturou fica faturado (nunca volta a
    /// pendente); se a SIIMP também o faturou, o motivo avisa da cobrança em dobro.
    /// </summary>
    public static (string Situacao, string Motivo) Situar(DocumentoFaturavel d, string faturaSiimp)
    {
        if (d.FaturaId.Length > 0)
            return (DocumentoFaturavel.FaturadoElrond, faturaSiimp.Length > 0 ? $"Também está na fatura {faturaSiimp} da SIIMP: confira se não foi cobrado duas vezes." : string.Empty);
        if (Cancelado(d.Tipo, d.SituacaoSiimp))
            return (DocumentoFaturavel.Cancelado, d.Tipo == "cte" ? "CT-e cancelado ou inutilizado na SIIMP." : "Minuta cancelada ou inutilizada na SIIMP.");
        if (faturaSiimp.Length > 0)
            return (DocumentoFaturavel.FaturadoSiimp, $"Na fatura {faturaSiimp} da SIIMP.");
        if (d.Tipo == "cte" && d.SituacaoSiimp == 0)
            return (DocumentoFaturavel.Incompleto, "CT-e ainda não autorizado na SIIMP.");
        if (d.Tipo == "minuta" && d.NfseNumero.Length == 0)
            return (DocumentoFaturavel.Incompleto, "Minuta sem NFS-e na SIIMP (o cliente recebe NFS-e + fatura + boleto).");
        return (DocumentoFaturavel.Pendente, string.Empty);
    }
}

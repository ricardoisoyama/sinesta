using System.Text;
using Elrond.Application.Services;

namespace Elrond.Tests;

public class FaturaPdfTests
{
    /// <summary>A fatura 49 da SIIMP (minutas com NFS-e), refeita pelo ELROND.</summary>
    public static FaturaPdfDados Fatura49(int repetirDocumentos = 1)
    {
        var docs = new List<FaturaPdfDocumento>
        {
            new("2026-10-15", "MINUTA", "1/51", "NFS-e 59", ["1/489834"], 24560m, 0, 217.37m, 0, 0, 3437.37m, "2026-10-09"),
            new("2026-10-15", "MINUTA", "1/53", "NFS-e 61", [], null, 0, 434.10m, 0, 0, 6874.10m, ""),
            new("2026-10-15", "MINUTA", "1/54", "NFS-e 62", ["1/489833"], 24560m, 0, 217.37m, 0, 0, 3437.37m, "2026-10-09"),
        };
        var todos = Enumerable.Range(0, repetirDocumentos).SelectMany(_ => docs).ToList();
        var total = todos.Sum(d => d.Total);
        return new FaturaPdfDados(
            new FaturaPdfEmitente("Mirai Solucoes Logisticas e Empresariais Ltda", "63.736.778/0002-64", "RODOVIA PADRE MANOEL NOBREGA KM 67, 83102",
                "São Vicente / SP - 11346-300", "(13) 99717-4540 - contato@mirai.log.br"),
            new FaturaPdfCliente("I.F.C. INDUSTRIA E COMERCIO DE CONDUTORES ELETRICOS LTDA", "02.544.042/0001-19", "387086243118",
                "AV PRIMO SCHINCARIOL, 670 (CX.POST. 414) - JD OLIVEIRA", "Itu/SP", "13312-250", "contabil@cobrecom.com.br", "(11) 2118-3200"),
            49, "Emitida", "2026-10-21", "2026-10-29", "Comercial",
            total, 0, 0, total, 98240m * repetirDocumentos, 0, 868864.94m * repetirDocumentos,
            [new FaturaPdfParcela(1, 1, total, 0, "2026-10-29", "", "Em aberto")],
            todos);
    }

    [Fact]
    public void Gera_pdf_valido_com_os_dados_da_fatura()
    {
        var pdf = FaturaPdf.Gerar(Fatura49());
        var texto = Encoding.Latin1.GetString(pdf);
        Assert.StartsWith("%PDF-1.4", texto);
        Assert.EndsWith("%%EOF\n", texto);
        Assert.Contains("(FATURA) Tj", texto);
        Assert.Contains("(49) Tj", texto);
        Assert.Contains("NFS-e 59", texto);
        Assert.Contains("R$ 13.748,84", texto);
        Assert.Contains("/Count 1", texto);
        Salvar("fatura-49.pdf", pdf);
    }

    [Fact]
    public void Muitos_documentos_continuam_na_pagina_seguinte()
    {
        var pdf = FaturaPdf.Gerar(Fatura49(repetirDocumentos: 30));
        var texto = Encoding.Latin1.GetString(pdf);
        Assert.DoesNotContain("/Count 1 ", texto);
        Assert.Contains("página 2 de ", texto);
        Salvar("fatura-49-longa.pdf", pdf);
    }

    [Fact]
    public void Mede_texto_com_as_larguras_da_helvetica()
    {
        // "0" mede 556 milésimos de em em qualquer peso; "i" é estreito na regular.
        Assert.Equal(5.56f, PdfSimples.Medir("0", 10, false), 2);
        Assert.Equal(2.22f, PdfSimples.Medir("i", 10, false), 2);
        Assert.Equal(PdfSimples.Medir("a", 10, false), PdfSimples.Medir("á", 10, false), 2);
        Assert.All(PdfSimples.Quebrar("I.F.C. INDUSTRIA E COMERCIO DE CONDUTORES ELETRICOS LTDA", 8.5f, false, 120),
            l => Assert.True(PdfSimples.Medir(l, 8.5f, false) <= 120));
    }

    /// <summary>Para olhar o resultado: FATURA_PDF_SAIDA=pasta grava os PDFs gerados nos testes.</summary>
    private static void Salvar(string nome, byte[] pdf)
    {
        var pasta = Environment.GetEnvironmentVariable("FATURA_PDF_SAIDA");
        if (!string.IsNullOrEmpty(pasta)) File.WriteAllBytes(Path.Combine(pasta, nome), pdf);
    }
}

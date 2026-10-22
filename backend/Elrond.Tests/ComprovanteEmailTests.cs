using System.Text;
using Elrond.Application.Services;
using Xunit;

namespace Elrond.Tests;

/// <summary>E-mail do Pix pago (faixa, dados do comprovante, rodapé da pagadora) e o PDF anexo.</summary>
public class ComprovanteEmailTests
{
    private static ComprovantePixDto Exemplo() => new(
        "m1", 25, "Lanç. 25 · Sistema TMS", 724.90m, "2026-10-21T18:01:15.876Z",
        "Siimp Sistemas", "15.473.712/0001-03", "cnpj",
        "Banco Inter", "Mirai - Matriz", "077 - Banco Inter S.A.", "producao",
        "E00416968202610211800XS4nQbwxzKN", "378c9513-639c-438e-b760-98c9cfd30340",
        "Administrador", "2026-10-21T18:00:37Z", "pela consulta na tela", "2026-10-21T18:23:34Z",
        "enviado", "si***@simpsoftware.com.br", "2026-10-21T18:23:39Z",
        "63736778000183");

    [Fact]
    public void Email_tem_faixa_embutida_dados_do_comprovante_rodape_da_pagadora_e_o_pdf()
    {
        var e = ComprovanteEmail.Montar(Exemplo());
        var html = System.Net.WebUtility.HtmlDecode(e.Html);
        Assert.Equal("Comprovante de pagamento Pix · R$ 724,90 · Mirai - Matriz", e.Assunto);
        Assert.Contains("cid:faixa-elrond", e.Html);
        Assert.Contains("21/10/2026, 15:01:15", html); // horário de Brasília
        Assert.Contains("E00416968202610211800XS4nQbwxzKN", html);
        Assert.Contains("Mirai - Matriz · 63.736.778/0001-83", html); // rodapé
        Assert.DoesNotContain("Administrador", html); // dado interno não vai ao favorecido
        Assert.Equal(2, e.Anexos.Count);
        Assert.Equal("faixa-elrond", e.Anexos[0].IdInline);
        Assert.Equal(("comprovante-pix-lancamento-25.pdf", "application/pdf"), (e.Anexos[1].Nome, e.Anexos[1].Tipo));
    }

    [Fact]
    public void Pdf_e_valido_com_a_faixa_e_os_acentos_em_winansi()
    {
        var pdf = ComprovantePdf.Gerar(Exemplo());
        var latin = Encoding.Latin1.GetString(pdf);
        Assert.StartsWith("%PDF-1.4", latin);
        Assert.EndsWith("%%EOF\n", latin);
        Assert.Contains("/Filter /DCTDecode", latin);
        Assert.Contains("(Comprovante de pagamento Pix) Tj", latin);
        Assert.Contains("(Lançamento nº 25) Tj", latin); // ç e º em WinAnsi (1 byte cada)
        // startxref aponta para a tabela xref
        var inicio = latin.LastIndexOf("startxref\n", StringComparison.Ordinal) + "startxref\n".Length;
        var pos = int.Parse(latin[inicio..latin.IndexOf('\n', inicio)]);
        Assert.StartsWith("xref", latin[pos..]);
    }
}

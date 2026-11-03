using System.Globalization;
using System.Text;

namespace Elrond.Application.Services;

/// <summary>
/// PDF do comprovante do Pix, escrito à mão (uma página A4): faixa do ELROND (JPEG), título, valor,
/// as linhas do comprovante e a faixa da empresa pagadora. Fontes padrão do PDF (Helvetica) com
/// codificação WinAnsi: acentos do português sem embutir fonte e sem biblioteca de terceiros.
/// </summary>
public static class ComprovantePdf
{
    private const float L = 595.28f, A = 841.89f, Margem = 48f;
    private static readonly CultureInfo Inv = CultureInfo.InvariantCulture;

    private static string N(float v) => v.ToString("0.##", Inv);

    /// <summary>Texto em WinAnsi (Latin-1 + aspas e travessões), com os escapes de string do PDF.</summary>
    private static byte[] Win(string s)
    {
        var bytes = new List<byte>();
        foreach (var ch in s)
        {
            var b = ch switch
            {
                '–' => 0x96, '—' => 0x97, '‘' => 0x91, '’' => 0x92, '“' => 0x93, '”' => 0x94, '…' => 0x85, '€' => 0x80, '•' => 0x95,
                _ => ch < 256 ? ch : '?',
            };
            if (b is '(' or ')' or '\\') bytes.Add((byte)'\\');
            bytes.Add((byte)b);
        }
        return bytes.ToArray();
    }

    /// <summary>Largura média da Helvetica (≈0,5 em): basta para quebrar linha sem a tabela de métricas.</summary>
    private static IEnumerable<string> Quebrar(string texto, float tamanho, float largura)
    {
        var max = Math.Max(10, (int)(largura / (tamanho * 0.52f)));
        var linha = new StringBuilder();
        foreach (var palavra in texto.Split(' '))
        {
            var p = palavra;
            while (p.Length > max) { if (linha.Length > 0) { yield return linha.ToString(); linha.Clear(); } yield return p[..max]; p = p[max..]; }
            if (linha.Length + p.Length + 1 > max && linha.Length > 0) { yield return linha.ToString(); linha.Clear(); }
            if (linha.Length > 0) linha.Append(' ');
            linha.Append(p);
        }
        if (linha.Length > 0) yield return linha.ToString();
    }

    public static byte[] Gerar(ComprovantePixDto c)
    {
        var faixa = ComprovanteEmail.FaixaElrond;
        var conteudo = new MemoryStream();
        void Cmd(string s) { var b = Encoding.ASCII.GetBytes(s + "\n"); conteudo.Write(b, 0, b.Length); }
        void Texto(string fonte, float tam, float x, float y, string s, string cor = "0.12 0.16 0.14")
        {
            Cmd($"BT {cor} rg /{fonte} {N(tam)} Tf {N(x)} {N(y)} Td (");
            conteudo.Position = conteudo.Length - 1; // tira a quebra de linha antes do texto
            var t = Win(s);
            conteudo.Write(t, 0, t.Length);
            Cmd(") Tj ET");
        }

        // Faixa do topo (imagem 1200×150 → largura da página)
        var altFaixa = L * 150f / 1200f;
        Cmd($"q {N(L)} 0 0 {N(altFaixa)} 0 {N(A - altFaixa)} cm /Im1 Do Q");
        Cmd($"0.91 0.44 0.18 rg 0 {N(A - altFaixa - 3)} {N(L)} 3 re f");

        var y = A - altFaixa - 48;
        Texto("F2", 18, Margem, y, ComprovanteEmail.Titulo(c), "0.08 0.24 0.09");
        y -= 18;
        Texto("F1", 10, Margem, y, $"Lançamento nº {c.Numero}", "0.42 0.48 0.45");
        y -= 42;
        Texto("F2", 28, Margem, y, c.Valor.ToString("C", CultureInfo.GetCultureInfo("pt-BR")), "0.08 0.24 0.09");
        y -= 24;

        var colValor = Margem + 190;
        foreach (var (rotulo, valor) in ComprovanteEmail.Linhas(c).Skip(1))
        {
            Cmd($"0.91 0.9 0.87 RG 0.6 w {N(Margem)} {N(y)} m {N(L - Margem)} {N(y)} l S");
            y -= 17;
            Texto("F1", 10, Margem, y, rotulo, "0.42 0.48 0.45");
            var partes = Quebrar(valor, 10, L - Margem - colValor).ToList();
            foreach (var parte in partes)
            {
                Texto("F1", 10, colValor, y, parte);
                y -= 14;
            }
            y -= 4;
        }
        Cmd($"0.91 0.9 0.87 RG 0.6 w {N(Margem)} {N(y)} m {N(L - Margem)} {N(y)} l S");
        y -= 22;
        Texto("F1", 8.5f, Margem, y, $"Gerado pelo ELROND com os dados devolvidos pelo banco. {ComprovanteEmail.Nota(c)}", "0.55 0.6 0.57");

        // Faixa do rodapé: quem pagou
        Cmd($"0.08 0.24 0.09 rg 0 0 {N(L)} 56 re f");
        var pagador = string.Join(" · ", new[] { c.Empresa, ComprovanteEmail.Cnpj(c.EmpresaCnpj) }.Where(x => x.Length > 0));
        Texto("F2", 11, Margem, 30, pagador, "0.96 0.94 0.91");
        Texto("F1", 8, Margem, 17, "Comprovante emitido pelo ELROND em nome da empresa pagadora.", "0.73 0.79 0.74");

        var stream = conteudo.ToArray();
        var pdf = new MemoryStream();
        var offsets = new List<long>();
        void Escrever(string s) { var b = Encoding.ASCII.GetBytes(s); pdf.Write(b, 0, b.Length); }
        void Objeto(string corpo) { offsets.Add(pdf.Position); Escrever($"{offsets.Count} 0 obj\n{corpo}\nendobj\n"); }

        Escrever("%PDF-1.4\n%\u00e2\u00e3\u00cf\u00d3\n");
        Objeto("<< /Type /Catalog /Pages 2 0 R >>");
        Objeto("<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
        Objeto($"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 {N(L)} {N(A)}] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> /XObject << /Im1 6 0 R >> >> /Contents 7 0 R >>");
        Objeto("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");
        Objeto("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>");
        // Imagem JPEG (DCTDecode): os bytes do arquivo vão como estão.
        offsets.Add(pdf.Position);
        Escrever($"6 0 obj\n<< /Type /XObject /Subtype /Image /Width 1200 /Height 150 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length {faixa.Length} >>\nstream\n");
        pdf.Write(faixa, 0, faixa.Length);
        Escrever("\nendstream\nendobj\n");
        offsets.Add(pdf.Position);
        Escrever($"7 0 obj\n<< /Length {stream.Length} >>\nstream\n");
        pdf.Write(stream, 0, stream.Length);
        Escrever("\nendstream\nendobj\n");

        var xref = pdf.Position;
        Escrever($"xref\n0 {offsets.Count + 1}\n0000000000 65535 f \n");
        foreach (var o in offsets) Escrever($"{o:0000000000} 00000 n \n");
        Escrever($"trailer\n<< /Size {offsets.Count + 1} /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF\n");
        return pdf.ToArray();
    }
}

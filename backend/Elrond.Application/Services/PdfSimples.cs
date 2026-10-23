using System.Globalization;
using System.IO.Compression;
using System.Text;

namespace Elrond.Application.Services;

/// <summary>
/// Gerador de PDF escrito à mão para documentos tabulares (fatura): páginas A4, texto em Helvetica
/// (WinAnsi, com as larguras das fontes padrão para alinhar à direita e ao centro), retângulos, linhas
/// e imagens JPEG/PNG. Coordenadas a partir do TOPO da página (y cresce para baixo), como numa tela.
/// </summary>
public sealed class PdfSimples
{
    public const float Largura = 595.28f, Altura = 841.89f;
    private static readonly CultureInfo Inv = CultureInfo.InvariantCulture;

    private readonly List<MemoryStream> _paginas = new();
    private readonly List<(string Nome, byte[] Corpo, string Dicionario, byte[]? Mascara, string? DicMascara)> _imagens = new();
    private MemoryStream _atual = null!;

    public PdfSimples() => NovaPagina();

    public int Paginas => _paginas.Count;

    public void NovaPagina()
    {
        _atual = new MemoryStream();
        _paginas.Add(_atual);
    }

    /// <summary>Volta a desenhar numa página já aberta (0 = a primeira): rodapé com "página x de y".</summary>
    public void IrParaPagina(int indice) => _atual = _paginas[indice];

    private static string N(float v) => v.ToString("0.##", Inv);

    private void Cmd(string s)
    {
        var b = Encoding.ASCII.GetBytes(s + "\n");
        _atual.Write(b, 0, b.Length);
    }

    private static string Cor((float R, float G, float B) c) => $"{N(c.R)} {N(c.G)} {N(c.B)}";

    // ── Desenho ──

    public void Retangulo(float x, float y, float l, float a, (float, float, float)? preenchimento = null, (float, float, float)? borda = null, float espessura = 0.6f)
    {
        var yPdf = Altura - y - a;
        if (preenchimento is { } p) Cmd($"{Cor(p)} rg {N(x)} {N(yPdf)} {N(l)} {N(a)} re f");
        if (borda is { } b) Cmd($"{Cor(b)} RG {N(espessura)} w {N(x)} {N(yPdf)} {N(l)} {N(a)} re S");
    }

    public void Linha(float x1, float y1, float x2, float y2, (float, float, float) cor, float espessura = 0.6f) =>
        Cmd($"{Cor(cor)} RG {N(espessura)} w {N(x1)} {N(Altura - y1)} m {N(x2)} {N(Altura - y2)} l S");

    public enum Alinhamento { Esquerda, Centro, Direita }

    /// <summary>
    /// Texto numa caixa de largura <paramref name="l"/> (0 = sem limite), com <paramref name="y"/> na linha
    /// de base. Não cabe: corta com reticências.
    /// </summary>
    public void Texto(float x, float y, string texto, float tamanho, bool negrito = false, Alinhamento alinhar = Alinhamento.Esquerda, float l = 0, (float, float, float)? cor = null)
    {
        var s = texto ?? string.Empty;
        if (l > 0) s = Caber(s, tamanho, negrito, l);
        if (s.Length == 0) return;
        var w = Medir(s, tamanho, negrito);
        var xi = alinhar switch
        {
            Alinhamento.Centro => x + (l - w) / 2,
            Alinhamento.Direita => x + l - w,
            _ => x,
        };
        var corTexto = cor ?? (0.1f, 0.1f, 0.1f);
        Cmd($"BT {Cor(corTexto)} rg /{(negrito ? "F2" : "F1")} {N(tamanho)} Tf {N(xi)} {N(Altura - y)} Td (");
        _atual.Position = _atual.Length - 1; // tira a quebra de linha antes do texto
        var t = Win(s);
        _atual.Write(t, 0, t.Length);
        Cmd(") Tj ET");
    }

    /// <summary>Quebra o texto em linhas que cabem em <paramref name="l"/> (palavra maior que a linha é cortada).</summary>
    public static List<string> Quebrar(string texto, float tamanho, bool negrito, float l)
    {
        var linhas = new List<string>();
        foreach (var paragrafo in (texto ?? string.Empty).Replace("\r", string.Empty).Split('\n'))
        {
            var atual = string.Empty;
            foreach (var palavra in paragrafo.Split(' ', StringSplitOptions.RemoveEmptyEntries))
            {
                var tentativa = atual.Length == 0 ? palavra : $"{atual} {palavra}";
                if (Medir(tentativa, tamanho, negrito) <= l) { atual = tentativa; continue; }
                if (atual.Length > 0) linhas.Add(atual);
                atual = Medir(palavra, tamanho, negrito) <= l ? palavra : Caber(palavra, tamanho, negrito, l);
            }
            if (atual.Length > 0) linhas.Add(atual);
        }
        return linhas;
    }

    private static string Caber(string s, float tamanho, bool negrito, float l)
    {
        if (Medir(s, tamanho, negrito) <= l) return s;
        var corte = s;
        while (corte.Length > 0 && Medir(corte + "…", tamanho, negrito) > l) corte = corte[..^1];
        return corte.Length == 0 ? string.Empty : corte.TrimEnd() + "…";
    }

    /// <summary>Imagem de um data URL (JPEG ou PNG) dentro da caixa, sem distorcer. Falso = formato não suportado.</summary>
    public bool Imagem(string dataUrl, float x, float y, float lMax, float aMax)
    {
        var bytes = DeDataUrl(dataUrl);
        if (bytes is null) return false;
        var img = LerJpeg(bytes) ?? LerPng(bytes);
        if (img is null) return false;
        var (largura, altura, corpo, dicionario, mascara, dicMascara) = img.Value;
        var escala = Math.Min(lMax / largura, aMax / altura);
        var l = largura * escala;
        var a = altura * escala;
        var nome = $"Im{_imagens.Count + 1}";
        _imagens.Add((nome, corpo, dicionario, mascara, dicMascara));
        Cmd($"q {N(l)} 0 0 {N(a)} {N(x)} {N(Altura - y - a)} cm /{nome} Do Q");
        return true;
    }

    // ── Montagem do arquivo ──

    public byte[] Gerar()
    {
        var pdf = new MemoryStream();
        var offsets = new Dictionary<int, long>();
        void Escrever(string s) { var b = Encoding.ASCII.GetBytes(s); pdf.Write(b, 0, b.Length); }
        void Stream(int n, string dic, byte[] corpo)
        {
            offsets[n] = pdf.Position;
            Escrever($"{n} 0 obj\n<< {dic} /Length {corpo.Length} >>\nstream\n");
            pdf.Write(corpo, 0, corpo.Length);
            Escrever("\nendstream\nendobj\n");
        }
        void Objeto(int n, string corpo) { offsets[n] = pdf.Position; Escrever($"{n} 0 obj\n{corpo}\nendobj\n"); }

        // 1 catálogo, 2 páginas, 3-4 fontes, depois as imagens (e máscaras), depois página + conteúdo de cada página.
        var proximo = 5;
        var refImagens = new List<string>();
        var objImagens = new List<(int N, int? Mascara, int Indice)>();
        for (var i = 0; i < _imagens.Count; i++)
        {
            var n = proximo++;
            int? m = _imagens[i].Mascara is null ? null : proximo++;
            objImagens.Add((n, m, i));
            refImagens.Add($"/{_imagens[i].Nome} {n} 0 R");
        }
        var paginas = _paginas.Select(_ => (Pagina: proximo++, Conteudo: proximo++)).ToList();

        Escrever("%PDF-1.4\n%âãÏÓ\n");
        Objeto(1, "<< /Type /Catalog /Pages 2 0 R >>");
        Objeto(2, $"<< /Type /Pages /Kids [{string.Join(" ", paginas.Select(p => $"{p.Pagina} 0 R"))}] /Count {paginas.Count} >>");
        Objeto(3, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");
        Objeto(4, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>");
        foreach (var (n, m, i) in objImagens)
        {
            var img = _imagens[i];
            Stream(n, img.Dicionario + (m is { } mm ? $" /SMask {mm} 0 R" : string.Empty), img.Corpo);
            if (m is { } mascara) Stream(mascara, img.DicMascara!, img.Mascara!);
        }
        var recursos = $"<< /Font << /F1 3 0 R /F2 4 0 R >>{(refImagens.Count > 0 ? $" /XObject << {string.Join(" ", refImagens)} >>" : string.Empty)} >>";
        for (var i = 0; i < paginas.Count; i++)
        {
            Objeto(paginas[i].Pagina, $"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 {N(Largura)} {N(Altura)}] /Resources {recursos} /Contents {paginas[i].Conteudo} 0 R >>");
            Stream(paginas[i].Conteudo, string.Empty, _paginas[i].ToArray());
        }

        var total = proximo - 1;
        var xref = pdf.Position;
        Escrever($"xref\n0 {total + 1}\n0000000000 65535 f \n");
        for (var n = 1; n <= total; n++) Escrever($"{offsets[n]:0000000000} 00000 n \n");
        Escrever($"trailer\n<< /Size {total + 1} /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF\n");
        return pdf.ToArray();
    }

    // ── Texto: codificação e larguras ──

    /// <summary>Texto em WinAnsi (Latin-1 + aspas e travessões), com os escapes de string do PDF.</summary>
    private static byte[] Win(string s)
    {
        var bytes = new List<byte>();
        foreach (var ch in s)
        {
            var b = ch switch
            {
                '–' => 0x96, '—' => 0x97, '‘' => 0x91, '’' => 0x92, '“' => 0x93, '”' => 0x94, '…' => 0x85, '€' => 0x80, '•' => 0x95,
                ' ' => 0xA0,
                _ => ch < 256 ? ch : '?',
            };
            if (b is '(' or ')' or '\\') bytes.Add((byte)'\\');
            bytes.Add((byte)b);
        }
        return bytes.ToArray();
    }

    // Larguras (milésimos de em) da Helvetica e da Helvetica-Bold, caracteres 32 a 126 (métricas AFM padrão).
    private static readonly short[] Regular =
    [
        278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278,
        556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556,
        1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778,
        667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556,
        333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556,
        556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584,
    ];

    private static readonly short[] Negrito =
    [
        278, 333, 474, 556, 556, 889, 722, 238, 333, 333, 389, 584, 278, 333, 278, 278,
        556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 333, 333, 584, 584, 584, 611,
        975, 722, 722, 722, 722, 667, 611, 778, 722, 278, 556, 722, 611, 833, 722, 778,
        667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 333, 278, 333, 584, 556,
        333, 556, 611, 556, 611, 556, 333, 611, 611, 278, 278, 556, 278, 889, 611, 611,
        611, 611, 389, 556, 333, 611, 556, 778, 556, 556, 500, 389, 280, 389, 584,
    ];

    public static float Medir(string s, float tamanho, bool negrito)
    {
        var tabela = negrito ? Negrito : Regular;
        var total = 0;
        foreach (var ch in s)
        {
            var c = ch;
            if (c > 126)
            {
                // Letra acentuada mede como a letra sem acento; o resto, por aproximação.
                var basica = c.ToString().Normalize(NormalizationForm.FormD)[0];
                if (basica is >= ' ' and <= '~') c = basica;
                else
                {
                    total += c switch { '—' => 1000, 'º' or 'ª' => 365, '°' => 400, '·' => 278, '•' => 350, '…' => 1000, ' ' or ' ' => 278, _ => 556 };
                    continue;
                }
            }
            total += c >= 32 ? tabela[c - 32] : 0;
        }
        return total * tamanho / 1000f;
    }

    // ── Imagens ──

    private static byte[]? DeDataUrl(string dataUrl)
    {
        if (string.IsNullOrWhiteSpace(dataUrl)) return null;
        var virgula = dataUrl.IndexOf(',');
        var b64 = dataUrl.StartsWith("data:", StringComparison.OrdinalIgnoreCase) && virgula > 0 ? dataUrl[(virgula + 1)..] : dataUrl;
        try { return Convert.FromBase64String(b64.Trim()); }
        catch (FormatException) { return null; }
    }

    /// <summary>JPEG vai como está (DCTDecode): só lê largura, altura e canais do cabeçalho.</summary>
    private static (int, int, byte[], string, byte[]?, string?)? LerJpeg(byte[] b)
    {
        if (b.Length < 4 || b[0] != 0xFF || b[1] != 0xD8) return null;
        var i = 2;
        while (i + 9 < b.Length)
        {
            if (b[i] != 0xFF) { i++; continue; }
            var marca = b[i + 1];
            var tamanho = (b[i + 2] << 8) | b[i + 3];
            // SOF0..SOF15, exceto DHT (C4), JPG (C8) e DAC (CC).
            if (marca is >= 0xC0 and <= 0xCF and not 0xC4 and not 0xC8 and not 0xCC)
            {
                var altura = (b[i + 5] << 8) | b[i + 6];
                var largura = (b[i + 7] << 8) | b[i + 8];
                var canais = b[i + 9];
                var cs = canais switch { 1 => "/DeviceGray", 4 => "/DeviceCMYK", _ => "/DeviceRGB" };
                var extra = canais == 4 ? " /Decode [1 0 1 0 1 0 1 0]" : string.Empty;
                return (largura, altura, b, $"/Type /XObject /Subtype /Image /Width {largura} /Height {altura} /ColorSpace {cs} /BitsPerComponent 8{extra} /Filter /DCTDecode", null, null);
            }
            i += 2 + tamanho;
        }
        return null;
    }

    /// <summary>
    /// PNG de 8 bits sem entrelaçamento (cinza, RGB, paleta, com ou sem transparência): desfaz os filtros
    /// das linhas e separa a transparência numa máscara (SMask), que é como o PDF entende.
    /// </summary>
    private static (int, int, byte[], string, byte[]?, string?)? LerPng(byte[] b)
    {
        byte[] assinatura = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
        if (b.Length < 33 || !b.AsSpan(0, 8).SequenceEqual(assinatura)) return null;
        int largura = 0, altura = 0, bits = 0, tipo = 0, entrelacado = 0;
        byte[]? paleta = null, transparencia = null;
        var dados = new MemoryStream();
        var i = 8;
        while (i + 8 <= b.Length)
        {
            var tamanho = (b[i] << 24) | (b[i + 1] << 16) | (b[i + 2] << 8) | b[i + 3];
            var nome = Encoding.ASCII.GetString(b, i + 4, 4);
            if (tamanho < 0 || i + 12 + tamanho > b.Length) return null;
            var corpo = b.AsSpan(i + 8, tamanho);
            switch (nome)
            {
                case "IHDR":
                    largura = (corpo[0] << 24) | (corpo[1] << 16) | (corpo[2] << 8) | corpo[3];
                    altura = (corpo[4] << 24) | (corpo[5] << 16) | (corpo[6] << 8) | corpo[7];
                    bits = corpo[8]; tipo = corpo[9]; entrelacado = corpo[12];
                    break;
                case "PLTE": paleta = corpo.ToArray(); break;
                case "tRNS": transparencia = corpo.ToArray(); break;
                case "IDAT": dados.Write(corpo); break;
            }
            if (nome == "IEND") break;
            i += 12 + tamanho;
        }
        if (largura <= 0 || altura <= 0 || bits != 8 || entrelacado != 0) return null;
        var canais = tipo switch { 0 => 1, 2 => 3, 3 => 1, 4 => 2, 6 => 4, _ => 0 };
        if (canais == 0 || (tipo == 3 && paleta is null)) return null;

        byte[] cru;
        try
        {
            dados.Position = 0;
            using var z = new ZLibStream(dados, CompressionMode.Decompress);
            using var saida = new MemoryStream();
            z.CopyTo(saida);
            cru = saida.ToArray();
        }
        catch (InvalidDataException) { return null; }

        var linhaBytes = largura * canais;
        if (cru.Length < altura * (linhaBytes + 1)) return null;
        var pix = new byte[altura * linhaBytes];
        for (var y = 0; y < altura; y++)
        {
            var filtro = cru[y * (linhaBytes + 1)];
            var origem = y * (linhaBytes + 1) + 1;
            var destino = y * linhaBytes;
            for (var x = 0; x < linhaBytes; x++)
            {
                int a = x >= canais ? pix[destino + x - canais] : 0;
                int c = y > 0 ? pix[destino - linhaBytes + x] : 0;
                int ac = y > 0 && x >= canais ? pix[destino - linhaBytes + x - canais] : 0;
                int v = cru[origem + x];
                v += filtro switch
                {
                    1 => a,
                    2 => c,
                    3 => (a + c) / 2,
                    4 => Paeth(a, c, ac),
                    _ => 0,
                };
                pix[destino + x] = (byte)v;
            }
        }

        // Cor (RGB ou cinza) e transparência (0–255) separadas.
        var cinza = tipo is 0 or 4;
        var cor = new byte[largura * altura * (cinza ? 1 : 3)];
        byte[]? alfa = tipo is 4 or 6 || transparencia is not null ? new byte[largura * altura] : null;
        for (var p = 0; p < largura * altura; p++)
        {
            switch (tipo)
            {
                case 0: cor[p] = pix[p]; if (alfa is not null) alfa[p] = transparencia!.Length >= 2 && pix[p] == transparencia[1] ? (byte)0 : (byte)255; break;
                case 4: cor[p] = pix[p * 2]; alfa![p] = pix[p * 2 + 1]; break;
                case 2:
                    Buffer.BlockCopy(pix, p * 3, cor, p * 3, 3);
                    if (alfa is not null) alfa[p] = transparencia!.Length >= 6 && pix[p * 3] == transparencia[1] && pix[p * 3 + 1] == transparencia[3] && pix[p * 3 + 2] == transparencia[5] ? (byte)0 : (byte)255;
                    break;
                case 6: Buffer.BlockCopy(pix, p * 4, cor, p * 3, 3); alfa![p] = pix[p * 4 + 3]; break;
                case 3:
                    var idx = pix[p];
                    if (idx * 3 + 2 < paleta!.Length) Buffer.BlockCopy(paleta, idx * 3, cor, p * 3, 3);
                    if (alfa is not null) alfa[p] = idx < transparencia!.Length ? transparencia[idx] : (byte)255;
                    break;
            }
        }
        if (alfa is not null && alfa.All(x => x == 255)) alfa = null;

        var dic = $"/Type /XObject /Subtype /Image /Width {largura} /Height {altura} /ColorSpace {(cinza ? "/DeviceGray" : "/DeviceRGB")} /BitsPerComponent 8 /Filter /FlateDecode";
        var dicMascara = $"/Type /XObject /Subtype /Image /Width {largura} /Height {altura} /ColorSpace /DeviceGray /BitsPerComponent 8 /Filter /FlateDecode";
        return (largura, altura, Comprimir(cor), dic, alfa is null ? null : Comprimir(alfa), alfa is null ? null : dicMascara);
    }

    private static int Paeth(int a, int b, int c)
    {
        var p = a + b - c;
        int pa = Math.Abs(p - a), pb = Math.Abs(p - b), pc = Math.Abs(p - c);
        return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
    }

    private static byte[] Comprimir(byte[] dados)
    {
        using var saida = new MemoryStream();
        using (var z = new ZLibStream(saida, CompressionLevel.Optimal, leaveOpen: true)) z.Write(dados);
        return saida.ToArray();
    }
}

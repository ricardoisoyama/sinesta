using System.Globalization;
using static Elrond.Application.Services.PdfSimples;

namespace Elrond.Application.Services;

/// <summary>Quem emite a fatura (a empresa do ELROND). Logo: data URL (JPEG ou PNG); vazio = só o nome.</summary>
public sealed record FaturaPdfEmitente(string Nome, string Cnpj, string Endereco, string CidadeUfCep, string Contato, string Logo = "");

/// <summary>Quem paga (o solicitante na fatura da SIIMP).</summary>
public sealed record FaturaPdfCliente(string Nome, string Documento, string InscricaoEstadual, string Endereco, string CidadeUf, string Cep, string Email, string Telefone);

/// <summary>Duplicata. Datas yyyy-MM-dd (Pagamento vazio = em aberto).</summary>
public sealed record FaturaPdfParcela(int Numero, int De, decimal Total, decimal Desconto, string Vencimento, string Pagamento, string Situacao);

/// <summary>
/// Linha de DOCUMENTOS. Tipo "CT-E" | "MINUTA". Numero "1/23" (série/número); Complemento: o que vai embaixo
/// do número ("NFS-e 59"). Nfs: "1/207407" (uma por NF). Datas yyyy-MM-dd. Peso nulo = sem NF ligada.
/// </summary>
public sealed record FaturaPdfDocumento(
    string Data, string Tipo, string Numero, string Complemento, IReadOnlyList<string> Nfs, decimal? Peso,
    decimal Gris, decimal Seguro, decimal Pedagio, decimal Icms, decimal Total, string DataNf);

/// <summary>Tudo o que a fatura impressa mostra (os totais vêm prontos: quem monta é o serviço da fatura).</summary>
public sealed record FaturaPdfDados(
    FaturaPdfEmitente Emitente, FaturaPdfCliente Cliente,
    long Numero, string Situacao, string Emissao, string Vencimento, string CentroCusto,
    decimal Valor, decimal Adicional, decimal Desconto, decimal Total,
    decimal PesoTotal, decimal IcmsTotal, decimal ValorNfTotal,
    IReadOnlyList<FaturaPdfParcela> Parcelas, IReadOnlyList<FaturaPdfDocumento> Documentos);

/// <summary>
/// Fatura impressa (o "espelho" que vai para o cliente com o boleto e os documentos fiscais), no mesmo
/// desenho da fatura da SIIMP que os clientes já conhecem: cabeçalho com a empresa e o quadro da fatura,
/// solicitante, resumo, duplicatas, documentos, totalizadores e assinatura. Documentos que não cabem
/// continuam na página seguinte (com o cabeçalho da tabela repetido).
/// </summary>
public static class FaturaPdf
{
    private static readonly CultureInfo PtBr = CultureInfo.GetCultureInfo("pt-BR");

    private const float M = 28f;
    private const float W = Largura - 2 * M;
    private static readonly (float, float, float) Cinza = (0.85f, 0.85f, 0.85f);
    private static readonly (float, float, float) CinzaClaro = (0.93f, 0.93f, 0.93f);
    private static readonly (float, float, float) Borda = (0.2f, 0.2f, 0.2f);
    private static readonly (float, float, float) Tinta = (0.1f, 0.1f, 0.1f);
    private static readonly (float, float, float) Apagado = (0.42f, 0.42f, 0.42f);

    public static string Dinheiro(decimal v) => "R$ " + v.ToString("N2", PtBr);
    public static string Data(string? iso)
    {
        var s = iso ?? string.Empty;
        return DateOnly.TryParseExact(s.Length >= 10 ? s[..10] : s, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var d)
            ? d.ToString("dd/MM/yyyy", CultureInfo.InvariantCulture) : s;
    }
    private static string Peso(decimal v) => v.ToString("N3", PtBr);

    // Colunas de DOCUMENTOS (somam W).
    private static readonly (string Titulo, float L, Alinhamento A)[] ColunasDoc =
    [
        ("DATA", 50, Alinhamento.Centro), ("TIPO", 40, Alinhamento.Centro), ("NÚMERO", 50, Alinhamento.Centro),
        ("NF", 56, Alinhamento.Centro), ("PESO", 52, Alinhamento.Centro), ("GRIS", 42, Alinhamento.Direita),
        ("SEGURO", 48, Alinhamento.Direita), ("PEDÁGIO", 46, Alinhamento.Direita), ("ICMS", 42, Alinhamento.Direita),
        ("TOTAL", 56, Alinhamento.Direita), ("DATA EMI. NF", 0, Alinhamento.Centro),
    ];

    public static byte[] Gerar(FaturaPdfDados f)
    {
        var pdf = new PdfSimples();
        var y = Cabecalho(pdf, f);
        y = Solicitante(pdf, f.Cliente, y + 12);
        y = Tabela(pdf, y + 10, null,
            [("DATA DE EMISSÃO", Alinhamento.Centro), ("Nº FATURA", Alinhamento.Centro), ("CENTRO DE CUSTO", Alinhamento.Centro),
             ("VALOR DA FATURA", Alinhamento.Centro), ("VALOR DO DESCONTO", Alinhamento.Centro), ("VENCIMENTO", Alinhamento.Centro)],
            [[Data(f.Emissao), f.Numero.ToString(CultureInfo.InvariantCulture), f.CentroCusto, Dinheiro(f.Total + f.Desconto - f.Adicional), Dinheiro(f.Desconto), Data(f.Vencimento)]],
            tamanhoTitulo: 8.5f, tamanhoValor: 10.5f, alturaLinha: 17);
        y = Tabela(pdf, y + 10, "DUPLICATAS",
            [("PARCELA", Alinhamento.Centro), ("TOTAL", Alinhamento.Centro), ("DESCONTO", Alinhamento.Centro),
             ("VENCIMENTO", Alinhamento.Centro), ("PAGAMENTO", Alinhamento.Centro), ("SITUAÇÃO", Alinhamento.Centro)],
            f.Parcelas.Select(p => (IReadOnlyList<string>)[$"{p.Numero}/{p.De}", Dinheiro(p.Total), Dinheiro(p.Desconto), Data(p.Vencimento), Data(p.Pagamento), p.Situacao.ToUpperInvariant()]).ToList(),
            tamanhoTitulo: 8, tamanhoValor: 8.5f, alturaLinha: 14);
        y = Documentos(pdf, f, y + 10);
        y = Totalizadores(pdf, f, y + 10);

        // Assinatura
        y += 34;
        if (y > Altura - 70) { pdf.NovaPagina(); y = 80; }
        pdf.Texto(M + 210, y, "ASSINATURA:", 8.5f);
        pdf.Linha(M + 268, y + 1, M + W, y + 1, Tinta, 0.6f);

        Rodapes(pdf, f.Numero);
        return pdf.Gerar();
    }

    private static float Cabecalho(PdfSimples pdf, FaturaPdfDados f)
    {
        var e = f.Emitente;
        var x = M;
        if (e.Logo.Length > 0 && pdf.Imagem(e.Logo, M, 34, 92, 52)) x = M + 104;
        var y = 44f;
        pdf.Texto(x, y, e.Nome.ToUpperInvariant(), 9.5f, negrito: true, l: 380 - x + M);
        foreach (var linha in new[] { e.Cnpj.Length > 0 ? $"CNPJ: {e.Cnpj}" : string.Empty, e.Endereco, e.CidadeUfCep, e.Contato }.Where(s => s.Length > 0))
        {
            y += 10.5f;
            pdf.Texto(x, y, linha, 8, l: 380 - x + M);
        }

        // Quadro da fatura (direita)
        const float qx = M + W - 172, ql = 172;
        pdf.Retangulo(qx, 30, ql, 18, Cinza);
        pdf.Texto(qx, 43, "FATURA", 11, negrito: true, alinhar: Alinhamento.Centro, l: ql);
        pdf.Texto(qx, 78, f.Numero.ToString(CultureInfo.InvariantCulture), 26, negrito: true, alinhar: Alinhamento.Centro, l: ql);
        pdf.Retangulo(qx, 88, ql, 14, Cinza);
        pdf.Texto(qx, 98.5f, f.Situacao.ToUpperInvariant(), 8.5f, negrito: true, alinhar: Alinhamento.Centro, l: ql);
        pdf.Texto(qx, 111, "TOTAL", 7.5f, negrito: true, alinhar: Alinhamento.Centro, l: ql / 2);
        pdf.Texto(qx + ql / 2, 111, "VENCIMENTO", 7.5f, negrito: true, alinhar: Alinhamento.Centro, l: ql / 2);
        pdf.Texto(qx, 121, Dinheiro(f.Total), 8, alinhar: Alinhamento.Centro, l: ql / 2);
        pdf.Texto(qx + ql / 2, 121, Data(f.Vencimento), 8, alinhar: Alinhamento.Centro, l: ql / 2);
        return Math.Max(y, 124);
    }

    /// <summary>Quadro do solicitante: nome | CPF/CNPJ | IE; endereço | cidade/UF | CEP; e-mail | telefone.</summary>
    private static float Solicitante(PdfSimples pdf, FaturaPdfCliente c, float y)
    {
        const float c1 = 280, c2 = 150, c3 = W - c1 - c2;
        Titulo(pdf, M, y, W, "SOLICITANTE");
        y += 14;
        var nome = Quebrar(c.Nome, 8.5f, false, c1 - 8).Take(2).ToList();
        var h1 = nome.Count > 1 ? 22f : 14f;
        var linhas = new (float H, (float X, float L, string Rotulo, string Valor, IReadOnlyList<string>? Varias)[] Celulas)[]
        {
            (h1, [(M, c1, string.Empty, string.Empty, nome), (M + c1, c2, "CPF/CNPJ:", c.Documento, null), (M + c1 + c2, c3, "IE:", c.InscricaoEstadual, null)]),
            (14, [(M, c1, string.Empty, c.Endereco, null), (M + c1, c2, "CIDADE/UF:", c.CidadeUf, null), (M + c1 + c2, c3, "CEP:", c.Cep, null)]),
            (14, [(M, c1, "E-MAIL:", c.Email, null), (M + c1, c2 + c3, "TELEFONE:", c.Telefone, null)]),
        };
        foreach (var (h, celulas) in linhas)
        {
            foreach (var (x, l, rotulo, valor, varias) in celulas)
            {
                pdf.Retangulo(x, y, l, h, borda: Borda);
                if (varias is not null)
                {
                    for (var i = 0; i < varias.Count; i++) pdf.Texto(x + 4, y + 10 + i * 9, varias[i], 8.5f);
                    continue;
                }
                var dx = 4f;
                if (rotulo.Length > 0)
                {
                    pdf.Texto(x + dx, y + 10, rotulo, 8, negrito: true);
                    dx += Medir(rotulo, 8, true) + 3;
                }
                pdf.Texto(x + dx, y + 10, valor, 8.5f, l: l - dx - 4);
            }
            y += h;
        }
        return y;
    }

    private static void Titulo(PdfSimples pdf, float x, float y, float l, string texto)
    {
        pdf.Retangulo(x, y, l, 14, Cinza, Borda);
        pdf.Texto(x + 4, y + 10, texto, 8.5f, negrito: true);
    }

    /// <summary>Tabela de colunas iguais com título opcional, cabeçalho cinza e linhas de valores.</summary>
    private static float Tabela(PdfSimples pdf, float y, string? titulo, (string Texto, Alinhamento A)[] colunas, IReadOnlyList<IReadOnlyList<string>> linhas,
        float tamanhoTitulo, float tamanhoValor, float alturaLinha)
    {
        if (titulo is not null) { Titulo(pdf, M, y, W, titulo); y += 14; }
        var l = W / colunas.Length;
        var duas = colunas.Any(c => Medir(c.Texto, tamanhoTitulo, true) > l - 6);
        var hCab = duas ? tamanhoTitulo * 2.4f : tamanhoTitulo * 1.9f;
        pdf.Retangulo(M, y, W, hCab, CinzaClaro, Borda);
        for (var i = 0; i < colunas.Length; i++)
        {
            var partes = Medir(colunas[i].Texto, tamanhoTitulo, true) > l - 6 ? Quebrar(colunas[i].Texto, tamanhoTitulo, true, l - 6) : [colunas[i].Texto];
            var y0 = y + (hCab - partes.Count * tamanhoTitulo * 1.1f) / 2 + tamanhoTitulo * 0.9f;
            for (var p = 0; p < partes.Count; p++)
                pdf.Texto(M + i * l + 3, y0 + p * tamanhoTitulo * 1.1f, partes[p], tamanhoTitulo, negrito: true, alinhar: Alinhamento.Centro, l: l - 6);
        }
        y += hCab;
        foreach (var linha in linhas)
        {
            pdf.Retangulo(M, y, W, alturaLinha, borda: Borda);
            for (var i = 0; i < colunas.Length && i < linha.Count; i++)
            {
                if (i > 0) pdf.Linha(M + i * l, y, M + i * l, y + alturaLinha, Borda);
                pdf.Texto(M + i * l + 3, y + alturaLinha / 2 + tamanhoValor * 0.35f, linha[i], tamanhoValor, alinhar: colunas[i].A, l: l - 6);
            }
            y += alturaLinha;
        }
        return y;
    }

    private static float Documentos(PdfSimples pdf, FaturaPdfDados f, float y)
    {
        var larguras = ColunasDoc.Select(c => c.L).ToArray();
        larguras[^1] = W - larguras[..^1].Sum();

        float CabecalhoDoc(float yy)
        {
            Titulo(pdf, M, yy, W, "DOCUMENTOS");
            yy += 14;
            pdf.Retangulo(M, yy, W, 12, CinzaClaro, Borda);
            var x = M;
            for (var i = 0; i < ColunasDoc.Length; i++)
            {
                pdf.Texto(x + 2, yy + 8.5f, ColunasDoc[i].Titulo, 6.5f, negrito: true, alinhar: Alinhamento.Centro, l: larguras[i] - 4);
                x += larguras[i];
            }
            return yy + 12;
        }

        y = CabecalhoDoc(y);
        const float limite = Altura - 60;
        foreach (var d in f.Documentos)
        {
            var numero = new[] { d.Numero, d.Complemento }.Where(s => s.Length > 0).ToList();
            var nfs = d.Nfs.Count <= 2 ? d.Nfs.ToList() : [d.Nfs[0], $"+ {d.Nfs.Count - 1} NF"];
            var linhasCelula = Math.Max(1, Math.Max(numero.Count, nfs.Count));
            var h = linhasCelula == 1 ? 12f : 6 + linhasCelula * 7.5f;
            if (y + h > limite)
            {
                pdf.NovaPagina();
                y = CabecalhoDoc(40);
            }
            var valores = new IReadOnlyList<string>[]
            {
                [Data(d.Data)], [d.Tipo], numero, nfs, [d.Peso is { } p ? Peso(p) : string.Empty],
                [Dinheiro(d.Gris)], [Dinheiro(d.Seguro)], [Dinheiro(d.Pedagio)], [Dinheiro(d.Icms)], [Dinheiro(d.Total)], [Data(d.DataNf)],
            };
            pdf.Retangulo(M, y, W, h, borda: Borda);
            var x = M;
            for (var i = 0; i < valores.Length; i++)
            {
                if (i > 0) pdf.Linha(x, y, x, y + h, Borda);
                var partes = valores[i];
                var y0 = y + (h - partes.Count * 7.5f) / 2 + 5.6f;
                for (var k = 0; k < partes.Count; k++)
                    pdf.Texto(x + 2, y0 + k * 7.5f, partes[k], 6.5f, alinhar: ColunasDoc[i].A, l: larguras[i] - 4);
                x += larguras[i];
            }
            y += h;
        }
        return y;
    }

    private static float Totalizadores(PdfSimples pdf, FaturaPdfDados f, float y)
    {
        if (y + 120 > Altura - 60) { pdf.NovaPagina(); y = 40; }
        Titulo(pdf, M, y, W, "TOTALIZADORES");
        y += 14;
        float[] col = [W * 0.22f, W * 0.18f, W * 0.32f, W * 0.28f];
        string[] titulos = ["PESO", "ICMS", "TOTAL NF", "TOTAL SERVIÇO"];
        string[] valores = [$"{f.PesoTotal.ToString("N2", PtBr)} KG", Dinheiro(f.IcmsTotal), Dinheiro(f.ValorNfTotal), Dinheiro(f.Valor)];
        pdf.Retangulo(M, y, W, 16, CinzaClaro, Borda);
        pdf.Retangulo(M, y + 16, W, 17, borda: Borda);
        var x = M;
        for (var i = 0; i < col.Length; i++)
        {
            pdf.Texto(x + 4, y + 11.5f, titulos[i], 9.5f, negrito: true, alinhar: Alinhamento.Direita, l: col[i] - 8);
            pdf.Texto(x + 4, y + 28.5f, valores[i], 9.5f, alinhar: Alinhamento.Direita, l: col[i] - 8);
            x += col[i];
        }
        y += 33 + 10;

        // Quadro final: quantidade, valor, adicional, desconto e total.
        float[] col2 = [W * 0.2f, W * 0.2f, W * 0.2f, W * 0.2f, W * 0.2f];
        string[] t2 = ["QTD. DOC.", "VALOR", "ADICIONAL", "DESCONTO", "TOTAL"];
        string[] v2 = [f.Documentos.Count.ToString(CultureInfo.InvariantCulture), Dinheiro(f.Valor), Dinheiro(f.Adicional), Dinheiro(f.Desconto), Dinheiro(f.Total)];
        pdf.Retangulo(M, y, W, 18, CinzaClaro, Borda);
        pdf.Retangulo(M, y + 18, W, 20, borda: Borda);
        x = M;
        for (var i = 0; i < col2.Length; i++)
        {
            pdf.Texto(x + 4, y + 13, t2[i], 10, negrito: true, alinhar: Alinhamento.Direita, l: col2[i] - 8);
            var ultimo = i == col2.Length - 1;
            pdf.Texto(x + 4, y + 33, v2[i], ultimo ? 13 : 10, negrito: ultimo, alinhar: Alinhamento.Direita, l: col2[i] - 8);
            x += col2[i];
        }
        return y + 38;
    }

    /// <summary>Rodapé de cada página: quem emitiu e, com mais de uma página, "página x de y".</summary>
    private static void Rodapes(PdfSimples pdf, long numero)
    {
        var total = pdf.Paginas;
        for (var i = 0; i < total; i++)
        {
            pdf.IrParaPagina(i);
            pdf.Texto(M, Altura - 22, $"Fatura {numero} · emitida pelo ELROND", 7.5f, alinhar: Alinhamento.Centro, l: W, cor: Apagado);
            if (total > 1) pdf.Texto(M, Altura - 22, $"página {i + 1} de {total}", 7.5f, alinhar: Alinhamento.Direita, l: W, cor: Apagado);
        }
    }
}

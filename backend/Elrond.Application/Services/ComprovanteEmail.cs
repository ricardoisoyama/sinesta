using System.Globalization;
using System.Net;
using Elrond.Application.Interfaces;
using Elrond.Domain.Entities;

namespace Elrond.Application.Services;

/// <summary>E-mail de pagamento efetuado: assunto, HTML, texto e anexos (faixa embutida + PDF).</summary>
public sealed record AvisoPagamentoEmail(string Assunto, string Html, string Texto, IReadOnlyList<AnexoEmail> Anexos);

/// <summary>
/// Monta o e-mail do Pix pago: faixa do ELROND no topo (verde, sol e nome), os dados do comprovante
/// e a faixa da empresa que pagou no rodapé. O PDF do comprovante vai anexo. HTML em tabelas e
/// estilo inline, que é o que os leitores de e-mail (Gmail, Outlook) respeitam.
/// </summary>
public static class ComprovanteEmail
{
    private static readonly CultureInfo PtBr = CultureInfo.GetCultureInfo("pt-BR");
    public const string CidFaixa = "faixa-elrond";
    private const string Verde = "#143d18";
    private const string Laranja = "#e8702f";
    private const string Creme = "#f5f0e8";

    private static readonly Lazy<byte[]> Faixa = new(() =>
    {
        using var s = typeof(ComprovanteEmail).Assembly.GetManifestResourceStream("Elrond.Application.Recursos.faixa-elrond.jpg")
            ?? throw new InvalidOperationException("Recurso faixa-elrond.jpg não encontrado.");
        using var m = new MemoryStream();
        s.CopyTo(m);
        return m.ToArray();
    });

    /// <summary>A faixa com o logo (JPEG 1200×150), para o e-mail e o PDF.</summary>
    public static byte[] FaixaElrond => Faixa.Value;

    private static TimeZoneInfo Fuso()
    {
        try { return TimeZoneInfo.FindSystemTimeZoneById("America/Sao_Paulo"); }
        catch (TimeZoneNotFoundException) { return TimeZoneInfo.FindSystemTimeZoneById("E. South America Standard Time"); }
    }

    /// <summary>Data e hora de Brasília ("21/10/2026, 15:01:15"), seja qual for o fuso do servidor.</summary>
    public static string Quando(string iso)
    {
        if (!DateTimeOffset.TryParse(iso, CultureInfo.InvariantCulture, DateTimeStyles.AssumeUniversal, out var d)) return iso;
        return TimeZoneInfo.ConvertTime(d, Fuso()).ToString("dd/MM/yyyy, HH:mm:ss", PtBr);
    }

    public static string Cnpj(string d)
    {
        var s = new string((d ?? string.Empty).Where(char.IsDigit).ToArray());
        return s.Length == 14 ? $"{s[..2]}.{s[2..5]}.{s[5..8]}/{s[8..12]}-{s[12..]}" : s;
    }

    private static readonly Dictionary<string, string> TipoChave = new()
    {
        ["cpf"] = "CPF", ["cnpj"] = "CNPJ", ["celular"] = "Celular", ["email"] = "E-mail", ["aleatoria"] = "Chave aleatória",
    };

    /// <summary>As linhas que o favorecido vê (sem os dados internos: quem agendou, como confirmou).</summary>
    public static IReadOnlyList<(string Rotulo, string Valor)> Linhas(ComprovantePixDto c) =>
    [
        ("Valor", c.Valor.ToString("C", PtBr)),
        ("Efetivado no banco em", Quando(c.EfetivadoEm)),
        ("Favorecido", c.Favorecido),
        ("Chave Pix", c.Chave + (TipoChave.TryGetValue(c.TipoChave, out var t) ? $" ({t})" : string.Empty)),
        ("Pago por", string.Join(" · ", new[] { c.Empresa, Cnpj(c.EmpresaCnpj) }.Where(x => x.Length > 0))),
        ("Banco", string.Join(" · ", new[] { c.Banco, c.Conta }.Where(x => x.Length > 0))),
        ("ID do Pix (fim a fim)", c.IdPix.Length > 0 ? c.IdPix : "—"),
        ("Código da solicitação no banco", c.CodigoBanco.Length > 0 ? c.CodigoBanco : "—"),
        ("Referência", c.Descricao),
    ];

    public static string NomeDoPdf(ComprovantePixDto c) => $"comprovante-pix-lancamento-{c.Numero}.pdf";

    public static AvisoPagamentoEmail Montar(ComprovantePixDto c)
    {
        var valor = c.Valor.ToString("C", PtBr);
        var h = (string s) => WebUtility.HtmlEncode(s);
        var linhas = string.Concat(Linhas(c).Skip(1).Select(l =>
            $"<tr><td style=\"padding:9px 0;border-top:1px solid #ece8df;color:#6b7b72;font-size:13px;width:42%;vertical-align:top\">{h(l.Rotulo)}</td>" +
            $"<td style=\"padding:9px 0;border-top:1px solid #ece8df;color:#1f2a24;font-size:13px;word-break:break-all\">{h(l.Valor)}</td></tr>"));
        var rodape = string.Join(" · ", new[] { c.Empresa, Cnpj(c.EmpresaCnpj) }.Where(x => x.Length > 0));
        var html =
            "<!doctype html><html lang=\"pt-BR\"><body style=\"margin:0;padding:0;background:#f2efe8\">" +
            "<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"background:#f2efe8;padding:24px 0\"><tr><td align=\"center\">" +
            "<table role=\"presentation\" width=\"600\" cellpadding=\"0\" cellspacing=\"0\" style=\"width:600px;max-width:100%;background:#ffffff;font-family:Arial,Helvetica,sans-serif\">" +
            // faixa do topo: logo do ELROND
            $"<tr><td style=\"background:{Verde};padding:0\"><img src=\"cid:{CidFaixa}\" width=\"600\" alt=\"ELROND\" style=\"display:block;width:100%;max-width:600px;height:auto;border:0\"/></td></tr>" +
            $"<tr><td style=\"background:{Laranja};height:3px;line-height:3px;font-size:0\">&nbsp;</td></tr>" +
            "<tr><td style=\"padding:28px 32px 8px\">" +
            $"<div style=\"font-size:13px;color:#6b7b72\">Olá, {h(c.Favorecido)}.</div>" +
            "<div style=\"font-size:20px;font-weight:bold;color:#143d18;margin-top:10px\">Comprovante de pagamento Pix</div>" +
            $"<div style=\"font-size:12px;color:#6b7b72;margin-top:2px\">Lançamento nº {c.Numero}</div>" +
            $"<div style=\"font-size:30px;font-weight:bold;color:#143d18;margin:18px 0 14px\">{h(valor)}</div>" +
            $"<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\">{linhas}</table>" +
            "<div style=\"font-size:12px;color:#8a978f;margin:18px 0 6px;line-height:1.5\">O comprovante em PDF vai anexo. O ID do Pix identifica a transação em qualquer banco.</div>" +
            "</td></tr>" +
            // faixa do rodapé: quem pagou
            $"<tr><td style=\"background:{Verde};padding:16px 32px;color:{Creme};font-size:13px\"><b>{h(rodape)}</b>" +
            $"<div style=\"color:#b9c9bc;font-size:11px;margin-top:3px\">Mensagem automática enviada pelo ELROND em nome da empresa pagadora.</div></td></tr>" +
            "</table></td></tr></table></body></html>";
        var texto = $"Olá, {c.Favorecido}. Comprovante de pagamento Pix · lançamento nº {c.Numero}\n" +
                    string.Join("\n", Linhas(c).Select(l => $"{l.Rotulo}: {l.Valor}")) +
                    $"\n\n{rodape}\nO comprovante em PDF vai anexo.";
        var anexos = new List<AnexoEmail>
        {
            new("faixa-elrond.jpg", "image/jpeg", FaixaElrond, CidFaixa),
            new(NomeDoPdf(c), "application/pdf", ComprovantePdf.Gerar(c)),
        };
        var assunto = $"Comprovante de pagamento Pix · {valor}" + (c.Empresa.Length > 0 ? $" · {c.Empresa}" : string.Empty);
        return new AvisoPagamentoEmail(assunto, html, texto, anexos);
    }

    /// <summary>Sem o comprovante (não deveria acontecer): o aviso simples de antes, sem anexo.</summary>
    public static AvisoPagamentoEmail SemComprovante(PagamentoBancario p)
    {
        var valor = p.Valor.ToString("C", PtBr);
        var html = $"<p>Olá, {WebUtility.HtmlEncode(p.FavorecidoNome)}.</p><p>Informamos que o pagamento de <b>{valor}</b> foi efetuado por Pix em {Quando(p.PagoEm)}.</p>" +
                   $"<p>Referência: {WebUtility.HtmlEncode(p.Descricao)}{(p.EndToEnd.Length > 0 ? $"<br/>Identificador do Pix: {p.EndToEnd}" : string.Empty)}</p>";
        var texto = $"Olá, {p.FavorecidoNome}. O pagamento de {valor} foi efetuado por Pix em {Quando(p.PagoEm)}. Referência: {p.Descricao}.";
        return new AvisoPagamentoEmail($"Pagamento efetuado · {valor}", html, texto, Array.Empty<AnexoEmail>());
    }
}

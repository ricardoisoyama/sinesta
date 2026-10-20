using System.Text;
using Elrond.Application.Interfaces;
using Elrond.Infrastructure.Services;
using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Logging;
using MimeKit;

namespace Elrond.Infrastructure.Email;

/// <summary>Envio por SMTP com o MailKit (STARTTLS na 587, SSL direto na 465).</summary>
public sealed class SmtpMailKit(ILogger<SmtpMailKit> log) : IEnvioSmtp
{
    public async Task<string?> EnviarAsync(ServidorSmtp s, MensagemEmail m, CancellationToken ct = default)
    {
        try
        {
            var msg = new MimeMessage();
            msg.From.Add(new MailboxAddress(s.RemetenteNome, s.RemetenteEmail));
            msg.To.Add(MailboxAddress.Parse(m.Para));
            if (s.ResponderPara.Length > 0) msg.ReplyTo.Add(MailboxAddress.Parse(s.ResponderPara));
            msg.Subject = m.Assunto;
            msg.Body = new BodyBuilder { HtmlBody = m.Html, TextBody = m.Texto }.ToMessageBody();

            using var smtp = new SmtpClient { Timeout = 30_000 };
            var seguranca = s.Seguranca switch
            {
                "ssl" => SecureSocketOptions.SslOnConnect,
                "nenhuma" => SecureSocketOptions.None,
                _ => SecureSocketOptions.StartTls,
            };
            await smtp.ConnectAsync(s.Host, s.Porta, seguranca, ct);
            if (s.Usuario.Length > 0) await smtp.AuthenticateAsync(s.Usuario, s.Senha, ct);
            await smtp.SendAsync(msg, ct);
            await smtp.DisconnectAsync(true, ct);
            return null;
        }
        catch (Exception e) when (e is not OperationCanceledException)
        {
            log.LogWarning(e, "Envio de e-mail falhou ({Host}:{Porta})", s.Host, s.Porta);
            return e switch
            {
                AuthenticationException => "o servidor recusou o usuário ou a senha.",
                SslHandshakeException => "a conexão segura falhou: confira a porta e a segurança (587 = STARTTLS, 465 = SSL).",
                SmtpCommandException c => $"o servidor recusou o envio: {c.Message}",
                ParseException => "endereço de e-mail inválido.",
                System.Net.Sockets.SocketException or TimeoutException or IOException => "não foi possível falar com o servidor (endereço, porta ou firewall).",
                _ => e.Message,
            };
        }
    }
}

/// <summary>Cofre de segredos simples com a chave do ambiente (a mesma das credenciais bancárias).</summary>
public sealed class CofreSegredos(CertificadoOpcoes opcoes) : ICofreSegredos
{
    public bool Configurado => opcoes.Chave() is { Length: 32 };

    private byte[] Chave() => opcoes.Chave() is { Length: 32 } k ? k : throw new InvalidOperationException("Chave de cifra (Certificados__Chave) ausente ou inválida.");

    public byte[] Fechar(string contexto, string valor) =>
        CertificadoService.Cifrar(Encoding.UTF8.GetBytes(valor), Chave(), Encoding.UTF8.GetBytes($"segredo:{contexto}"));

    public string Abrir(string contexto, byte[] cifrado) =>
        cifrado.Length == 0 ? string.Empty : Encoding.UTF8.GetString(CertificadoService.Decifrar(cifrado, Chave(), Encoding.UTF8.GetBytes($"segredo:{contexto}")));
}

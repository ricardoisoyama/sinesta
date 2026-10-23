using System.Net.Mail;
using Elrond.Application.Common;
using Elrond.Application.DTOs;
using Elrond.Application.Interfaces;
using Elrond.Domain.Entities;

namespace Elrond.Application.Services;

/// <summary>Configuração do SMTP como a tela vê (a senha nunca volta; só se existe).</summary>
public sealed record SmtpDto(
    string Host, int Porta, string Seguranca, string Usuario, bool TemSenha, string RemetenteNome, string RemetenteEmail, string ResponderPara,
    string EmailTeste, bool SomenteTeste, bool Ativo, string TestadoEm, bool TesteOk, string AlteradoEm, string AlteradoPor);

/// <summary>O que a tela grava. Senha nula = mantém a gravada.</summary>
public sealed record SalvarSmtpDto(
    string Host, int Porta, string Seguranca, string Usuario, string? Senha, string RemetenteNome, string RemetenteEmail, string ResponderPara,
    string EmailTeste, bool SomenteTeste, bool Ativo);

/// <summary>
/// E-mails do sistema por SMTP (Administrativo › Integração SMTP). No modo piloto, tudo vai só para o
/// e-mail de teste, com o destinatário real no assunto. Cada envio fica registrado; falha de e-mail
/// nunca desfaz o que o sistema fez (o pagamento continua baixado, só o aviso não saiu).
/// </summary>
public sealed class EmailService(
    ICrudRepository<ConfiguracaoSmtp> configuracoes,
    ICrudRepository<EmailEnviado> enviados,
    IEnvioSmtp smtp,
    ICofreSegredos cofre,
    IAuditoriaService auditoria,
    TimeProvider relogio)
{
    private static readonly string[] Segurancas = ["starttls", "ssl", "nenhuma"];
    private const string Contexto = "smtp:padrao";

    public async Task<SmtpDto> ConfiguracaoAsync() => Dto(await configuracoes.GetByIdAsync(ConfiguracaoSmtp.IdPadrao) ?? new ConfiguracaoSmtp());

    public async Task<List<EmailEnviado>> UltimosAsync(int quantos = 50) =>
        (await enviados.GetAllAsync()).OrderByDescending(e => e.Em).Take(quantos).ToList();

    public async Task<Result<SmtpDto>> SalvarAsync(SalvarSmtpDto d, UsuarioAtual quem)
    {
        var host = (d.Host ?? string.Empty).Trim();
        if (host.Length == 0) return Result.Failure<SmtpDto>("Informe o servidor (host) do SMTP.");
        if (d.Porta is < 1 or > 65535) return Result.Failure<SmtpDto>("Porta inválida.");
        if (!Segurancas.Contains(d.Seguranca)) return Result.Failure<SmtpDto>("Escolha a segurança da conexão.");
        if (!EmailValido(d.RemetenteEmail)) return Result.Failure<SmtpDto>("Informe o e-mail do remetente.");
        if ((d.ResponderPara ?? string.Empty).Trim().Length > 0 && !EmailValido(d.ResponderPara)) return Result.Failure<SmtpDto>("O \"responder para\" não é um e-mail válido.");
        if ((d.SomenteTeste || (d.EmailTeste ?? string.Empty).Trim().Length > 0) && !EmailValido(d.EmailTeste))
            return Result.Failure<SmtpDto>("Informe o e-mail de teste (no modo piloto, todos os e-mails vão para ele).");
        if (d.Senha is { Length: > 0 } && !cofre.Configurado) return Result.Failure<SmtpDto>("A chave de cifra não está configurada neste ambiente.");

        var antes = await configuracoes.GetByIdAsync(ConfiguracaoSmtp.IdPadrao);
        var c = antes ?? new ConfiguracaoSmtp();
        c.Host = host;
        c.Porta = d.Porta;
        c.Seguranca = d.Seguranca;
        c.Usuario = (d.Usuario ?? string.Empty).Trim();
        if (d.Senha is { Length: > 0 } senha) c.SenhaCifrada = cofre.Fechar(Contexto, senha);
        c.RemetenteNome = (d.RemetenteNome ?? string.Empty).Trim();
        c.RemetenteEmail = d.RemetenteEmail.Trim();
        c.ResponderPara = (d.ResponderPara ?? string.Empty).Trim();
        c.EmailTeste = (d.EmailTeste ?? string.Empty).Trim();
        c.SomenteTeste = d.SomenteTeste;
        c.Ativo = d.Ativo;
        if (antes is null) await configuracoes.AddAsync(c); else await configuracoes.UpdateAsync(c.Id, c);
        await auditoria.RegistrarAsync(antes is null ? "criar" : "editar", "ConfiguracaoSmtp", c.Id,
            $"{quem.Nome} configurou o SMTP ({c.Host}:{c.Porta}, {(c.Ativo ? "ativo" : "desligado")}{(c.SomenteTeste ? ", modo piloto" : string.Empty)})");
        return Result.Success(Dto(c));
    }

    /// <summary>Manda um e-mail de teste (para o e-mail informado ou o de teste) e grava o resultado.</summary>
    public async Task<Result<string>> TestarAsync(string? para, CancellationToken ct = default)
    {
        var c = await configuracoes.GetByIdAsync(ConfiguracaoSmtp.IdPadrao);
        if (c is null || c.Host.Length == 0) return Result.Failure<string>("Configure e salve o SMTP antes de testar.");
        var destino = (para ?? string.Empty).Trim() is { Length: > 0 } p ? p : c.EmailTeste;
        if (!EmailValido(destino)) return Result.Failure<string>("Informe para qual e-mail mandar o teste.");
        var agora = relogio.GetLocalNow();
        var erro = await smtp.EnviarAsync(Servidor(c), new MensagemEmail(destino, "ELROND · teste do envio de e-mail",
            Html($"<p>Este é um e-mail de teste do ELROND, enviado em {agora:dd/MM/yyyy HH:mm}.</p><p>Se chegou, o SMTP está funcionando.</p>"),
            $"Este é um e-mail de teste do ELROND, enviado em {agora:dd/MM/yyyy HH:mm}. Se chegou, o SMTP está funcionando."), ct);
        c.TestadoEm = relogio.GetUtcNow().ToString("o");
        c.TesteOk = erro is null;
        await configuracoes.UpdateAsync(c.Id, c);
        await Registrar(destino, destino, "ELROND · teste do envio de e-mail", "teste", string.Empty, erro is null ? "enviado" : "falhou", erro);
        return erro is null ? Result.Success($"E-mail de teste enviado para {destino}.") : Result.Failure<string>($"Não foi possível enviar: {erro}");
    }

    /// <summary>
    /// Envio do sistema. SMTP desligado: registra como "desligado" e devolve a falha (quem chamou segue).
    /// Modo piloto: vai para o e-mail de teste, com o destinatário real no assunto.
    /// </summary>
    public async Task<Result<string>> EnviarAsync(string para, string assunto, string corpoHtml, string corpoTexto, string origem, string origemId, CancellationToken ct = default) =>
        await EnviarAsync(para, assunto, corpoHtml, corpoTexto, origem, origemId, anexos: null, layoutProprio: false, ct);

    /// <summary>
    /// Envio com anexos (PDF, imagem embutida). <paramref name="layoutProprio"/>: o HTML já vem montado
    /// (cabeçalho e rodapé próprios), sem a moldura simples padrão.
    /// </summary>
    public async Task<Result<string>> EnviarAsync(string para, string assunto, string corpoHtml, string corpoTexto, string origem, string origemId,
        IReadOnlyList<AnexoEmail>? anexos, bool layoutProprio, CancellationToken ct = default) =>
        await EnviarAsync(para, assunto, corpoHtml, corpoTexto, origem, origemId, anexos, layoutProprio, copia: null, ct);

    /// <summary>Com <paramref name="copia"/> em Cc (no modo piloto a cópia não sai: só o e-mail de teste recebe).</summary>
    public async Task<Result<string>> EnviarAsync(string para, string assunto, string corpoHtml, string corpoTexto, string origem, string origemId,
        IReadOnlyList<AnexoEmail>? anexos, bool layoutProprio, string? copia, CancellationToken ct = default)
    {
        var c = await configuracoes.GetByIdAsync(ConfiguracaoSmtp.IdPadrao);
        if (c is null || !c.Ativo || c.Host.Length == 0)
        {
            await Registrar(para, string.Empty, assunto, origem, origemId, "desligado", "SMTP não configurado ou desligado.");
            return Result.Failure<string>("O envio de e-mail está desligado (Administrativo › Integração SMTP).");
        }
        var destino = c.SomenteTeste ? c.EmailTeste : para;
        var titulo = c.SomenteTeste ? $"[TESTE · para {(para.Length > 0 ? para : "sem e-mail")}] {assunto}" : assunto;
        if (!EmailValido(destino))
        {
            await Registrar(para, destino, assunto, origem, origemId, "falhou", "Destinatário sem e-mail válido.");
            return Result.Failure<string>("O destinatário não tem e-mail válido no cadastro.");
        }
        var cc = !c.SomenteTeste && EmailValido(copia) && !string.Equals(copia!.Trim(), destino, StringComparison.OrdinalIgnoreCase) ? copia.Trim() : null;
        var erro = await smtp.EnviarAsync(Servidor(c), new MensagemEmail(destino, titulo, layoutProprio ? corpoHtml : Html(corpoHtml), corpoTexto, anexos, cc), ct);
        await Registrar(para, destino, titulo, origem, origemId, erro is null ? "enviado" : "falhou", erro);
        return erro is null ? Result.Success(destino) : Result.Failure<string>(erro);
    }

    private ServidorSmtp Servidor(ConfiguracaoSmtp c) =>
        new(c.Host, c.Porta, c.Seguranca, c.Usuario, cofre.Configurado ? cofre.Abrir(Contexto, c.SenhaCifrada) : string.Empty,
            c.RemetenteNome.Length > 0 ? c.RemetenteNome : "ELROND", c.RemetenteEmail, c.ResponderPara);

    private async Task Registrar(string para, string enviadoPara, string assunto, string origem, string origemId, string situacao, string? erro) =>
        await enviados.AddAsync(new EmailEnviado
        {
            Id = Guid.NewGuid().ToString(), Em = relogio.GetUtcNow().ToString("o"), Para = para, EnviadoPara = enviadoPara,
            Assunto = assunto.Length > 300 ? assunto[..300] : assunto, Origem = origem, OrigemId = origemId, Situacao = situacao,
            Erro = erro is { Length: > 500 } e ? e[..500] : erro ?? string.Empty,
        });

    /// <summary>Moldura simples do e-mail (o conteúdo vem de quem envia).</summary>
    private static string Html(string conteudo) =>
        $"""<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1f2a24;line-height:1.5;max-width:560px">{conteudo}<p style="color:#8a978f;font-size:12px;margin-top:24px">Mensagem automática do ELROND.</p></div>""";

    public static bool EmailValido(string? s)
    {
        if (string.IsNullOrWhiteSpace(s)) return false;
        try { return new MailAddress(s.Trim()).Address == s.Trim(); }
        catch (FormatException) { return false; }
    }

    private static SmtpDto Dto(ConfiguracaoSmtp c) =>
        new(c.Host, c.Porta, c.Seguranca, c.Usuario, c.SenhaCifrada.Length > 0, c.RemetenteNome, c.RemetenteEmail, c.ResponderPara,
            c.EmailTeste, c.SomenteTeste, c.Ativo, c.TestadoEm, c.TesteOk, c.AlteradoEm, c.AlteradoPor);
}

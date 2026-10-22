using System.Globalization;
using System.Net;
using System.Security.Cryptography;
using System.Text;
using Elrond.Application.Common;
using Elrond.Application.DTOs;
using Elrond.Application.Interfaces;
using Elrond.Domain.Entities;

namespace Elrond.Application.Services;

public sealed record ConviteAbertoDto(string Nome, string Email);

/// <summary>
/// Convite por e-mail: o gestor cadastra o funcionário (com as permissões) e o ELROND manda um link
/// pelo SMTP do sistema; a pessoa cria a própria senha e entra. O token só existe no e-mail (o banco
/// guarda o SHA-256), vale 7 dias e um reenvio invalida o anterior. A tela mostra: enviado, clicou, ativo.
/// </summary>
public sealed class ConviteService(IUsuarioRepository usuarios, IPasswordHasher hasher, EmailService email, IAuditoriaService auditoria, TimeProvider relogio)
{
    public static readonly TimeSpan Validade = TimeSpan.FromDays(7);
    public const int SenhaMinima = 8;
    private static readonly CultureInfo PtBr = CultureInfo.GetCultureInfo("pt-BR");

    public static string Hash(string token) => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(token))).ToLowerInvariant();

    private static string NovoToken() => Convert.ToBase64String(RandomNumberGenerator.GetBytes(32)).TrimEnd('=').Replace('+', '-').Replace('/', '_');

    /// <summary>Senha inútil para quem ainda não aceitou o convite (ninguém a conhece).</summary>
    public static string SenhaDeQuemFoiConvidado() => NovoToken() + NovoToken();

    /// <summary>Endereço do ELROND que vai no link: só http(s) e sem caminho (vem da tela que mandou).</summary>
    public static string? Base(string? urlBase)
    {
        if (!Uri.TryCreate(urlBase, UriKind.Absolute, out var u) || (u.Scheme != Uri.UriSchemeHttps && u.Scheme != Uri.UriSchemeHttp)) return null;
        return $"{u.Scheme}://{u.Authority}";
    }

    /// <summary>Gera o link novo e manda o e-mail. O convite fica aberto mesmo se o e-mail falhar (dá para reenviar).</summary>
    public async Task<Result<User>> EnviarAsync(User u, string? urlBase, UsuarioAtual quem, CancellationToken ct = default)
    {
        var baseUrl = Base(urlBase);
        if (baseUrl is null) return Result.Failure<User>("Endereço do sistema inválido para o link do convite.");
        if (!u.Ativo) return Result.Failure<User>("Funcionário inativo: ative o cadastro antes de convidar.");
        if (u.ConviteAceitoEm is not null && u.ConviteTokenHash.Length == 0)
            return Result.Failure<User>("Este funcionário já aceitou o convite e tem senha. Para trocar a senha, edite o cadastro.");

        var agora = relogio.GetUtcNow().UtcDateTime;
        var token = NovoToken();
        var expira = agora + Validade;
        u.AbrirConvite(Hash(token), expira);
        await usuarios.SaveAsync();

        var link = $"{baseUrl}/convite/{token}";
        var ate = TimeZoneInfo.ConvertTimeFromUtc(expira, Fuso()).ToString("dd/MM/yyyy", PtBr);
        var nome = WebUtility.HtmlEncode(u.Name);
        var quemConvidou = WebUtility.HtmlEncode(quem.Nome);
        var html =
            $"<p>Olá, {nome}.</p>" +
            $"<p>{quemConvidou} cadastrou você no <b>ELROND</b>. Para entrar, crie a sua senha pelo botão abaixo:</p>" +
            $"<p><a href=\"{link}\" style=\"display:inline-block;background:#1a4d1e;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:600\">Criar minha senha</a></p>" +
            $"<p style=\"color:#6b7b72;font-size:13px\">O link vale até {ate}. Se o botão não abrir, copie este endereço no navegador:<br/>{link}</p>" +
            "<p style=\"color:#6b7b72;font-size:13px\">Se você não esperava este convite, ignore este e-mail.</p>";
        var texto = $"Olá, {u.Name}. {quem.Nome} cadastrou você no ELROND. Crie a sua senha por este link (vale até {ate}): {link}";
        var r = await email.EnviarAsync(u.Email, "Convite para acessar o ELROND", html, texto, "convite", u.Id.ToString(), ct);
        u.RegistrarEnvioConvite(r.IsSuccess ? "enviado" : $"não enviado: {r.Error}", agora);
        await usuarios.SaveAsync();
        await auditoria.RegistrarAsync("convite", "Usuario", u.Id.ToString(),
            $"{quem.Nome} convidou \"{u.Name}\" ({u.Email}) por e-mail: {(r.IsSuccess ? "enviado" : $"não enviado ({r.Error})")}");
        return r.IsSuccess ? Result.Success(u) : Result.Failure<User>($"O convite foi gerado, mas o e-mail não saiu: {r.Error}");
    }

    private async Task<User?> DoTokenAsync(string token)
    {
        if (string.IsNullOrWhiteSpace(token) || token.Length > 100) return null;
        var hash = Hash(token.Trim());
        return (await usuarios.GetAllAsync()).FirstOrDefault(u => u.ConviteTokenHash.Length > 0 && u.ConviteTokenHash == hash);
    }

    private bool Valido(User u) => u.Ativo && u.ConviteExpiraEm is { } e && e > relogio.GetUtcNow().UtcDateTime;

    /// <summary>A pessoa abriu o link: registra o clique e devolve quem é (para a tela de criar senha).</summary>
    public async Task<Result<ConviteAbertoDto>> AbrirAsync(string token)
    {
        var u = await DoTokenAsync(token);
        if (u is null) return Result.Failure<ConviteAbertoDto>("Convite não encontrado: ele pode ter sido reenviado (vale só o último) ou já usado.");
        if (!Valido(u)) return Result.Failure<ConviteAbertoDto>("Este convite expirou. Peça ao gestor para reenviar.");
        if (u.ConviteClicadoEm is null)
        {
            u.RegistrarCliqueConvite(relogio.GetUtcNow().UtcDateTime);
            await usuarios.SaveAsync();
        }
        return Result.Success(new ConviteAbertoDto(u.Name, u.Email));
    }

    /// <summary>A pessoa criou a senha: grava, fecha o convite e devolve o e-mail (a tela já entra com ele).</summary>
    public async Task<Result<string>> AceitarAsync(string token, string? senha)
    {
        var u = await DoTokenAsync(token);
        if (u is null) return Result.Failure<string>("Convite não encontrado: ele pode ter sido reenviado (vale só o último) ou já usado.");
        if (!Valido(u)) return Result.Failure<string>("Este convite expirou. Peça ao gestor para reenviar.");
        if (string.IsNullOrWhiteSpace(senha) || senha.Length < SenhaMinima) return Result.Failure<string>($"A senha precisa ter ao menos {SenhaMinima} caracteres.");
        var agora = relogio.GetUtcNow().UtcDateTime;
        u.RegistrarCliqueConvite(agora);
        u.AceitarConvite(hasher.Hash(senha), agora);
        await usuarios.SaveAsync();
        await auditoria.RegistrarAsync("convite", "Usuario", u.Id.ToString(), $"\"{u.Name}\" aceitou o convite e criou a senha");
        return Result.Success(u.Email);
    }

    /// <summary>Situação do convite para a lista: "" (sem convite), enviado, nao-enviado, clicou, aceito, expirado.</summary>
    public static string Situacao(User u, DateTime agoraUtc) =>
        u.ConviteAceitoEm is not null ? "aceito"
        : u.ConviteTokenHash.Length == 0 ? string.Empty
        : u.ConviteExpiraEm is { } e && e <= agoraUtc ? "expirado"
        : u.ConviteClicadoEm is not null ? "clicou"
        : u.ConviteEmail.StartsWith("enviado", StringComparison.Ordinal) ? "enviado"
        : "nao-enviado";

    private static TimeZoneInfo Fuso()
    {
        try { return TimeZoneInfo.FindSystemTimeZoneById("America/Sao_Paulo"); }
        catch (TimeZoneNotFoundException) { return TimeZoneInfo.FindSystemTimeZoneById("E. South America Standard Time"); }
    }
}

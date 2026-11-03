using System.Collections.Concurrent;
using System.Security.Cryptography;
using Elrond.Domain.Regras;

namespace Elrond.Application.Services;

/// <summary>Uma leitura aberta: quem pediu, até quando vale e o código que o celular mandou.</summary>
public sealed record SessaoLeituraBoleto(string Token, string UsuarioId, DateTimeOffset ExpiraEm, string Codigo = "", DateTimeOffset? LidoEm = null);

/// <summary>O que a tela do computador recebe: o código lido (vazio = ainda não) e se a sessão ainda vale.</summary>
public sealed record SituacaoLeituraBoleto(bool Valida, string Codigo, string ExpiraEm);

/// <summary>
/// "Ler boleto em outro dispositivo": a tela do computador abre uma sessão e mostra um QR com o link; o celular
/// (sem login) abre o link, lê o código de barras com a câmera e manda só os dígitos. A sessão vale 10 minutos,
/// tem token aleatório, aceita um código válido de boleto e é de uso único: quando o computador pega o código, ela
/// acaba. Fica na memória do servidor (nada vai para o banco).
/// </summary>
public sealed class LeituraBoletoService(TimeProvider relogio)
{
    public static readonly TimeSpan Validade = TimeSpan.FromMinutes(10);
    private readonly ConcurrentDictionary<string, SessaoLeituraBoleto> _sessoes = new();

    public SessaoLeituraBoleto Abrir(string usuarioId)
    {
        Limpar();
        var token = Convert.ToHexString(RandomNumberGenerator.GetBytes(24)).ToLowerInvariant();
        var s = new SessaoLeituraBoleto(token, usuarioId, relogio.GetUtcNow() + Validade);
        _sessoes[token] = s;
        return s;
    }

    /// <summary>Pergunta da tela do computador: só quem abriu vê; pegou o código = a sessão acaba.</summary>
    public SituacaoLeituraBoleto? Consultar(string token, string usuarioId)
    {
        if (!_sessoes.TryGetValue(token ?? string.Empty, out var s) || s.UsuarioId != usuarioId) return null;
        if (s.ExpiraEm < relogio.GetUtcNow()) { _sessoes.TryRemove(token!, out _); return new SituacaoLeituraBoleto(false, string.Empty, s.ExpiraEm.ToString("o")); }
        if (s.Codigo.Length > 0) _sessoes.TryRemove(token!, out _);
        return new SituacaoLeituraBoleto(true, s.Codigo, s.ExpiraEm.ToString("o"));
    }

    /// <summary>O link do celular ainda vale (a página mostra "expirou" sem câmera).</summary>
    public bool Valida(string token) =>
        _sessoes.TryGetValue(token ?? string.Empty, out var s) && s.ExpiraEm >= relogio.GetUtcNow() && s.Codigo.Length == 0;

    /// <summary>O celular manda o que leu: só aceita um código de boleto válido, uma vez.</summary>
    public (CodigoBoleto? Codigo, string Erro) Registrar(string token, string texto)
    {
        if (!_sessoes.TryGetValue(token ?? string.Empty, out var s) || s.ExpiraEm < relogio.GetUtcNow())
            return (null, "Este link expirou. Gere outro no computador.");
        if (s.Codigo.Length > 0) return (null, "Este link já foi usado.");
        var (codigo, erro) = CodigoBoleto.Ler(texto, DateOnly.FromDateTime(relogio.GetLocalNow().DateTime));
        if (codigo is null) return (null, erro);
        _sessoes[token!] = s with { Codigo = codigo.Digitos, LidoEm = relogio.GetUtcNow() };
        return (codigo, string.Empty);
    }

    private void Limpar()
    {
        var agora = relogio.GetUtcNow();
        foreach (var (k, v) in _sessoes) if (v.ExpiraEm.AddMinutes(5) < agora) _sessoes.TryRemove(k, out _);
    }
}

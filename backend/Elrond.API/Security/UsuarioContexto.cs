using System.Security.Claims;
using Elrond.Application.Common;
using Elrond.Application.DTOs;
using Elrond.Application.Interfaces;
using Elrond.Domain.Entities;

namespace Elrond.API.Security;

/// <summary>
/// Usuário da requisição atual, lido do BANCO uma vez por requisição (não do token):
/// perfil rebaixado, permissão retirada ou cadastro desativado valem na hora, sem
/// esperar o token expirar. Scoped. Também é o <see cref="IUsuarioAtualProvider"/> da
/// camada de aplicação (auditoria, carteira).
/// </summary>
public sealed class UsuarioContexto : IUsuarioAtualProvider
{
    private readonly IHttpContextAccessor _http;
    private readonly IUserRepository _users;
    private User? _user;
    private bool _carregado;

    public UsuarioContexto(IHttpContextAccessor http, IUserRepository users)
    {
        _http = http;
        _users = users;
    }

    /// <summary>Usuário do banco correspondente ao token; null se não autenticado, inexistente ou inativo.</summary>
    public async Task<User?> AtualAsync()
    {
        if (_carregado) return _user;
        _carregado = true;
        var email = _http.HttpContext?.User.FindFirstValue(ClaimTypes.Email);
        if (string.IsNullOrEmpty(email)) return null;
        var u = await _users.FindByEmailAsync(email);
        _user = u is { Ativo: true } ? u : null;
        return _user;
    }

    /// <summary>Gestor ou Admin (o Admin tem tudo o que o gestor tem).</summary>
    public async Task<bool> EhGestorAsync() => Perfis.TemPoderDeGestor((await AtualAsync())?.Perfil);

    /// <summary>Admin: a nossa equipe.</summary>
    public async Task<bool> EhAdminAsync() => (await AtualAsync())?.Perfil == Perfis.Admin;

    /// <summary>Tem a funcionalidade (comum ou especial), pelas permissões efetivas do banco.</summary>
    public async Task<bool> PodeAsync(string chave)
    {
        var u = await AtualAsync();
        return u is not null && Funcionalidades.Efetivas(u.Perfil, u.Permissoes).Contains(chave);
    }

    /// <summary>Identidade para os serviços de aplicação (id, nome, perfil e se aprova propostas).</summary>
    public async Task<UsuarioAtual> QuemAsync()
    {
        var u = await AtualAsync();
        if (u is null) return new UsuarioAtual(string.Empty, string.Empty, string.Empty);
        var podeAprovar = Funcionalidades.Efetivas(u.Perfil, u.Permissoes).Contains("/propostas/aprovar");
        return new UsuarioAtual(u.Id.ToString(), u.Name, u.Perfil, podeAprovar);
    }

    /// <summary>IP de origem (UseForwardedHeaders já traduziu o X-Forwarded-For).</summary>
    public string Ip => _http.HttpContext?.Connection.RemoteIpAddress?.ToString() ?? string.Empty;
}

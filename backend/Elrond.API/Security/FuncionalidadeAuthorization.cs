using System.Security.Claims;
using Elrond.Application.Common;
using Elrond.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.Extensions.Options;

namespace Elrond.API.Security;

/// <summary>
/// Autorização por funcionalidade (RBAC) nos endpoints: `[Authorize(Policy = "func:/rota")]`.
/// A permissão é conferida AO VIVO no banco (não no token), então ligar uma permissão
/// no cadastro do funcionário vale na hora, sem novo login.
/// </summary>
public static class FuncionalidadePolicy
{
    public const string Prefixo = "func:";
    public static string Para(string chave) => Prefixo + chave;
}

public sealed class FuncionalidadeRequirement(string chave) : IAuthorizationRequirement
{
    public string Chave { get; } = chave;
}

public sealed class FuncionalidadeHandler(IUserRepository users) : AuthorizationHandler<FuncionalidadeRequirement>
{
    protected override async Task HandleRequirementAsync(AuthorizationHandlerContext context, FuncionalidadeRequirement requirement)
    {
        var email = context.User.FindFirstValue(ClaimTypes.Email);
        if (string.IsNullOrEmpty(email)) return;

        var user = await users.FindByEmailAsync(email);
        if (user is null || !user.Ativo) return;

        if (Funcionalidades.Efetivas(user.Perfil, user.Permissoes).Contains(requirement.Chave))
            context.Succeed(requirement);
    }
}

/// <summary>Cria a policy "func:/rota" sob demanda, sem precisar registrar uma por uma.</summary>
public sealed class FuncionalidadePolicyProvider(IOptions<AuthorizationOptions> options) : IAuthorizationPolicyProvider
{
    private readonly DefaultAuthorizationPolicyProvider _padrao = new(options);

    public Task<AuthorizationPolicy?> GetPolicyAsync(string policyName)
    {
        if (!policyName.StartsWith(FuncionalidadePolicy.Prefixo, StringComparison.Ordinal))
            return _padrao.GetPolicyAsync(policyName);

        var chave = policyName[FuncionalidadePolicy.Prefixo.Length..];
        var policy = new AuthorizationPolicyBuilder()
            .RequireAuthenticatedUser()
            .AddRequirements(new FuncionalidadeRequirement(chave))
            .Build();
        return Task.FromResult<AuthorizationPolicy?>(policy);
    }

    public Task<AuthorizationPolicy> GetDefaultPolicyAsync() => _padrao.GetDefaultPolicyAsync();
    public Task<AuthorizationPolicy?> GetFallbackPolicyAsync() => _padrao.GetFallbackPolicyAsync();
}

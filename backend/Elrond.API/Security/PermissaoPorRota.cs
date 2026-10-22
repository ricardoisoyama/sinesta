using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc.Filters;

namespace Elrond.API.Security;

/// <summary>
/// Permissão por funcionalidade nas ESCRITAS (POST/PUT/PATCH/DELETE):
/// quem não tem a tela liberada não grava nela, mesmo chamando a API direto.
/// As leituras (GET) continuam só com login, porque outras telas consomem as listas
/// (a Precificação lê clientes, serviços e tipos de custo, por exemplo).
/// Escrita em rota que NÃO está no mapa é negada (fail closed): um controller novo
/// precisa ser mapeado aqui, ou cuidar da própria permissão e entrar em <see cref="CuidamDaPropriaPermissao"/>.
/// </summary>
public sealed class PermissaoPorRotaFilter : IAsyncAuthorizationFilter
{
    /// <summary>Prefixo da rota da API → chave da funcionalidade (a mesma do menu).</summary>
    private static readonly (string Rota, string Chave)[] Mapa =
    {
        ("api/clientes", "/cadastros/clientes"),
        ("api/fornecedores", "/cadastros/fornecedores"),
        ("api/vendedores", "/cadastros/vendedores"),
        ("api/servicos", "/cadastros/servicos"),
        ("api/tipos-custo", "/cadastros/tipos-custo"),
        ("api/veiculos", "/cadastros/veiculos"),
        ("api/motoristas", "/cadastros/motoristas"),
        ("api/categorias-custo", "/cadastros/categorias"),
        ("api/plano-contas", "/cadastros/plano-contas"),
        ("api/taxas", "/cadastros/taxas"),
        ("api/aliquotas-icms", "/cadastros/icms"),
        ("api/apolices", "/cadastros/apolices"),
        ("api/empresas", "/cadastros/unidades"),
        ("api/custos-fixos", "/cadastros/custos-fixos"),
        ("api/regras-aprovacao", "/cadastros/aprovadores"),
        ("api/validades-proposta", "/cadastros/validades"),
        ("api/modelos-proposta", "/cadastros/modelos-proposta"),
        ("api/funis", "/cadastros/funis"),
        ("api/oportunidades", "/crm"),
        ("api/compromissos", "/agenda"),
        ("api/integracoes/google", "/agenda"),
        ("api/metas", "/analises/metas"),
        ("api/usuarios", "/cadastros/usuarios"),
        ("api/propostas", "/propostas"),
        ("api/pricing", "/simulador"),
        ("api/auditoria", "/cadastros/auditoria"),
        ("api/campos-operacao", "/cadastros/campos-operacao"),
        ("api/financeiro/carteiras", "/financeiro/caixa"),
        ("api/financeiro/movimentos", "/financeiro/entradas-saidas"),
        ("api/financeiro/conciliacao", "/financeiro/conciliacao"),
        ("api/financeiro/regras-conciliacao", "/financeiro/conciliacao"),
        ("api/fichas-tecnicas", "/cadastros/fichas-tecnicas"),
        ("api/modelos-contrato", "/cadastros/modelos-contrato"),
        ("api/contratos", "/contratos"),
        ("api/faturas", "/financeiro/faturamento"),
        ("api/faturamento-pendente", "/financeiro/faturamento"),
        ("api/cenarios-projecao", "/analises/projecao"),
    };

    /// <summary>Rotas cujo controller confere a permissão por conta própria (depende de dado da requisição).</summary>
    private static readonly string[] CuidamDaPropriaPermissao =
    {
        "api/anexos",   // permissão depende da entidade (cliente/fornecedor) do anexo
        "api/auth",     // login é anônimo; o resto é GET
        "api/pricing/fator", // só calcula (não grava): a tela da empresa usa sem ter o Pricing
    };

    private static readonly HashSet<string> MetodosDeEscrita = new(StringComparer.OrdinalIgnoreCase)
    {
        "POST", "PUT", "PATCH", "DELETE",
    };

    private readonly IAuthorizationService _auth;

    public PermissaoPorRotaFilter(IAuthorizationService auth) => _auth = auth;

    private static bool Casa(string caminho, string rota) =>
        caminho.Equals(rota, StringComparison.OrdinalIgnoreCase)
        || caminho.StartsWith(rota + "/", StringComparison.OrdinalIgnoreCase);

    public async Task OnAuthorizationAsync(AuthorizationFilterContext context)
    {
        var http = context.HttpContext;
        if (!MetodosDeEscrita.Contains(http.Request.Method)) return;
        // Endpoints com policy própria (ex.: aprovar, transferir carteira) já se defendem.
        if (context.ActionDescriptor.EndpointMetadata.OfType<AuthorizeAttribute>().Any(a => !string.IsNullOrEmpty(a.Policy))) return;
        if (context.ActionDescriptor.EndpointMetadata.OfType<AllowAnonymousAttribute>().Any()) return;

        var caminho = (http.Request.Path.Value ?? string.Empty).Trim('/');
        if (CuidamDaPropriaPermissao.Any(r => Casa(caminho, r))) return;

        if (http.User.Identity?.IsAuthenticated != true)
        {
            context.Result = new Microsoft.AspNetCore.Mvc.UnauthorizedResult();
            return;
        }

        var chave = Mapa.FirstOrDefault(m => Casa(caminho, m.Rota)).Chave;
        if (chave is null)
        {
            // Rota de escrita sem mapeamento: nega em vez de deixar passar.
            context.Result = new Microsoft.AspNetCore.Mvc.ObjectResult("Rota sem permissão mapeada.")
            {
                StatusCode = StatusCodes.Status403Forbidden,
            };
            return;
        }

        var r = await _auth.AuthorizeAsync(http.User, null, FuncionalidadePolicy.Para(chave));
        if (!r.Succeeded)
            context.Result = new Microsoft.AspNetCore.Mvc.ObjectResult("Você não tem permissão para alterar este cadastro.")
            {
                StatusCode = StatusCodes.Status403Forbidden,
            };
    }
}

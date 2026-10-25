using System.Reflection;
using Elrond.API.Security;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Routing;

namespace Elrond.Tests;

/// <summary>
/// Toda rota de gravação (POST/PUT/PATCH/DELETE) precisa de dono: uma policy própria, ser anônima, cuidar
/// da própria permissão ou estar no mapa do <see cref="PermissaoPorRotaFilter"/>. Rota nova esquecida no
/// mapa é negada em produção ("Rota sem permissão mapeada."); este teste pega antes.
/// </summary>
public class PermissaoPorRotaTests
{
    private static string[] Lista(string campo) =>
        ((System.Collections.IEnumerable)typeof(PermissaoPorRotaFilter).GetField(campo, BindingFlags.NonPublic | BindingFlags.Static)!.GetValue(null)!)
        .Cast<object>()
        .Select(x => x is string s ? s : (string)x.GetType().GetField("Item1")!.GetValue(x)!)
        .ToArray();

    private static bool Casa(string caminho, string rota) =>
        caminho.Equals(rota, StringComparison.OrdinalIgnoreCase) || caminho.StartsWith(rota + "/", StringComparison.OrdinalIgnoreCase);

    [Fact]
    public void Toda_rota_de_gravacao_tem_permissao()
    {
        var mapa = Lista("Mapa");
        var proprias = Lista("CuidamDaPropriaPermissao");
        var semDono = new List<string>();
        var controllers = typeof(PermissaoPorRotaFilter).Assembly.GetTypes()
            .Where(t => typeof(ControllerBase).IsAssignableFrom(t) && !t.IsAbstract);
        foreach (var c in controllers)
        {
            var rotaClasse = c.GetCustomAttributes<RouteAttribute>(true).FirstOrDefault()?.Template ?? string.Empty;
            var policyClasse = c.GetCustomAttributes<AuthorizeAttribute>(true).Any(a => !string.IsNullOrEmpty(a.Policy));
            foreach (var m in c.GetMethods(BindingFlags.Public | BindingFlags.Instance))
            {
                var verbos = m.GetCustomAttributes<HttpMethodAttribute>(true)
                    .Where(h => h.HttpMethods.Any(v => v is "POST" or "PUT" or "PATCH" or "DELETE")).ToList();
                if (verbos.Count == 0) continue;
                if (policyClasse || m.GetCustomAttributes<AuthorizeAttribute>(true).Any(a => !string.IsNullOrEmpty(a.Policy))) continue;
                if (m.GetCustomAttributes<AllowAnonymousAttribute>(true).Any() || c.GetCustomAttributes<AllowAnonymousAttribute>(true).Any()) continue;
                foreach (var v in verbos)
                {
                    var caminho = string.Join('/', new[] { rotaClasse, v.Template ?? string.Empty }.Where(x => x.Length > 0)).Trim('/');
                    if (proprias.Any(r => Casa(caminho, r)) || mapa.Any(r => Casa(caminho, r))) continue;
                    semDono.Add($"{string.Join(",", v.HttpMethods)} {caminho} ({c.Name}.{m.Name})");
                }
            }
        }
        Assert.True(semDono.Count == 0, "Rotas de gravação sem permissão mapeada:\n" + string.Join("\n", semDono));
    }
}

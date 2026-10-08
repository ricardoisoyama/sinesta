using Elrond.Application.Interfaces;
using Elrond.Domain.Entities;
using Elrond.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace Elrond.Infrastructure.Services;

/// <summary>
/// Grava os erros em <c>registro_erros</c> num escopo próprio (não mistura com o DbContext da
/// requisição) e em segundo plano. Guarda 90 dias: uma vez por dia apaga os mais antigos.
/// </summary>
public sealed class RegistroErros(IServiceScopeFactory escopos, ILogger<RegistroErros> log) : IRegistroErros
{
    private const int DiasGuardados = 90;
    private static DateOnly _ultimaLimpeza;

    public void Registrar(string tipo, string metodo, string rota, int status, string mensagem, string detalhe, string usuario, string rastreio)
    {
        var registro = new RegistroErro
        {
            Em = DateTime.UtcNow,
            Tipo = Cortar(tipo, 20),
            Metodo = Cortar(metodo, 10),
            Rota = Cortar(rota, 300),
            Status = status,
            Mensagem = Cortar(mensagem, 1000),
            Detalhe = Cortar(detalhe, 4000),
            Usuario = Cortar(usuario, 200),
            Rastreio = Cortar(rastreio, 100),
        };
        _ = Task.Run(async () =>
        {
            try
            {
                using var escopo = escopos.CreateScope();
                var db = escopo.ServiceProvider.GetRequiredService<AppDbContext>();
                db.RegistrosErro.Add(registro);
                await db.SaveChangesAsync();
                var hoje = DateOnly.FromDateTime(DateTime.UtcNow);
                if (_ultimaLimpeza != hoje)
                {
                    _ultimaLimpeza = hoje;
                    var limite = DateTime.UtcNow.AddDays(-DiasGuardados);
                    await db.RegistrosErro.Where(r => r.Em < limite).ExecuteDeleteAsync();
                }
            }
            catch (Exception e)
            {
                // O registro é ajuda de diagnóstico: se falhar, fica só no log do container.
                log.LogWarning(e, "Não foi possível guardar o registro de erro de {Rota}", registro.Rota);
            }
        });
    }

    private static string Cortar(string? s, int max) => string.IsNullOrEmpty(s) ? string.Empty : s.Length <= max ? s : s[..max];
}

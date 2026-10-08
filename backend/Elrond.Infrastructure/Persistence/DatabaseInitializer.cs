using System.Security.Cryptography;
using Elrond.Application.Interfaces;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace Elrond.Infrastructure.Persistence;

/// <summary>Aplica migrations pendentes e semeia dados iniciais no startup.</summary>
public static class DatabaseInitializer
{
    public static async Task InitializeAsync(IServiceProvider services)
    {
        using var scope = services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var hasher = scope.ServiceProvider.GetRequiredService<IPasswordHasher>();
        var config = scope.ServiceProvider.GetRequiredService<IConfiguration>();
        var log = scope.ServiceProvider.GetRequiredService<ILoggerFactory>().CreateLogger("Elrond.Seed");

        // SEED_DEMO=false → só o admin, sem cadastros (sistema do zero p/ o cliente).
        var demo = config.GetValue("SEED_DEMO", false);

        await db.Database.MigrateAsync();

        // Senha inicial do admin: em demo é a conhecida; fora dela vem de Seed:AdminSenha
        // (env Seed__AdminSenha) ou é gerada e mostrada UMA vez no log do container.
        var adminSenha = config["Seed:AdminSenha"];
        var gerada = false;
        if (string.IsNullOrWhiteSpace(adminSenha))
        {
            if (demo) adminSenha = DbSeeder.SenhaDemo;
            else
            {
                adminSenha = SenhaAleatoria();
                gerada = true;
            }
        }

        // E-mail do admin inicial: Seed:AdminEmail (env Seed__AdminEmail); sem ele, o padrão.
        // Só vale na primeira subida (banco sem usuários).
        var adminEmail = config["Seed:AdminEmail"];
        if (string.IsNullOrWhiteSpace(adminEmail)) adminEmail = DbSeeder.AdminEmail;
        adminEmail = adminEmail.Trim().ToLowerInvariant();

        var semUsuarios = !await db.Users.AnyAsync();
        await DbSeeder.SeedAsync(db, hasher, demo, adminSenha, adminEmail);
        if (semUsuarios && gerada)
            log.LogWarning("Admin criado ({Email}) com senha inicial gerada: {Senha} — troque no primeiro acesso.",
                adminEmail, adminSenha);

        await CadastrosSeeder.SeedAsync(db, demo);
        // Municípios (IBGE) são dado de referência: semeia mesmo no modo cliente.
        await CidadesSeeder.SeedAsync(db);
    }

    private static string SenhaAleatoria()
    {
        const string alfabeto = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
        return string.Create(16, alfabeto, (span, a) =>
        {
            for (var i = 0; i < span.Length; i++) span[i] = a[RandomNumberGenerator.GetInt32(a.Length)];
        });
    }
}

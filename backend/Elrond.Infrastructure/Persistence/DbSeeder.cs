using Elrond.Application.Common;
using Elrond.Application.Interfaces;
using Elrond.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Elrond.Infrastructure.Persistence;

/// <summary>Semeia os usuários iniciais se a base estiver vazia.</summary>
public static class DbSeeder
{
    /// <summary>E-mail do admin inicial quando o ambiente não define outro (Seed:AdminEmail).</summary>
    public const string AdminEmail = "admin@elrond.com.br";
    /// <summary>Senha do admin em ambiente de desenvolvimento/demonstração.</summary>
    public const string SenhaDemo = "elrond@2024";

    /// <param name="demo">true = admin + usuários demo; false = só o admin (modo cliente).</param>
    /// <param name="adminSenha">Senha inicial do admin (produção: vinda do .env ou gerada).</param>
    /// <param name="adminEmail">E-mail do admin inicial (cada ambiente pode ter o seu).</param>
    public static async Task SeedAsync(AppDbContext db, IPasswordHasher hasher, bool demo, string adminSenha, string adminEmail = AdminEmail)
    {
        if (await db.Users.AnyAsync()) return;

        // O admin inicial é da nossa equipe (perfil Admin, "Suporte" para o cliente); o gestor do
        // cliente é cadastrado por ele na implantação.
        var usuarios = new List<User>
        {
            new(adminEmail, "Administrador",
                hasher.Hash(adminSenha), Perfis.Admin, Funcionalidades.Base),
        };

        if (demo)
        {
            usuarios.Add(new User("usuario@elrond.com.br", "Usuário",
                hasher.Hash("senha123"), "Colaborador", Funcionalidades.Preset("Colaborador")));
            usuarios.Add(new User("marina@sinesta.com.br", "Marina Alves",
                hasher.Hash("senha123"), "Colaborador",
                new[] { "/dashboard", "/simulador", "/propostas" }));
        }

        db.Users.AddRange(usuarios);
        await db.SaveChangesAsync();
    }
}

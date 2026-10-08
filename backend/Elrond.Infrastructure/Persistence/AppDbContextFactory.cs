using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace Elrond.Infrastructure.Persistence;

/// <summary>
/// Usado só em design-time pelo `dotnet ef` (migrations). Não afeta o runtime,
/// que configura o DbContext via DI (ver DependencyInjection).
/// </summary>
public sealed class AppDbContextFactory : IDesignTimeDbContextFactory<AppDbContext>
{
    public AppDbContext CreateDbContext(string[] args)
    {
        var conn = Environment.GetEnvironmentVariable("ELROND_DB")
            ?? "Host=localhost;Port=5432;Database=elrond;Username=elrond;Password=elrond";

        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseNpgsql(conn)
            .Options;

        return new AppDbContext(options);
    }
}

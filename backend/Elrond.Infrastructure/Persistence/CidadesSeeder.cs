using System.Text.Json;
using Elrond.Domain.Common;
using Elrond.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Elrond.Infrastructure.Persistence;

/// <summary>
/// Semeia a tabela de municípios a partir de `cidades.json` (lista oficial do IBGE,
/// embarcada no deploy). Dado de referência: roda SEMPRE que a tabela estiver vazia,
/// inclusive no modo cliente (SEED_DEMO=false).
/// </summary>
public static class CidadesSeeder
{
    private sealed class CidadeSeed
    {
        public string Id { get; set; } = string.Empty;
        public string Nome { get; set; } = string.Empty;
        public string Uf { get; set; } = string.Empty;
    }

    public static async Task SeedAsync(AppDbContext db)
    {
        if (await db.Cidades.AnyAsync()) return;

        var path = Path.Combine(AppContext.BaseDirectory, "cidades.json");
        if (!File.Exists(path)) return;

        var json = await File.ReadAllTextAsync(path);
        var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
        var seed = JsonSerializer.Deserialize<List<CidadeSeed>>(json, options);
        if (seed is null || seed.Count == 0) return;

        db.Cidades.AddRange(seed.Select(c => new Cidade
        {
            Id = c.Id,
            Nome = c.Nome,
            Uf = c.Uf,
            Busca = Textos.Normalizar(c.Nome),
        }));
        await db.SaveChangesAsync();
    }
}

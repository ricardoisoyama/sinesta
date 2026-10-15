using Elrond.Application.Interfaces;
using Elrond.Domain.Common;
using Elrond.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Elrond.Infrastructure.Repositories;

public class EfCrudRepository<T> : ICrudRepository<T> where T : class, IEntity
{
    private readonly AppDbContext _db;
    private readonly DbSet<T> _set;
    private readonly IUsuarioAtualProvider _usuario;

    public EfCrudRepository(AppDbContext db, IUsuarioAtualProvider usuario)
    {
        _db = db;
        _set = db.Set<T>();
        _usuario = usuario;
    }

    public async Task<List<T>> GetAllAsync() => await _set.AsNoTracking().ToListAsync();

    public async Task<List<T>> ListarAsync(System.Linq.Expressions.Expression<Func<T, bool>> filtro) =>
        await _set.AsNoTracking().Where(filtro).ToListAsync();

    public async Task SalvarLoteAsync(IReadOnlyList<T> novos, IReadOnlyList<T> alterados)
    {
        if (novos.Count == 0 && alterados.Count == 0) return;
        var ids = alterados.Select(a => a.Id).ToList();
        var existentes = ids.Count == 0 ? new List<T>() : await _set.Where(e => ids.Contains(e.Id)).ToListAsync();
        var porId = existentes.ToDictionary(e => e.Id);
        foreach (var n in novos) await CarimbarAsync(n, existente: null);
        foreach (var a in alterados) await CarimbarAsync(a, porId.GetValueOrDefault(a.Id));

        // Mesmo esquema do UpdateAsync (remove + reinsere), mas numa transação para o lote todo.
        var propria = _db.Database.CurrentTransaction is null;
        var tx = propria ? await _db.Database.BeginTransactionAsync() : null;
        try
        {
            if (existentes.Count > 0)
            {
                _set.RemoveRange(existentes);
                await _db.SaveChangesAsync();
            }
            _db.ChangeTracker.Clear();
            _set.AddRange(novos);
            _set.AddRange(alterados.Where(a => porId.ContainsKey(a.Id)));
            await _db.SaveChangesAsync();
            _db.ChangeTracker.Clear();
            if (tx is not null) await tx.CommitAsync();
        }
        finally
        {
            if (tx is not null) await tx.DisposeAsync();
        }
    }

    public async Task<T?> GetByIdAsync(string id) =>
        await _set.AsNoTracking().FirstOrDefaultAsync(e => e.Id == id);

    public async Task<T> AddAsync(T entity)
    {
        await CarimbarAsync(entity, existente: null);
        _set.Add(entity);
        await _db.SaveChangesAsync();
        return entity;
    }

    public async Task<List<T>> AddRangeAsync(List<T> entities)
    {
        foreach (var e in entities) await CarimbarAsync(e, existente: null);
        _set.AddRange(entities);
        await _db.SaveChangesAsync();
        return entities;
    }

    public async Task<T?> UpdateAsync(string id, T entity)
    {
        var existing = await _set.FindAsync(id);
        if (existing is null) return null;
        await CarimbarAsync(entity, existing);

        // Remove + reinsere com o mesmo id (numa transação). Isso contorna a limitação
        // do EF Core ao dar Update desanexado em coleções owned mapeadas para JSON
        // (ex.: Empresa.Icms, Proposta.Itens), cuja chave-sombra não é preservada.
        // Dentro de uma unidade de trabalho já aberta, usa a transação dela.
        var tx = _db.Database.CurrentTransaction is null ? await _db.Database.BeginTransactionAsync() : null;
        try
        {
            _set.Remove(existing);
            await _db.SaveChangesAsync();
            _db.ChangeTracker.Clear();

            entity.Id = id;
            _set.Add(entity);
            await _db.SaveChangesAsync();

            if (tx is not null) await tx.CommitAsync();
        }
        finally
        {
            if (tx is not null) await tx.DisposeAsync();
        }
        return entity;
    }

    public async Task<bool> DeleteAsync(string id)
    {
        var entity = await _set.FindAsync(id);
        if (entity is null) return false;
        _set.Remove(entity);
        await _db.SaveChangesAsync();
        return true;
    }

    /// <summary>
    /// Rastro (quem/quando): criação preservada do registro existente, alteração sempre
    /// renovada, inativação marcada quando o status vira "inativo" e limpa ao reativar.
    /// O que veio no payload para esses campos é ignorado.
    /// </summary>
    private async Task CarimbarAsync(T entity, T? existente)
    {
        // O número nunca muda: na alteração (remove + reinsere) vale o do registro existente, não o
        // do payload. Novo com 0: o banco gera pela sequência.
        if (entity is INumerado n && existente is INumerado e && e.Numero > 0) n.Numero = e.Numero;
        if (entity is not Rastreavel r) return;
        var quem = await _usuario.QuemAsync();
        var agora = DateTime.UtcNow.ToString("o");
        var nome = string.IsNullOrEmpty(quem.Nome) ? "sistema" : quem.Nome;

        var antes = existente as Rastreavel;
        r.CriadoEm = antes?.CriadoEm is { Length: > 0 } ce ? ce : agora;
        r.CriadoPor = antes?.CriadoPor is { Length: > 0 } cp ? cp : nome;
        r.AlteradoEm = agora;
        r.AlteradoPor = nome;

        if (entity is IInativavel atual)
        {
            var eraInativo = (existente as IInativavel)?.Status == "inativo";
            if (atual.Status == "inativo" && !eraInativo)
            {
                r.InativadoEm = agora;
                r.InativadoPor = nome;
            }
            else if (atual.Status == "inativo")
            {
                r.InativadoEm = antes?.InativadoEm ?? string.Empty;
                r.InativadoPor = antes?.InativadoPor ?? string.Empty;
            }
            else
            {
                r.InativadoEm = string.Empty;
                r.InativadoPor = string.Empty;
            }
        }
        else
        {
            r.InativadoEm = antes?.InativadoEm ?? string.Empty;
            r.InativadoPor = antes?.InativadoPor ?? string.Empty;
        }
    }
}

using Elrond.Application.Interfaces;
using Elrond.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Elrond.Infrastructure.Repositories;

/// <summary>Transação do Postgres em volta de várias gravações (os repositórios reaproveitam a aberta).</summary>
public class UnidadeTrabalho(AppDbContext db) : IUnidadeTrabalho
{
    public async Task ExecutarAsync(Func<Task> acao)
    {
        if (db.Database.CurrentTransaction is not null)
        {
            await acao();
            return;
        }
        await using var tx = await db.Database.BeginTransactionAsync();
        await acao();
        await tx.CommitAsync();
    }
}

/// <summary>Números da sequência do Postgres (nextval nunca repete, nem com gravações simultâneas).</summary>
public class Numerador(AppDbContext db) : INumerador
{
    public async Task<IReadOnlyList<long>> ProximosMovimentosAsync(int quantidade) =>
        (await db.Database.SqlQueryRaw<long>(
            "SELECT nextval('movimentos_numero_seq') AS \"Value\" FROM generate_series(1, {0})", quantidade).ToListAsync())
        .Order().ToList();
}

using Elrond.Application.Interfaces;
using Elrond.Infrastructure.Persistence;

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

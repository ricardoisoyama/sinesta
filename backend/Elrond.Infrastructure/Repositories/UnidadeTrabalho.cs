using Elrond.Application.Interfaces;
using Elrond.Domain.Entities;
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

/// <summary>
/// Numeração por empresa e documento: INSERT ... ON CONFLICT ... RETURNING incrementa e devolve numa
/// operação só (duas faturas ao mesmo tempo nunca pegam o mesmo número). Dentro de uma transação, o
/// número volta se a gravação falhar.
/// </summary>
public class NumeradorDocumentos(AppDbContext db) : INumeradorDocumentos
{
    public async Task<long> ProximoAsync(string empresaId, string tipo, long minimoUltimo = 0) =>
        (await db.Database.SqlQueryRaw<long>(
            "INSERT INTO numeracoes_documentos (\"Id\", \"EmpresaId\", \"Tipo\", \"Serie\", \"Ultimo\", \"AlteradoEm\", \"AlteradoPor\") " +
            "VALUES ({0}, {1}, {2}, '', {3} + 1, {4}, 'sistema') " +
            "ON CONFLICT (\"Id\") DO UPDATE SET \"Ultimo\" = GREATEST(numeracoes_documentos.\"Ultimo\", {3}) + 1, \"AlteradoEm\" = {4}, \"AlteradoPor\" = 'sistema' " +
            "RETURNING \"Ultimo\" AS \"Value\"",
            NumeracaoDocumento.IdDe(empresaId, tipo), empresaId, tipo, Math.Max(0, minimoUltimo), DateTime.UtcNow.ToString("o")).ToListAsync()).First();
}

using Elrond.Application.Interfaces;
using Elrond.Domain.Entities;
using Elrond.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Elrond.Infrastructure.Repositories;

public sealed class NotasFiscaisServicoRepository(AppDbContext db) : INotasFiscaisServicoRepository
{
    private static readonly SituacaoNfse[] EmAndamento = [SituacaoNfse.Pendente, SituacaoNfse.Processando, SituacaoNfse.Cancelando];

    /// <summary>Grava na hora: a nota precisa existir antes de o provedor ser chamado.</summary>
    public async Task AdicionarAsync(NotaFiscalServico nota, CancellationToken ct = default)
    {
        db.NotasFiscaisServico.Add(nota);
        await db.SaveChangesAsync(ct);
    }

    public Task<NotaFiscalServico?> ObterAsync(string id, CancellationToken ct = default) =>
        db.NotasFiscaisServico.FirstOrDefaultAsync(n => n.Id == id, ct);

    public Task<NotaFiscalServico?> ObterPorIdProvedorAsync(string provedor, string idProvedor, CancellationToken ct = default) =>
        db.NotasFiscaisServico.FirstOrDefaultAsync(n => n.Provedor == provedor && n.IdProvedor == idProvedor, ct);

    public async Task<IReadOnlyList<NotaFiscalServico>> ListarAsync(string? empresaId, int quantidade, CancellationToken ct = default) =>
        await db.NotasFiscaisServico.AsNoTracking()
            .Where(n => empresaId == null || n.EmpresaId == empresaId)
            .OrderByDescending(n => n.CriadaEm)
            .Take(quantidade)
            .ToListAsync(ct);

    public async Task<IReadOnlyList<NotaFiscalServico>> ParaAcompanharAsync(DateTime agora, int quantidade, CancellationToken ct = default) =>
        await db.NotasFiscaisServico
            .Where(n => EmAndamento.Contains(n.Situacao) && n.ProximaConsultaEm != null && n.ProximaConsultaEm <= agora)
            .OrderBy(n => n.ProximaConsultaEm)
            .Take(quantidade)
            .ToListAsync(ct);

    public Task SalvarAsync(CancellationToken ct = default) => db.SaveChangesAsync(ct);

    public Task<bool> AvisoJaProcessadoAsync(string idAviso, CancellationToken ct = default) =>
        db.AvisosNfse.AnyAsync(a => a.Id == idAviso, ct);

    public void MarcarAvisoProcessado(string idAviso, string provedor, DateTime agora) =>
        db.AvisosNfse.Add(new AvisoNfseRecebido { Id = idAviso, Provedor = provedor, RecebidoEm = agora });
}

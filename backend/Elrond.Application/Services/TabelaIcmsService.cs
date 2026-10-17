using Elrond.Application.Common;
using Elrond.Application.Interfaces;
using Elrond.Domain.Entities;
using Elrond.Domain.Regras;

namespace Elrond.Application.Services;

/// <summary>
/// Tabela de ICMS (origem × destino). A tela manda as linhas que mudaram; aqui elas são conferidas e
/// gravadas, e cada alteração vai para a auditoria. Nada é apagado: isento é alíquota 0.
/// </summary>
public class TabelaIcmsService(ICrudRepository<AliquotaIcms> repo, IAuditoriaService auditoria)
{
    public async Task<List<AliquotaIcms>> ListarAsync() =>
        (await repo.GetAllAsync()).OrderBy(a => a.UfOrigem).ThenBy(a => a.UfDestino).ToList();

    public async Task<Result<List<AliquotaIcms>>> SalvarAsync(List<AliquotaIcms> linhas)
    {
        var existentes = (await repo.GetAllAsync()).ToDictionary(a => a.Id);
        var novas = new Dictionary<string, AliquotaIcms>();
        var alteradas = new Dictionary<string, (AliquotaIcms Antes, AliquotaIcms Depois)>();
        foreach (var l in linhas ?? new())
        {
            var o = (l.UfOrigem ?? string.Empty).Trim().ToUpperInvariant();
            var d = (l.UfDestino ?? string.Empty).Trim().ToUpperInvariant();
            if (!ApolicesSeguro.Ufs.Contains(o) || !ApolicesSeguro.Ufs.Contains(d))
                return Result.Failure<List<AliquotaIcms>>($"UF inválida: {l.UfOrigem} → {l.UfDestino}.");
            if (l.Aliquota is < 0 or > 0.5m)
                return Result.Failure<List<AliquotaIcms>>($"Alíquota fora de 0% a 50% em {o} → {d}.");
            var id = $"{o}-{d}";
            var fund = (l.Fundamentacao ?? string.Empty).Trim();
            if (fund.Length > 400) fund = fund[..400];
            var nova = new AliquotaIcms { Id = id, UfOrigem = o, UfDestino = d, Aliquota = l.Aliquota, Fundamentacao = fund };
            if (!existentes.TryGetValue(id, out var antes)) novas[id] = nova;
            else if (antes.Aliquota != nova.Aliquota || antes.Fundamentacao != nova.Fundamentacao) alteradas[id] = (antes, nova);
        }
        if (novas.Count > 0 || alteradas.Count > 0)
            await repo.SalvarLoteAsync(novas.Values.ToList(), alteradas.Values.Select(a => a.Depois).ToList());
        foreach (var (antes, depois) in alteradas.Values)
            await auditoria.RegistrarAsync("editar", "AliquotaIcms", depois.Id,
                $"ICMS {depois.UfOrigem} → {depois.UfDestino}: {antes.Aliquota:P2} → {depois.Aliquota:P2}", antes, depois);
        foreach (var n in novas.Values)
            await auditoria.RegistrarAsync("criar", "AliquotaIcms", n.Id, $"ICMS {n.UfOrigem} → {n.UfDestino}: {n.Aliquota:P2}");
        return Result.Success(await ListarAsync());
    }
}

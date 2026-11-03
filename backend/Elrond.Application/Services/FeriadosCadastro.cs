using Elrond.Application.Interfaces;
using Elrond.Domain.Entities;
using Elrond.Domain.Regras;

namespace Elrond.Application.Services;

/// <summary>Os feriados do cadastro (ativos) como datas, para somar aos nacionais no dia útil.</summary>
public static class FeriadosCadastro
{
    public static async Task<HashSet<DateOnly>> DatasAsync(ICrudRepository<Feriado>? repo, int anoDe, int anoAte)
    {
        if (repo is null) return new();
        var ativos = (await repo.GetAllAsync()).Where(f => f.Status != "inativo").Select(f => (f.Data, f.TodoAno));
        return DiasUteis.Extras(ativos, anoDe, anoAte);
    }
}

using Elrond.Application.Interfaces;
using Elrond.Domain.Entities;
using Elrond.Domain.Regras;

namespace Elrond.Application.Services;

/// <summary>
/// Os feriados do cadastro (ativos) como datas, para somar aos nacionais no dia útil. Com a cidade da empresa
/// ("São Vicente - SP"), só os que valem para ela: de todas, os estaduais do estado e os municipais da cidade.
/// </summary>
public static class FeriadosCadastro
{
    public static async Task<HashSet<DateOnly>> DatasAsync(ICrudRepository<Feriado>? repo, int anoDe, int anoAte, string cidadeEmpresa = "")
    {
        if (repo is null) return new();
        var ativos = (await repo.GetAllAsync()).Where(f => f.Status != "inativo" && f.ValePara(cidadeEmpresa)).Select(f => (f.Data, f.TodoAno));
        return DiasUteis.Extras(ativos, anoDe, anoAte);
    }
}

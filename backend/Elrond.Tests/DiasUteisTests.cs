using Elrond.Domain.Regras;

namespace Elrond.Tests;

/// <summary>Dia útil bancário: fim de semana, feriados nacionais (fixos e da Páscoa) e os do cadastro.</summary>
public class DiasUteisTests
{
    [Fact]
    public void Pascoa_e_os_feriados_que_dependem_dela()
    {
        Assert.Equal(new DateOnly(2026, 4, 5), DiasUteis.Pascoa(2026));
        Assert.Equal(new DateOnly(2027, 3, 28), DiasUteis.Pascoa(2027));
        var f2026 = DiasUteis.Nacionais(2026).ToDictionary(x => x.Nome, x => x.Data);
        Assert.Equal(new DateOnly(2026, 2, 16), f2026["Carnaval (segunda)"]);
        Assert.Equal(new DateOnly(2026, 2, 17), f2026["Carnaval (terça)"]);
        Assert.Equal(new DateOnly(2026, 4, 3), f2026["Sexta-feira Santa"]);
        Assert.Equal(new DateOnly(2026, 6, 4), f2026["Corpus Christi"]);
        Assert.Contains(new DateOnly(2026, 11, 20), f2026.Values); // Consciência Negra, nacional desde 2024
    }

    [Theory]
    // O exemplo do Ricardo: 01/11/2026 é domingo e 02/11 é Finados → paga 03/11.
    [InlineData("2026-11-01", DiasUteis.Postergar, "2026-11-03")]
    [InlineData("2026-11-01", DiasUteis.Antecipar, "2026-10-30")]
    [InlineData("2026-11-02", DiasUteis.Manter, "2026-11-02")]
    [InlineData("2026-12-25", DiasUteis.Postergar, "2026-12-28")] // Natal na sexta
    [InlineData("2026-02-16", DiasUteis.Postergar, "2026-02-18")] // Carnaval: segunda e terça
    [InlineData("2026-11-04", DiasUteis.Postergar, "2026-11-04")] // dia útil fica
    public void Ajusta_o_vencimento_em_dia_nao_util(string data, string regra, string esperado) =>
        Assert.Equal(DateOnly.Parse(esperado), DiasUteis.Ajustar(DateOnly.Parse(data), regra));

    [Fact]
    public void Feriado_do_cadastro_entra_e_o_de_todo_ano_repete()
    {
        // 25/01: aniversário de São Paulo (todo ano). 2027-01-25 é segunda.
        var extras = DiasUteis.Extras([("2026-01-25", true), ("2026-11-04", false), ("lixo", true)], 2026, 2027);
        Assert.Contains(new DateOnly(2027, 1, 25), extras);
        Assert.Contains(new DateOnly(2026, 11, 4), extras);
        Assert.DoesNotContain(new DateOnly(2027, 11, 4), extras);
        Assert.Equal(new DateOnly(2027, 1, 26), DiasUteis.Ajustar(new DateOnly(2027, 1, 25), DiasUteis.Postergar, extras));
        Assert.Equal(new DateOnly(2026, 11, 5), DiasUteis.ProximoUtil(new DateOnly(2026, 11, 4), extras));
    }
}

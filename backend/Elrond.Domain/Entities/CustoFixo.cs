using Elrond.Domain.Common;

namespace Elrond.Domain.Entities;

public class CustoFixo : Rastreavel, IEntity, IInativavel, INumerado
{
    /// <summary>Término de quem não tem prazo final (o campo nunca fica vazio nas recorrentes).</summary>
    public const string DataFimSemPrazo = "9999-12-31";

    public string Id { get; set; } = string.Empty;
    /// <summary>Número da despesa (sequencial, nasce no banco).</summary>
    public long Numero { get; set; }
    public string UnidadeId { get; set; } = string.Empty;
    public string Descricao { get; set; } = string.Empty;
    /// <summary>Categoria de despesa (cadastro <see cref="CategoriaCusto"/>).</summary>
    public string CategoriaId { get; set; } = string.Empty;
    public decimal ValorMensal { get; set; }
    public string Status { get; set; } = "ativo";
    public string? PlanoContaId { get; set; }
    /// <summary>"recorrente" (projeta e entra na DF) ou "spot" (despesa única).</summary>
    public string Tipo { get; set; } = "recorrente";
    /// <summary>Início da recorrência (yyyy-MM-dd). Vazio = sem data definida.</summary>
    public string DataInicio { get; set; } = string.Empty;
    /// <summary>Término da recorrência (yyyy-MM-dd). Vazio = sem término.</summary>
    public string DataFim { get; set; } = string.Empty;
    /// <summary>Fornecedor que emite a despesa (cadastro <see cref="Fornecedor"/>).</summary>
    public string FornecedorId { get; set; } = string.Empty;
    /// <summary>Dia do mês em que a despesa é paga (1–31; mês mais curto = último dia). 0 = não informado.</summary>
    public int DiaVencimento { get; set; }
    /// <summary>Conta que paga (Caixa): com ela e o término, a recorrente gera os lançamentos a pagar.</summary>
    public string CarteiraId { get; set; } = string.Empty;

    /// <summary>Origem dos lançamentos a pagar gerados pela despesa (Movimento.OrigemId = a despesa).</summary>
    public const string OrigemLancamentos = "custo-fixo";

    /// <summary>Tem término de verdade (não o 31/12/9999 de quem não tem prazo)?</summary>
    public bool TemTermino => DateOnly.TryParse(DataFim, out var fim) && fim.Year < 9999;

    /// <summary>
    /// Entra na base da DF (markup/fator)? Só custos ativos, recorrentes e vigentes
    /// na data de referência. Spot é despesa única e não é projetado.
    /// </summary>
    /// <summary>
    /// Entra na DF (base do fator)? Recorrente e ativo entra mesmo que ainda não tenha começado:
    /// quem precifica hoje já conta com o custo que sabe que vai ter (decisão de 01/10/2026).
    /// Só fica de fora o que já terminou.
    /// </summary>
    public bool EntraNaDf(DateOnly hoje)
    {
        if (Status != "ativo" || Tipo == "spot") return false;
        if (DateOnly.TryParse(DataFim, out var fim) && hoje > fim) return false;
        return true;
    }

    // ── Rateio entre empresas ──────────────────────────────────────────────
    // A empresa da despesa (UnidadeId) é a que paga a conta inteira. Com rateio, cada empresa
    // listada leva a sua parte para a DF (e o markup) dela; sem rateio, tudo é da que paga.

    /// <summary>Empresas que dividem a despesa e a parte de cada uma (fração; a soma é 1). Vazio = sem rateio.</summary>
    public List<RateioCustoFixo> Rateio { get; set; } = new();

    public bool Rateada => Rateio is { Count: > 0 };

    /// <summary>Fração da despesa que é da empresa (1 = inteira, 0 = nada).</summary>
    public decimal PercentualDa(string empresaId) =>
        Rateada ? Rateio.Where(r => r.EmpresaId == empresaId).Sum(r => r.Percentual) : UnidadeId == empresaId ? 1m : 0m;

    /// <summary>Quanto do valor mensal vai para a DF da empresa.</summary>
    public decimal ValorPara(string empresaId) => ValorMensal * PercentualDa(empresaId);

    /// <summary>O rateio fecha? Null quando está certo (ou não há rateio); senão, o motivo.</summary>
    public string? ConferirRateio()
    {
        if (!Rateada) return null;
        if (Rateio.Any(r => string.IsNullOrWhiteSpace(r.EmpresaId))) return "Rateio: escolha a empresa de cada linha.";
        if (Rateio.GroupBy(r => r.EmpresaId).Any(g => g.Count() > 1)) return "Rateio: cada empresa entra uma vez só.";
        if (Rateio.Any(r => r.Percentual <= 0)) return "Rateio: toda empresa do rateio precisa de um percentual maior que zero.";
        if (Rateio.All(r => r.EmpresaId != UnidadeId)) return "Rateio: a empresa que paga a conta precisa fazer parte do rateio.";
        // Rateio com uma empresa só é o mesmo que não ratear.
        if (Rateio.Count < 2) return "Rateio: com o rateio ligado, inclua pelo menos mais uma empresa (ou desligue o rateio).";
        var total = Rateio.Sum(r => r.Percentual);
        if (Math.Abs(total - 1m) > ToleranciaRateio)
            return $"Rateio: os percentuais somam {total * 100:0.##}%; precisam fechar 100%.";
        return null;
    }

    /// <summary>Folga de arredondamento na soma (0,01 ponto percentual).</summary>
    public const decimal ToleranciaRateio = 0.0001m;
}

/// <summary>Parte de uma empresa numa despesa rateada.</summary>
public class RateioCustoFixo
{
    public string EmpresaId { get; set; } = string.Empty;
    /// <summary>Fração (0,5 = 50%).</summary>
    public decimal Percentual { get; set; }
}

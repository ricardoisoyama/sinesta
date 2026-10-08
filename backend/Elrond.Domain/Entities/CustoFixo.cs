using Elrond.Domain.Common;

namespace Elrond.Domain.Entities;

public class CustoFixo : Rastreavel, IEntity, IInativavel
{
    /// <summary>Término de quem não tem prazo final (o campo nunca fica vazio nas recorrentes).</summary>
    public const string DataFimSemPrazo = "9999-12-31";

    public string Id { get; set; } = string.Empty;
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
    /// <summary>Dia do mês em que a despesa vence (1–31). 0 = não informado.</summary>
    public int DiaVencimento { get; set; }

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
}

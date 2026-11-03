using Elrond.Domain.Common;

namespace Elrond.Domain.Entities;

/// <summary>
/// Hipótese de um cenário. Só existe no cenário: os cadastros não mudam.
/// novo-custo | reajuste-custos | variacao-meta | nova-receita | cortar-custo.
/// </summary>
public class HipoteseProjecao
{
    public string Id { get; set; } = string.Empty;
    public string Tipo { get; set; } = "novo-custo";
    public string Nome { get; set; } = string.Empty;
    /// <summary>R$/mês (novo custo, nova receita) ou fração (reajuste, variação da meta: 0,1 = 10%).</summary>
    public decimal Valor { get; set; }
    /// <summary>yyyy-MM a partir de quando vale.</summary>
    public string Inicio { get; set; } = string.Empty;
    /// <summary>yyyy-MM até quando vale (vazio = até o fim do horizonte).</summary>
    public string Fim { get; set; } = string.Empty;
    /// <summary>Cortar custo: a despesa fixa que sai.</summary>
    public string CustoId { get; set; } = string.Empty;
    public bool Ativa { get; set; } = true;
}

/// <summary>Cenário da projeção: um nome e as hipóteses sobre a base real (metas e despesas fixas).</summary>
public class CenarioProjecao : Rastreavel, IEntity, IInativavel
{
    public string Id { get; set; } = string.Empty;
    public string Nome { get; set; } = string.Empty;
    public List<HipoteseProjecao> Hipoteses { get; set; } = new();
    /// <summary>Variação do faturamento do cenário (fração, −0,3 a +0,3 na tela): fica gravada com ele.</summary>
    public decimal Sensibilidade { get; set; }
    public string Status { get; set; } = "ativo";
}

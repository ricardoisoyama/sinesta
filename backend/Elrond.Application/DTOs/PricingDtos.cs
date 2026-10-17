using Elrond.Domain.Entities;
using Elrond.Domain.Pricing;

namespace Elrond.Application.DTOs;

/// <summary>Entrada da precificação. Os parâmetros da empresa (DV, DF, ICMS, lucro) vêm do banco.</summary>
public record CalcularPrecoRequest(
    string EmpresaId,
    /// <summary>Soma dos custos em reais (valores fixos e percentuais sobre a NF já convertidos).</summary>
    decimal Custo,
    /// <summary>Lucro desta linha (fração). Nulo = o da empresa; abaixo dele a proposta vai para aprovação.</summary>
    decimal? LucroDesejado,
    decimal Desconto,
    decimal ValorNf,
    bool AplicaIcms,
    string? UfDestinoId,
    /// <summary>Soma dos custos cobrados em % do preço do serviço (fração). 0 = nenhum.</summary>
    decimal CustoPercentualServico = 0m,
    /// <summary>Comissão desta operação (fração). Nulo = a do vendedor ou a da empresa.</summary>
    decimal? Comissoes = null,
    /// <summary>Vendedor da operação: a regra de comissão dele é o padrão.</summary>
    string? VendedorId = null,
    /// <summary>Alíquota do campo ICMS dos Dados da Operação (fração). Informada, substitui a busca por UfDestinoId.</summary>
    decimal? AliquotaIcms = null
);

/// <summary>
/// Pedido do motor de fator. <see cref="Empresa"/> preenchido = simula o rascunho da tela da
/// empresa (antes de salvar); nulo = usa o cadastro gravado de <see cref="EmpresaId"/>.
/// </summary>
public record CalcularFatorRequest(string? EmpresaId, Empresa? Empresa = null, string? VendedorId = null, decimal? Comissoes = null,
    /// <summary>Lucro da linha do Pricing (fração). Nulo = o da empresa.</summary>
    decimal? Lucro = null);

/// <summary>Fator da empresa e cada parcela que o compõe (frações: 0,11 = 11%).</summary>
public record FatorResultado(
    string EmpresaId,
    int Ano,
    decimal TotalDf,
    int CustosNaDf,
    string MetaId,
    string MetaNome,
    decimal MetaAnual,
    /// <summary>Faturamento que divide a DF: a média mensal do ano ou a meta do mês corrente.</summary>
    decimal FaturamentoMensal,
    /// <summary>"media" | "mes": de onde veio <see cref="FaturamentoMensal"/> (opção da meta).</summary>
    string BasePreco,
    decimal DfPct,
    decimal Impostos,
    bool ImpostosDoCadastro,
    decimal Comissoes,
    decimal ComissoesPadrao,
    decimal DespFinanceira,
    decimal Outras,
    /// <summary>Impostos + comissão + despesa financeira + outras.</summary>
    decimal DvSemLucro,
    /// <summary>Lucro usado na conta (o da linha, se informado; senão o da empresa).</summary>
    decimal Lucro,
    /// <summary>Lucro da empresa: o piso; abaixo dele a proposta vai para aprovação.</summary>
    decimal LucroPadrao,
    /// <summary>Mês (1–12) cuja meta foi a base do DF%.</summary>
    int Mes,
    /// <summary>DF% + DV + lucro.</summary>
    decimal Markup,
    /// <summary>1 ÷ (1 − markup). 0 quando não dá para calcular (sem meta ou inviável).</summary>
    decimal Fator,
    /// <summary>false = falta meta ou a soma passa de 100%; o Pricing bloqueia.</summary>
    bool Pronto,
    string? Aviso);

/// <summary>Resultado da precificação + memória de cálculo (fonte da verdade = servidor).</summary>
public record CalcularPrecoResponse(
    decimal Fator,
    decimal Pv,
    decimal PvComDesconto,
    decimal DescontoValor,
    decimal Seguro,
    decimal AliquotaIcms,
    bool AplicaIcms,
    CotacaoFiscalResult Fiscal,
    decimal PrecoFinal,
    MargemResult Margem,
    decimal TotalDf,
    decimal DfPct,
    decimal DvSem,
    decimal Lucro,
    /// <summary>Custos em % do preço, já em reais (sobre o PV com desconto).</summary>
    decimal CustoPercentualReais,
    /// <summary>Custo total efetivo (reais + percentuais).</summary>
    decimal CustoTotal,
    /// <summary>Piso da margem líquida: o lucro da empresa (o fator calculado é o mínimo).</summary>
    decimal MarkupMinimo,
    /// <summary>true quando a margem líquida ficou abaixo do lucro da empresa (alerta/aprovação).</summary>
    bool AbaixoDoMinimo,
    /// <summary>Comissão usada nesta operação e a padrão (vendedor ou empresa).</summary>
    decimal Comissoes = 0m,
    decimal ComissoesPadrao = 0m,
    /// <summary>Composição do fator (mesma do motor da tela da empresa).</summary>
    FatorResultado? Composicao = null
);

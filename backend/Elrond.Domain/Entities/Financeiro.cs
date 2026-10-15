using Elrond.Domain.Common;

namespace Elrond.Domain.Entities;

/// <summary>Conta bancária, caixa ou cartão por onde o dinheiro entra e sai.</summary>
public class Carteira : Rastreavel, IEntity, IInativavel
{
    public string Id { get; set; } = string.Empty;
    public string Nome { get; set; } = string.Empty;
    /// <summary>Empresa (CNPJ) dona da conta. Vazio = carteira antiga, compartilhada por todas.</summary>
    public string EmpresaId { get; set; } = string.Empty;
    /// <summary>banco | caixa | cartao.</summary>
    public string Tipo { get; set; } = "banco";
    public string Banco { get; set; } = string.Empty;
    public string Agencia { get; set; } = string.Empty;
    public string Conta { get; set; } = string.Empty;
    /// <summary>Saldo na data de abertura da carteira no sistema.</summary>
    public decimal SaldoInicial { get; set; }
    /// <summary>yyyy-MM-dd do saldo inicial.</summary>
    public string SaldoInicialEm { get; set; } = string.Empty;
    public string Cor { get; set; } = "#1a4d1e";
    public string Status { get; set; } = "ativo";
}

/// <summary>Assinatura de um aprovador no lançamento.</summary>
public class AprovacaoMovimento
{
    public string UsuarioId { get; set; } = string.Empty;
    public string Nome { get; set; } = string.Empty;
    /// <summary>Data e hora (ISO 8601).</summary>
    public string Em { get; set; } = string.Empty;
}

/// <summary>
/// Um lançamento a pagar ou a receber (uma parcela). Parcelamento gera vários, ligados pelo
/// <see cref="GrupoId"/>. Nunca é apagado: cancelar marca <see cref="Cancelado"/>.
/// Todo lançamento nasce pendente de aprovação (regra do tipo "movimento").
/// </summary>
public class Movimento : Rastreavel, IEntity, INumerado
{
    public string Id { get; set; } = string.Empty;
    /// <summary>Número do lançamento, único: cada parcela tem o seu (nasce no banco, nunca muda).</summary>
    public long Numero { get; set; }
    /// <summary>receber | pagar.</summary>
    public string Tipo { get; set; } = "pagar";
    public string EmpresaId { get; set; } = string.Empty;
    public string ParceiroId { get; set; } = string.Empty;
    public string ParceiroNome { get; set; } = string.Empty;
    public string Descricao { get; set; } = string.Empty;
    public string PlanoContaId { get; set; } = string.Empty;
    public string CentroCustoId { get; set; } = string.Empty;
    public string Documento { get; set; } = string.Empty;
    /// <summary>yyyy-MM.</summary>
    public string Competencia { get; set; } = string.Empty;
    /// <summary>yyyy-MM-dd.</summary>
    public string Vencimento { get; set; } = string.Empty;
    public decimal Valor { get; set; }
    public decimal Desconto { get; set; }
    public decimal Juros { get; set; }
    public decimal Multa { get; set; }
    /// <summary>Preenchidos na liquidação (baixa).</summary>
    public string PagoEm { get; set; } = string.Empty;
    public decimal ValorPago { get; set; }
    public string CarteiraId { get; set; } = string.Empty;
    public string FormaPagamento { get; set; } = string.Empty;
    public int Parcela { get; set; } = 1;
    public int TotalParcelas { get; set; } = 1;
    public string GrupoId { get; set; } = string.Empty;
    /// <summary>manual | proposta | despesa | conciliacao.</summary>
    public string Origem { get; set; } = "manual";
    public string OrigemId { get; set; } = string.Empty;
    public string Observacao { get; set; } = string.Empty;
    public bool Cancelado { get; set; }

    // ── aprovação ──
    /// <summary>pendente | aprovado | reprovado.</summary>
    public string Aprovacao { get; set; } = "pendente";
    /// <summary>Regra de aprovação que cobre o lançamento (vazio = nenhuma regra cobre o valor).</summary>
    public string RegraId { get; set; } = string.Empty;
    public List<AprovacaoMovimento> Aprovacoes { get; set; } = new();
    public string ReprovadoPor { get; set; } = string.Empty;
    public string ReprovadoEm { get; set; } = string.Empty;
    public string MotivoReprovacao { get; set; } = string.Empty;

    /// <summary>Valor líquido: o pago na baixa, ou valor − desconto + juros + multa.</summary>
    public decimal Liquido => PagoEm.Length > 0 && ValorPago > 0 ? ValorPago : Math.Max(0, Valor - Desconto + Juros + Multa);
}

/// <summary>
/// Linha de um extrato bancário importado (.ofx). O FITID é único por carteira, então
/// importar o mesmo arquivo duas vezes não duplica nada.
/// </summary>
public class ExtratoLinha : Rastreavel, IEntity
{
    public string Id { get; set; } = string.Empty;
    public string CarteiraId { get; set; } = string.Empty;
    public string Fitid { get; set; } = string.Empty;
    /// <summary>yyyy-MM-dd.</summary>
    public string Data { get; set; } = string.Empty;
    /// <summary>Positivo = entrou; negativo = saiu.</summary>
    public decimal Valor { get; set; }
    public string Memo { get; set; } = string.Empty;
    /// <summary>pendente | conciliado | ignorado.</summary>
    public string Situacao { get; set; } = "pendente";
    public string MovimentoId { get; set; } = string.Empty;
}

/// <summary>"De/para" aprendido na conciliação: memo do extrato → quem é e qual conta.</summary>
public class RegraConciliacao : Rastreavel, IEntity, IInativavel
{
    public string Id { get; set; } = string.Empty;
    public string Padrao { get; set; } = string.Empty;
    public string Tipo { get; set; } = "pagar";
    public string ParceiroNome { get; set; } = string.Empty;
    public string PlanoContaId { get; set; } = string.Empty;
    public string CentroCustoId { get; set; } = string.Empty;
    public string Descricao { get; set; } = string.Empty;
    public string Status { get; set; } = "ativo";
}

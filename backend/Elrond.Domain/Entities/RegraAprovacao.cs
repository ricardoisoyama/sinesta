using Elrond.Domain.Common;

namespace Elrond.Domain.Entities;

/// <summary>
/// Regra do sistema, centralizada na tela "Aprovadores e Regras". O <see cref="Tipo"/> diz
/// o que ela governa:
///  - "proposta": alçada de preço (faixa por margem ou valor + aprovadores que assinam);
///  - "compras": até quanto um comprador compra sem aprovação (com exceções de fornecedor);
///  - "comissao": parâmetros de comissão de um vendedor (regras detalhadas virão do cliente).
/// </summary>
public class RegraAprovacao : Rastreavel, IEntity, IInativavel
{
    public string Id { get; set; } = string.Empty;
    public string Nome { get; set; } = string.Empty;
    /// <summary>"proposta" | "compras" | "comissao". Vazio nas regras antigas = proposta.</summary>
    public string Tipo { get; set; } = "proposta";
    public string Status { get; set; } = "ativo";
    public string Observacao { get; set; } = string.Empty;

    // ── Proposta (alçada de preço) ──────────────────────────────────────────
    /// <summary>"margem" (faixa em fração: 0,05 = 5%) ou "valor" (faixa em R$).</summary>
    public string Base { get; set; } = "margem";
    public decimal De { get; set; }
    /// <summary>Fim da faixa. 0 = sem teto.</summary>
    public decimal Ate { get; set; }
    /// <summary>Ids dos funcionários que precisam aprovar (proposta e compras).</summary>
    public List<string> Aprovadores { get; set; } = new();

    // ── Movimento (Financeiro) ──────────────────────────────────────────────
    /// <summary>Para quais lançamentos vale: "" (pagar e receber) | "pagar" | "receber". Faixa em R$ (De/Ate).</summary>
    public string TipoMovimento { get; set; } = string.Empty;
    /// <summary>Empresa a que a regra de lançamento vale; vazio = todas.</summary>
    public string EmpresaId { get; set; } = string.Empty;

    // ── Compras ─────────────────────────────────────────────────────────────
    /// <summary>Funcionário comprador a quem a regra se aplica.</summary>
    public string CompradorId { get; set; } = string.Empty;
    /// <summary>Até este valor (R$) o comprador compra sem aprovação, de qualquer fornecedor.</summary>
    public decimal Limite { get; set; }
    /// <summary>Fornecedores fora da regra (ids).</summary>
    public List<string> Excecoes { get; set; } = new();

    // ── Comissão ────────────────────────────────────────────────────────────
    public string VendedorId { get; set; } = string.Empty;
    /// <summary>Fração: 0,015 = 1,5%.</summary>
    public decimal ComissaoPercentual { get; set; }
    /// <summary>"preco" | "margem".</summary>
    public string ComissaoBase { get; set; } = "preco";
    /// <summary>Etapa do CRM em que este perfil de comissão passa a valer (opcional).</summary>
    public string EtapaCrmId { get; set; } = string.Empty;

    public bool EhProposta => string.IsNullOrEmpty(Tipo) || Tipo == "proposta";

    /// <summary>A regra de movimento cobre este lançamento (tipo, valor e empresa)?</summary>
    public bool CobreMovimento(string tipoMovimento, decimal valor, string empresaId = "") =>
        Tipo == "movimento" && Status == "ativo" && Aprovadores.Count > 0
        && (string.IsNullOrEmpty(TipoMovimento) || TipoMovimento == tipoMovimento)
        && (string.IsNullOrEmpty(EmpresaId) || EmpresaId == empresaId)
        && Cobre(valor);

    /// <summary>A regra de proposta cobre este valor? (Ate = 0 significa "daqui para cima".)</summary>
    public bool Cobre(decimal valor) => valor >= De && (Ate <= 0 || valor <= Ate);
}

/**
 * Motor de precificação: funções PURAS e testáveis (substituem as fórmulas
 * escondidas na planilha "Matriz de Preço"). Tudo trabalha com frações
 * (0,11 = 11%). A cadeia é: DF% + DV → markup → fator → PV → margem.
 */

/** Despesa variável extra da empresa ("+ Outras despesas"): nome + fração sobre a receita. */
export interface OutraDespesaDv {
  id: string
  nome: string
  percentual: number
}

export interface DvParams {
  impostos: number
  custos: number
  comissoes: number
  lucro: number
  despFinanceira: number
  /** Linhas livres somadas na DV (entram no markup). Ausente nos cadastros antigos. */
  outras?: OutraDespesaDv[]
}

/** Soma das outras despesas (fração). */
export const outrasDv = (p: DvParams): number => (p.outras ?? []).reduce((a, o) => a + (o.percentual || 0), 0)

/** DV total (com ML/lucro) = soma das despesas variáveis. */
export const dvComML = (p: DvParams): number =>
  p.impostos + p.custos + p.comissoes + p.lucro + p.despFinanceira + outrasDv(p)

/** DV sem o lucro (ML). */
export const dvSemML = (p: DvParams): number => dvComML(p) - p.lucro

/** Representatividade da DF sobre a receita estimada (DF ÷ receita). */
export const dfPercent = (totalDF: number, receitaEstimada: number): number =>
  receitaEstimada > 0 ? totalDF / receitaEstimada : 0

/** Markup% = DF% + DV(com ML). */
export const markup = (dfPct: number, dvPct: number): number => dfPct + dvPct

/** Fator = 1 / (1 − markup). Retorna 0 se markup ≥ 1 (inviável). */
export const fator = (markupPct: number): number =>
  markupPct < 1 ? 1 / (1 - markupPct) : 0

/** Preço de venda = (custo logístico + outros custos) × fator. */
export const precoVenda = (custoLogistico: number, outrosCustos: number, fatorVal: number): number =>
  (custoLogistico + outrosCustos) * fatorVal

/**
 * PV quando parte do custo é um percentual do próprio preço (ex.: seguro cobrado em % da
 * NF do serviço). É circular, mas fecha em conta: PV = (C + p·PV)·F ⇒ PV = C·F ÷ (1 − p·F).
 * Devolve 0 quando p·F ≥ 1 (inviável).
 */
export const precoVendaComCustoPercentual = (custoReais: number, percentualDoPreco: number, fatorVal: number): number => {
  const divisor = 1 - percentualDoPreco * fatorVal
  return divisor > 0 ? (custoReais * fatorVal) / divisor : 0
}

export interface MargemResult {
  custoTotal: number
  /** Parcela de custo fixo embutida no PV (R$): PV × DF%. */
  dfReais: number
  /** Parcela de despesa variável (sem ML) embutida no PV (R$): PV × DV(sem ML). */
  dvReais: number
  /** Margem de Contribuição Unitária (R$). */
  mcu: number
  /** Margem Líquida (fração de PV). */
  ml: number
}

/**
 * Decompõe o PV em custo, DF, DV e margem (lógica da planilha):
 *   MCU = PV − custoTotal − (PV × DF%) − (PV × DV_sem_ML);  ML = MCU / PV.
 */
export const margem = (
  pv: number,
  custoTotal: number,
  dfPct: number,
  dvSemMLPct: number,
): MargemResult => {
  const dfReais = pv * dfPct
  const dvReais = pv * dvSemMLPct
  const mcu = pv - custoTotal - dfReais - dvReais
  const ml = pv > 0 ? mcu / pv : 0
  return { custoTotal, dfReais, dvReais, mcu, ml }
}

/* ── Camada fiscal (aba "simulação") ──────────────────────────────────── */

/** Seguro ad valorem = NF × alíquota (ex.: 300.000 × 0,3% = 900). */
export const seguroAdValorem = (nf: number, aliquota: number): number => (nf || 0) * (aliquota || 0)

/** Gross-up de ICMS: valor ÷ (1 − alíquota) ("imposto por dentro"). */
export const grossUp = (valor: number, aliquotaIcms: number): number =>
  aliquotaIcms > 0 && aliquotaIcms < 1 ? valor / (1 - aliquotaIcms) : valor

/** Receita de equilíbrio (resultado = 0): DF ÷ (1 − DV sem ML). */
export const receitaEquilibrio = (df: number, dvSemMLPct: number): number =>
  dvSemMLPct < 1 ? df / (1 - dvSemMLPct) : 0

/** Receita para atingir a margem de lucro alvo: DF ÷ (1 − DV com ML). */
export const receitaAlvo = (df: number, dvComMLPct: number): number =>
  dvComMLPct < 1 ? df / (1 - dvComMLPct) : 0

export interface PrecoReversoResult {
  /** Preço de venda que sobra depois de tirar impostos e seguro do preço final. */
  pvPraticado: number
  /** Desconto que o preço digitado representa sobre o PV calculado (negativo = acréscimo). */
  descontoEfetivo: number
  margem: MargemResult
}

/**
 * Caminho inverso da precificação: parte do preço final que o cliente aceita pagar e
 * volta até a margem, sem mexer nos parâmetros da esquerda (custo, lucro, desconto).
 *   com ICMS: PV = precoFinal × (1 − alíquota) − seguro
 *   sem ICMS: PV = precoFinal − seguro
 */
export const precoParaMargem = (
  precoFinal: number,
  seguro: number,
  aliquotaIcms: number,
  aplicaIcms: boolean,
  pvCalculado: number,
  custoTotal: number,
  dfPct: number,
  dvSemMLPct: number,
): PrecoReversoResult => {
  const base = aplicaIcms ? precoFinal * (1 - aliquotaIcms) : precoFinal
  const pvPraticado = Math.max(0, base - seguro)
  const descontoEfetivo = pvCalculado > 0 ? 1 - pvPraticado / pvCalculado : 0
  return {
    pvPraticado,
    descontoEfetivo,
    margem: margem(pvPraticado, custoTotal, dfPct, dvSemMLPct),
  }
}

export type FormaCobranca = 'nfe' | 'nfse' | 'cte' | 'recibo'

/** Rótulos das formas de cobrança e quais documentos carregam ICMS (gross-up). */
export const FORMAS_COBRANCA: { valor: FormaCobranca; label: string; icms: boolean }[] = [
  { valor: 'nfe', label: 'NF-e', icms: true },
  { valor: 'nfse', label: 'NFS-e', icms: false },
  { valor: 'cte', label: 'CT-e', icms: true },
  { valor: 'recibo', label: 'Recibo', icms: false },
]

export interface CotacaoFiscalResult {
  /** Base sobre a qual o ICMS faz gross-up. */
  baseIcms: number
  /** Base após o gross-up (já com ICMS embutido). */
  freteComIcms: number
  /** Valor do ICMS embutido (gross-up − base). */
  icmsValor: number
  /** Preço final a cobrar (com impostos). */
  precoFinal: number
}

/**
 * Compõe o preço final com impostos.
 * - Com ICMS ativo: gross-up sobre (frete + seguro).
 * - Sem ICMS: preço final = frete + seguro.
 * A alíquota vem do cadastro da empresa (por UF de destino); o `aplicaIcms` é o botão da tela.
 */
export const cotacaoFiscal = (
  pv: number,
  seguro: number,
  aliquotaIcms: number,
  aplicaIcms: boolean,
): CotacaoFiscalResult => {
  if (aplicaIcms) {
    const baseIcms = pv + seguro
    const freteComIcms = grossUp(baseIcms, aliquotaIcms)
    return { baseIcms, freteComIcms, icmsValor: freteComIcms - baseIcms, precoFinal: freteComIcms }
  }
  return { baseIcms: pv, freteComIcms: pv, icmsValor: 0, precoFinal: pv + seguro }
}

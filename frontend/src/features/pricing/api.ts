import { apiFetch } from '@/lib/api'
import type { Unidade } from '@/features/unidades/types'
import type { CotacaoFiscalResult, MargemResult } from './engine'

export interface CalcularPrecoRequest {
  empresaId: string
  /** Custos em reais (fixos e percentuais sobre a NF já convertidos). */
  custo: number
  /** Lucro desta linha (fração). Nulo = o da empresa; abaixo dele a proposta vai para aprovação. */
  lucroDesejado: number | null
  desconto: number
  valorNf: number
  aplicaIcms: boolean
  ufDestinoId: string | null
  /** Soma dos custos cobrados em % do preço do serviço (fração). */
  custoPercentualServico: number
  /** Comissão desta operação (fração). Nulo = a do vendedor ou a da empresa. */
  comissoes?: number | null
  /** Vendedor da operação: a regra de comissão dele é o padrão. */
  vendedorId?: string | null
}

/** Motor do fator: composição DF% + DV + lucro → fator (frações: 0,11 = 11%). */
export interface FatorResultado {
  empresaId: string
  ano: number
  totalDf: number
  custosNaDf: number
  metaId: string
  metaNome: string
  metaAnual: number
  /** Meta do mês corrente: a base do DF%. */
  faturamentoMensal: number
  /** Mês (1–12) cuja meta foi a base do DF%. */
  mes: number
  dfPct: number
  impostos: number
  impostosDoCadastro: boolean
  comissoes: number
  comissoesPadrao: number
  despFinanceira: number
  outras: number
  /** Impostos + comissão + despesa financeira + outras. */
  dvSemLucro: number
  /** Lucro usado na conta (o da linha, se informado; senão o da empresa). */
  lucro: number
  /** Lucro da empresa: o piso; abaixo dele a proposta vai para aprovação. */
  lucroPadrao: number
  /** DF% + DV + lucro. */
  markup: number
  /** 0 quando não dá para calcular. */
  fator: number
  /** false = falta meta ou a soma passa de 100%: o Pricing bloqueia. */
  pronto: boolean
  aviso: string | null
}

export interface CalcularFatorRequest {
  empresaId: string
  /** Rascunho do formulário da empresa (simula antes de salvar). */
  empresa?: Unidade | null
  vendedorId?: string | null
  comissoes?: number | null
  /** Lucro da linha do Pricing (fração). Nulo = o da empresa. */
  lucro?: number | null
}

/** Resposta do motor no servidor (.NET) — fonte da verdade do preço. */
export interface CalcularPrecoResponse {
  fator: number
  pv: number
  pvComDesconto: number
  descontoValor: number
  seguro: number
  aliquotaIcms: number
  aplicaIcms: boolean
  fiscal: CotacaoFiscalResult
  precoFinal: number
  margem: MargemResult
  totalDf: number
  dfPct: number
  dvSem: number
  lucro: number
  /** Custos em % do preço, já em reais. */
  custoPercentualReais: number
  /** Custo total efetivo (reais + percentuais). */
  custoTotal: number
  /** Piso da margem líquida: o lucro da empresa (o fator calculado é o mínimo). */
  markupMinimo: number
  /** Margem líquida abaixo do lucro da empresa. */
  abaixoDoMinimo: boolean
  comissoes: number
  comissoesPadrao: number
  composicao: FatorResultado | null
}

export const calcularPreco = (req: CalcularPrecoRequest) =>
  apiFetch<CalcularPrecoResponse>('/pricing/calculate', { method: 'POST', body: JSON.stringify(req) })

export const calcularFator = (req: CalcularFatorRequest) =>
  apiFetch<FatorResultado>('/pricing/fator', { method: 'POST', body: JSON.stringify(req) })

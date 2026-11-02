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
  /** Alíquota do campo ICMS (fração); quando vem, o servidor usa ela no lugar da UF de destino. */
  aliquotaIcms?: number | null
  /** Soma dos custos cobrados em % do preço do serviço (fração). */
  custoPercentualServico: number
  /** Comissão desta operação (fração). Nulo = a do vendedor ou a da empresa. */
  comissoes?: number | null
  /** Vendedor da operação: a regra de comissão dele é o padrão. */
  vendedorId?: string | null
  /** Serviço do item: com impostos cadastrados, eles substituem os da empresa (e decidem o ICMS). */
  servicoId?: string | null
}

/** Um imposto do serviço já calculado (frações). */
export interface ImpostoCalculado {
  imposto: string
  nome: string
  base: number
  aliquota: number
  efetiva: number
  afetaPreco: boolean
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
  /** Base do DF%: a média mensal da meta ou a meta do mês corrente (ver basePreco). */
  faturamentoMensal: number
  /** Opção da meta: 'media' (preço estável no ano) ou 'mes' (muda a cada mês). */
  basePreco: 'media' | 'mes'
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
  /** 'servico' = a tabela do serviço; 'faltando' = sem serviço ou sem tabela (não precifica); 'media' = média dos serviços (painéis da empresa). */
  impostosOrigem?: 'servico' | 'faltando' | 'media'
  servicoNome?: string
  /** Os impostos do serviço, um a um (sem o ICMS, que vem em `icms`). */
  impostosDetalhe?: ImpostoCalculado[] | null
  /** Soma dos que só são destacados (fora do markup). */
  impostosDestacados?: number
  /** Nulo = o serviço não tem impostos (o ICMS segue a regra da empresa). */
  icms?: { incide: boolean; aliquota: number; afetaPreco: boolean } | null
  /** Tabela do serviço que valeu (regime e vigência), ou por que caiu nos impostos da empresa. */
  impostosNota?: string
}

export interface CalcularFatorRequest {
  empresaId: string
  /** Rascunho do formulário da empresa (simula antes de salvar). */
  empresa?: Unidade | null
  vendedorId?: string | null
  comissoes?: number | null
  /** Lucro da linha do Pricing (fração). Nulo = o da empresa. */
  lucro?: number | null
  /** Serviço do item: os impostos vêm dele (a tabela do regime da empresa em vigor). */
  servicoId?: string | null
  /** Precificação de item: sem serviço com impostos o fator não fica pronto (o Pricing bloqueia e diz por quê). */
  precificar?: boolean
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
  /** ICMS do serviço só destacado (não somado ao preço), em fração. */
  icmsDestacado?: number
}

export const calcularPreco = (req: CalcularPrecoRequest) =>
  apiFetch<CalcularPrecoResponse>('/pricing/calculate', { method: 'POST', body: JSON.stringify(req) })

export const calcularFator = (req: CalcularFatorRequest) =>
  apiFetch<FatorResultado>('/pricing/fator', { method: 'POST', body: JSON.stringify(req) })

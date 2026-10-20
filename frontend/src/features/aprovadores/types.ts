import type { ComissaoBase } from '@/features/parceiros/types'

/** O que a regra governa. */
export type TipoRegra = 'proposta' | 'compras' | 'comissao' | 'movimento'
export const TIPOS_REGRA: { valor: TipoRegra; label: string; descricao: string }[] = [
  {
    valor: 'proposta',
    label: 'Regra de Proposta (alçada de preço)',
    descricao: 'Propostas com preço editado ou margem abaixo do mínimo que caem nesta faixa precisam da assinatura dos aprovadores.',
  },
  {
    valor: 'compras',
    label: 'Regra de Compras (limite do comprador)',
    descricao: 'Até este valor o comprador lança a despesa sozinho, de qualquer fornecedor. Acima disso precisa de aprovação. As exceções não têm limite.',
  },
  {
    valor: 'movimento',
    label: 'Lançamentos financeiros (a pagar e a receber)',
    descricao: 'Todo lançamento do Financeiro nasce pendente. Os aprovadores da faixa de valor do lançamento precisam assinar antes da baixa. Sem regra que cubra o valor, ninguém aprova.',
  },
  {
    valor: 'comissao',
    label: 'Regra de Comissão (vendedor)',
    descricao: 'Perfil de comissão do vendedor. As regras detalhadas (por etapa do CRM, produtividade) entram quando o cliente enviar o detalhamento.',
  },
]

/** Sobre o que a faixa da regra de proposta é medida. */
export type BaseRegra = 'margem' | 'valor'

export const BASES_REGRA: { valor: BaseRegra; label: string }[] = [
  { valor: 'margem', label: 'Margem (%)' },
  { valor: 'valor', label: 'Valor da proposta (R$)' },
]

/** Regra do sistema, centralizada em Aprovadores e Regras. */
export interface RegraAprovacao {
  id: string
  nome: string
  tipo: TipoRegra
  status: 'ativo' | 'inativo'
  observacao: string

  // ── proposta ─────────────────────────────────────────────
  base: BaseRegra
  /** Início da faixa (fração quando base = margem; reais quando base = valor). */
  de: number
  /** Fim da faixa. 0 = sem teto. */
  ate: number
  /** Ids dos funcionários que precisam aprovar (proposta e compras). */
  aprovadores: string[]

  // ── lançamentos financeiros ──────────────────────────────
  /** "" = a pagar e a receber; ou só um dos dois. */
  tipoMovimento: '' | 'pagar' | 'receber'
  /** Empresa a que a regra de lançamento vale; "" = todas. */
  empresaId: string

  // ── compras ──────────────────────────────────────────────
  compradorId: string
  /** Limite em reais sem aprovação. */
  limite: number
  /** Fornecedores (ids) fora da regra. */
  excecoes: string[]

  // ── comissão ─────────────────────────────────────────────
  vendedorId: string
  comissaoPercentual: number
  comissaoBase: ComissaoBase
  etapaCrmId: string
}

export const regraVazia = (): RegraAprovacao => ({
  id: '',
  nome: '',
  tipo: 'proposta',
  status: 'ativo',
  observacao: '',
  base: 'margem',
  de: 0,
  ate: 0,
  aprovadores: [],
  tipoMovimento: '',
  empresaId: '',
  compradorId: '',
  limite: 0,
  excecoes: [],
  vendedorId: '',
  comissaoPercentual: 0,
  comissaoBase: 'preco',
  etapaCrmId: '',
})

/** Regras antigas (sem tipo) são de proposta. */
export const tipoDaRegra = (r: Partial<RegraAprovacao>): TipoRegra => r.tipo || 'proposta'

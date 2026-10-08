/** Grupo do DRE (natureza da conta). */
export type GrupoDre = 'Despesa' | 'Receita'

/** Natureza do gasto: fixa (não varia com a operação) ou variável. '' = não informado. */
export type TipoConta = '' | 'fixa' | 'variavel'
export const TIPOS_CONTA: { valor: TipoConta; label: string }[] = [
  { valor: '', label: 'Não informado' },
  { valor: 'fixa', label: 'Fixa' },
  { valor: 'variavel', label: 'Variável' },
]

/** Uma conta/categoria do plano de contas (estrutura em árvore). */
export interface PlanoConta {
  id: string
  /** Código hierárquico (ex.: 2, 2.01, 2.01.01). */
  codigo: string
  nome: string
  /** Conta-mãe; `null` = conta raiz (DESPESAS / RECEITAS). */
  paiId: string | null
  grupoDre: GrupoDre
  /** Conta contábil real (ex.: 20101). Opcional. */
  contaContabil?: string
  /** Linha do DRE em que a conta entra (ex.: "Receita Bruta de Vendas"). Opcional. */
  contaDre?: string
  /** Limite de gasto mensal (R$). Opcional (0 = sem limite). */
  limiteGasto?: number
  /** Fixa ou variável. Opcional. */
  tipo?: TipoConta
  status: 'ativo' | 'inativo'
}

/** Último segmento do código ("2.01.03" → "03"). */
const ultimoSegmento = (codigo: string) => codigo.split('.').pop() ?? ''

/**
 * Sugere o código da próxima conta, no padrão pedido pelo cliente:
 * raiz de Receita = 1, raiz de Despesa = 2; abaixo delas, sequencial com dois
 * dígitos por nível (1.01, 1.01.01...). Se a conta-pai já tem filhas, segue o
 * mesmo número de dígitos delas (para planos importados com 3 dígitos).
 */
export function sugerirCodigoConta(
  contas: PlanoConta[],
  paiId: string | null,
  grupoDre: GrupoDre,
): string {
  const irmaos = contas.filter((c) => c.paiId === paiId)
  const numeros = irmaos
    .map((c) => parseInt(ultimoSegmento(c.codigo), 10))
    .filter((n) => !Number.isNaN(n))
  const prox = (numeros.length ? Math.max(...numeros) : 0) + 1

  if (!paiId) {
    const preferido = grupoDre === 'Receita' ? 1 : 2
    return String(numeros.includes(preferido) ? Math.max(prox, preferido + 1) : preferido)
  }

  const pai = contas.find((c) => c.id === paiId)
  if (!pai) return String(prox)
  const pad = irmaos.length ? Math.max(2, ultimoSegmento(irmaos[0].codigo).length) : 2
  return `${pai.codigo}.${String(prox).padStart(pad, '0')}`
}

/** Linhas usuais do DRE (as mesmas do Omie); a conta aceita outra digitada. */
export const CONTAS_DRE = [
  'Receita Bruta de Vendas',
  'Deduções de Receita',
  'Outras Receitas',
  'Recuperação de Despesas Variáveis',
  'Custo dos Serviços Prestados',
  'Outros Custos',
  'Despesas Variáveis',
  'Despesas de Vendas e Marketing',
  'Despesas com Pessoal',
  'Despesas Administrativas',
  'Despesas Financeiras',
  'Outros Tributos',
  'Ativos',
] as const

/** Conta contábil sugerida a partir do código ("2.01.01" → "20101"). */
export const contaContabilDoCodigo = (codigo: string) => codigo.replace(/\./g, '')

/**
 * Financeiro (fase de layout): movimentos a pagar e a receber, carteiras (contas) e fluxo de caixa.
 * Um movimento é UMA parcela: o que se paga ou recebe numa data. Parcelamento gera vários movimentos
 * ligados pelo mesmo `grupoId` (1/3, 2/3, 3/3).
 */
export type TipoMovimento = 'receber' | 'pagar'

/** Situação calculada: em aberto (amarelo), atrasado (vermelho), liquidado (verde), cancelado (cinza). */
export type StatusMovimento = 'aberto' | 'atrasado' | 'liquidado' | 'cancelado'

/** De onde o movimento nasceu (para o rastro e para a automação futura). */
export type OrigemMovimento = 'manual' | 'proposta' | 'despesa' | 'conciliacao' | 'transferencia'

/** Situação da aprovação: todo lançamento nasce pendente. */
export type AprovacaoMovimento = 'pendente' | 'aprovado' | 'reprovado'

export const APROVACAO_LABEL: Record<AprovacaoMovimento, string> = {
  pendente: 'Pendente',
  aprovado: 'Aprovado',
  reprovado: 'Reprovado',
}

export interface AssinaturaMovimento {
  usuarioId: string
  nome: string
  em: string
}

export const TIPOS_MOVIMENTO: { valor: TipoMovimento; label: string }[] = [
  { valor: 'receber', label: 'A receber' },
  { valor: 'pagar', label: 'A pagar' },
]

export const STATUS_MOVIMENTO: Record<StatusMovimento, string> = {
  aberto: 'Em aberto',
  atrasado: 'Atrasado',
  liquidado: 'Liquidado',
  cancelado: 'Cancelado',
}

export const ORIGENS_MOVIMENTO: Record<OrigemMovimento, string> = {
  manual: 'Lançamento manual',
  proposta: 'Proposta aprovada',
  despesa: 'Despesa recorrente',
  conciliacao: 'Criado na conciliação',
  transferencia: 'Transferência entre contas',
}

export const PERIODICIDADES = [
  { valor: 'mensal', label: 'Mensal', meses: 1 },
  { valor: 'bimestral', label: 'Bimestral', meses: 2 },
  { valor: 'trimestral', label: 'Trimestral', meses: 3 },
  { valor: 'semestral', label: 'Semestral', meses: 6 },
  { valor: 'anual', label: 'Anual', meses: 12 },
] as const
export type Periodicidade = (typeof PERIODICIDADES)[number]['valor']

/** Conta bancária, caixa ou cartão por onde o dinheiro entra e sai. */
export interface Carteira {
  id: string
  nome: string
  /** Empresa (CNPJ) dona da conta. Vazio = carteira antiga, compartilhada por todas. */
  empresaId?: string
  /** "banco" | "caixa" | "cartao". */
  tipo: 'banco' | 'caixa' | 'cartao'
  banco: string
  agencia: string
  conta: string
  /** Saldo na data de abertura da carteira no sistema. */
  saldoInicial: number
  /** yyyy-MM-dd do saldo inicial. */
  saldoInicialEm: string
  cor: string
  status: 'ativo' | 'inativo'
}

/** A carteira atende a empresa? Cada CNPJ tem as suas contas; a sem empresa (antiga) atende todas. */
export const carteiraDaEmpresa = (c: Carteira, empresaId: string): boolean => !c.empresaId || !empresaId || c.empresaId === empresaId

export interface Movimento {
  id: string
  /** Número do lançamento, único (cada parcela tem o seu). Ausente antes de gravar. */
  numero?: number
  tipo: TipoMovimento
  empresaId: string
  /** Cliente (receber) ou fornecedor/funcionário (pagar). */
  parceiroId: string
  parceiroNome: string
  descricao: string
  /** Conta do plano de contas (receita para receber, despesa para pagar). */
  planoContaId: string
  centroCustoId: string
  /** Nº da NF, fatura ou boleto. */
  documento: string
  /** Mês de competência (yyyy-MM). */
  competencia: string
  /** yyyy-MM-dd. */
  vencimento: string
  valor: number
  /** Ajustes na baixa (R$). */
  desconto: number
  juros: number
  multa: number
  /** Preenchidos na liquidação. */
  pagoEm: string
  valorPago: number
  carteiraId: string
  formaPagamento: string
  /** Parcela n de N (1/1 quando não parcelado). */
  parcela: number
  totalParcelas: number
  /** Liga as parcelas do mesmo lançamento. */
  grupoId: string
  origem: OrigemMovimento
  /** Id da proposta ou da despesa que gerou o movimento (na transferência, a outra perna). */
  origemId: string
  /** Transferência entre contas: saída na origem + entrada no destino, ligadas (vem do servidor). */
  transferencia?: boolean
  /** Transferência já feita no banco: ao ser aprovada, entra baixada. */
  baixarAoAprovar?: boolean
  /** Pago por Pix pelo ELROND (vem do servidor): sem estorno nem alteração. */
  pagoPeloBanco?: boolean
  observacao: string
  cancelado: boolean
  /** Aprovação (regra do tipo movimento em Aprovadores e Regras). Ausente = pendente. */
  aprovacao?: AprovacaoMovimento
  /** Regra que cobre o lançamento; vazio = nenhuma regra cobre o valor. */
  regraId?: string
  aprovacoes?: AssinaturaMovimento[]
  reprovadoPor?: string
  reprovadoEm?: string
  motivoReprovacao?: string
  criadoPor?: string
  criadoEm?: string
}

export const movimentoVazio = (tipo: TipoMovimento = 'pagar'): Movimento => ({
  id: '',
  tipo,
  empresaId: '',
  parceiroId: '',
  parceiroNome: '',
  descricao: '',
  planoContaId: '',
  centroCustoId: '',
  documento: '',
  competencia: '',
  vencimento: '',
  valor: 0,
  desconto: 0,
  juros: 0,
  multa: 0,
  pagoEm: '',
  valorPago: 0,
  carteiraId: '',
  formaPagamento: '',
  parcela: 1,
  totalParcelas: 1,
  grupoId: '',
  origem: 'manual',
  origemId: '',
  observacao: '',
  cancelado: false,
  aprovacao: 'pendente',
})

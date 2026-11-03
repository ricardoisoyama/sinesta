export type StatusProposta = 'rascunho' | 'pendente' | 'enviada' | 'aprovada' | 'recusada'

/** Assinatura de um aprovador (compliance: quem liberou o preço e quando). */
export interface AprovacaoProposta {
  usuarioId: string
  nome: string
  /** Data e hora em ISO 8601. */
  em: string
}

/** Um custo lançado no item (tipo de custo do cadastro + valor desta operação). */
export interface CustoItemProposta {
  tipoCustoId: string
  nome: string
  /** "valor" | "percentual". */
  modo: string
  /** "nf" | "servico" (só quando percentual). */
  base: string
  /** Fração informada quando percentual (0,02 = 2%). */
  percentual: number
  /** Valor em reais que entrou no custo do item. */
  valor: number
}

/** Um item precificado (um cálculo salvo) que compõe uma proposta. */
export interface ItemProposta {
  id: string
  descricao: string
  /** Serviço vendido (cadastro em Cadastros > Serviços). */
  servicoId?: string
  empresaId: string
  custoTotal: number
  lucro: number
  desconto: number
  pv: number
  precoFinal: number
  ml: number
  /** Comissão usada no item (fração); pode ser menor que a padrão. Ausente nos itens antigos. */
  comissao?: number
  /** DF% e DV sem lucro usados no item (fração), para a conferência. Ausentes nos itens antigos. */
  dfPct?: number
  dvSem?: number
  /** Custo efetivamente executado, lançado depois da aprovação. 0 = não informado. */
  custoReal?: number
  /** Preço que o motor calculou, antes de o vendedor digitar outro. 0 = não editado. */
  precoCalculado?: number
  /** Memória dos custos lançados. */
  custos?: CustoItemProposta[]
  /** Preço abaixo do fator da empresa (margem abaixo do lucro). */
  abaixoMinimo?: boolean
  /** Retrato dos Dados da operação no dia (Pricing parametrizável). Ausente nos itens antigos. */
  dadosOperacao?: DadoOperacaoItem[] | null
  /** Tipo de operação precificado (id e nome do dia: "Transporte"). Nulo nos itens antigos. */
  tipoOperacaoId?: string | null
  tipoOperacao?: string | null
  /** Retrato das fichas técnicas usadas como custo. Ausente nos itens antigos. */
  fichas?: FichaItemProposta[] | null
  /** Ad valorem (R$) somado ao frete peso, fora do markup: frete total = precoFinal + adValorem. */
  adValorem?: number
  /** Proposta recorrente: como o item entra no contrato. Nulo no avulso e nos itens antigos. */
  cobranca?: CobrancaItem | null
  /** Unidade do preço por ocorrência ("hora", "diária"). */
  unidade?: string | null
}

export type ModalidadeProposta = 'avulso' | 'recorrente'
/** fixo = todo mês; lancamento = por ocorrência lançada; documento = por CT-e/documento; unico = uma vez. */
export type CobrancaItem = 'fixo' | 'lancamento' | 'documento' | 'unico'
export const ROTULO_COBRANCA_ITEM: Record<CobrancaItem, string> = {
  fixo: 'Todo mês',
  lancamento: 'Por ocorrência',
  documento: 'Por documento (CT-e)',
  unico: 'Uma vez (1ª fatura)',
}

export interface DadoOperacaoItem {
  campoId: string
  chave: string
  nome: string
  tipo: string
  efeito: string
  /** Como aparece (nome do cadastro escolhido, data, opção da lista...). */
  texto: string
  numero: number
}

export interface FichaComposicaoItem {
  nome: string
  tipo: string
  valor: number
  texto: string
  compoeTotal: boolean
}

export interface FichaItemProposta {
  /** Id do item da ficha (nome histórico do campo). */
  fichaId: string
  nome: string
  /** Nome da ficha (pasta) no dia: "Funcionários", "Tecnologia". Vazio em itens antigos. */
  grupo?: string
  quantidade: number
  custoUnitario: number
  total: number
  composicao: FichaComposicaoItem[]
}

/** Por que a proposta ficou pendente. */
export type MotivoAprovacao = '' | 'preco-editado' | 'abaixo-markup-minimo'

export interface Proposta {
  id: string
  numero: string
  cliente: string
  /** Cliente do cadastro (uuid). Vazio nas propostas antigas. */
  clienteId?: string
  vendedorId?: string
  vendedorNome?: string
  /** Quem gerou a proposta (nome do usuário, gravado pelo servidor). */
  criadoPor?: string
  status: StatusProposta
  data: string
  itens: ItemProposta[]
  total: number
  /** Modelo de proposta escolhido na geração (para o PDF). */
  modeloId?: string | null
  /** Prazo de entrega informado na precificação (texto livre). */
  prazoEntrega?: string
  /** Validade escolhida na precificação (ex.: "15 dias"). */
  validade?: string
  /** Forma de pagamento (do cadastro do cliente, ex.: "Boleto"). */
  formaPagamento?: string
  /** Prazo de pagamento em dias (do cadastro do cliente). */
  prazoPagamentoDias?: number
  /** Avulso (um serviço) ou recorrente (vira contrato com vigência). Ausente nas antigas = avulso. */
  modalidade?: ModalidadeProposta
  /** Recorrente: vigência combinada (yyyy-MM-dd). */
  vigenciaInicio?: string
  vigenciaFim?: string

  // ── Alçada (preço editado ou margem abaixo do mínimo) ──────────────────
  /** Soma dos preços calculados pelo motor, antes da edição. 0 = sem edição. */
  precoOriginal?: number
  /** Motivo informado por quem pediu o preço fora do cálculo. */
  justificativa?: string
  motivoAprovacao?: MotivoAprovacao
  /** Regra de alçada aplicada. */
  regraId?: string
  /** Quem já assinou a aprovação. */
  aprovacoes?: AprovacaoProposta[]
}

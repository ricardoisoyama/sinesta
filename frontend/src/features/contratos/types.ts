/**
 * Contrato (espelho de Domain/Entities/Contratos.cs). Duas modalidades:
 * - recorrente: contrato fixo, fatura todo período enquanto estiver vigente;
 * - spot: serviço avulso, uma fatura só, com os documentos do próprio serviço
 *   (3 fretes na semana = 3 spots).
 * Vale para qualquer tipo de operação: quem define campos e cobrança é o Modelo de Contrato.
 */
export type Modalidade = 'recorrente' | 'spot'

/** Recorrente: a gravada. Spot: vem da fatura (a faturar → faturado). */
export type SituacaoContrato = 'vigente' | 'suspenso' | 'encerrado' | 'a-faturar' | 'faturado'

/** Etapas da fatura (quem move é a Central de Faturamento; a pasta só mostra e reenvia a devolvida). */
export type SituacaoFatura = 'prevista' | 'a-conferir' | 'conferida' | 'devolvida' | 'nf-emitida' | 'boleto-emitido' | 'atrasada' | 'recebida' | 'cancelada'

/** Regra de um componente de cobrança (o que entra na fatura e como se calcula). */
export type RegraComponente = 'fixo' | 'lancamento' | 'documento' | 'formula' | 'unico'

export interface ItemEscopo {
  id: string
  /** Apelido do componente fixo (usado nas fórmulas: `posto * 20%`). */
  apelido: string
  /** Linha de tabela de preços (ex.: frete por rota): não entra na mensalidade, só referencia o preço. */
  tabela: boolean
  servico: string
  descricao: string
  quantidade: number
  unidade: string
  /** Preço de venda unitário (vem do Pricing). */
  valorUnitario: number
  /** Custo unitário precificado. */
  custoUnitario: number
}

/** Cada aditivo cria uma versão nova do escopo; as anteriores ficam no histórico. */
export interface VersaoEscopo {
  versao: number
  vigenteDesde: string
  motivo: string
  itens: ItemEscopo[]
}

export interface CondicoesContrato {
  /** yyyy-MM da primeira fatura pelo ELROND (as anteriores foram cobradas fora). */
  faturarDesde: string
  diaFaturamento: number
  /** Mês do serviço cobrado na fatura. */
  referencia: 'mes-anterior' | 'mes-atual'
  diaVencimento: number
  anteciparFimDeSemana: boolean
  renovacaoAutomatica: boolean
  avisoPrevioDias: number
  reajusteIndice: 'IPCA' | 'IGP-M' | 'INPC' | 'Negociado'
  /** Mês-base do reajuste (1–12). Começa só como aviso para alguém aplicar. */
  reajusteMesBase: number
  multaRescisoria: string
  /** Conta do Caixa que recebe. */
  carteiraId: string
  formaCobranca: string
  prazoPagamentoDias: number
  /** Documentos vinculados (fretes com CT-e): uma fatura com os do período ou uma por documento. */
  agrupamento: 'periodo' | 'por-documento'
  fechamento: 'mensal' | 'quinzenal' | 'semanal'
}

/** Componente de cobrança do contrato que não é a mensalidade fixa (essa mora no escopo). */
export interface ComponenteContrato {
  id: string
  apelido: string
  nome: string
  regra: RegraComponente
  unidade: string
  valorUnitario: number
  /** Único: quantidade cobrada uma vez, na primeira fatura. */
  quantidade: number
  formula: string
  /** Documento vinculado: CT-e, NF-e, OS... */
  documento: string
  ativo: boolean
}

/** Documento da operação vinculado ao contrato (ex.: frete com CT-e e MDF-e). */
export interface DocumentoVinculado {
  id: string
  tipo: string
  numero: string
  data: string
  descricao: string
  valor: number
  mdfe: string
  canhoto: boolean
  situacao: 'em-transito' | 'entregue' | 'cancelado'
}

export type TipoExtra = 'hora-extra' | 'custo-extra' | 'ocorrencia'
export type CobrancaExtra = 'proxima-fatura' | 'separado' | 'nao-cobrar'

export interface ExtraContrato {
  id: string
  data: string
  tipo: TipoExtra
  descricao: string
  quantidade: number
  valorUnitario: number
  cobranca: CobrancaExtra
  /** Competência da fatura emitida em que entrou (vazio = ainda a faturar). */
  faturadoEm: string
  lancadoPor: string
}

export type TipoEvento = 'assinatura' | 'fatura' | 'aditivo' | 'reajuste' | 'extra' | 'ocorrencia' | 'renovacao' | 'documento' | 'encerramento'

export interface EventoContrato {
  /** Data e hora (ISO 8601). */
  em: string
  tipo: TipoEvento
  texto: string
  quem: string
}

export interface Contrato {
  id: string
  numero: string
  empresaId: string
  clienteId: string
  /** Retrato do cliente no cadastro do contrato. */
  clienteNome: string
  clienteDocumento: string
  contato: string
  modeloId: string
  tipoOperacao: string
  modalidade: Modalidade
  /** Gravada no recorrente (vigente | suspenso | encerrado). No spot, use `situacaoDe`. */
  situacao: SituacaoContrato
  /** yyyy-MM-dd. No spot, início = fim = data do serviço. */
  inicio: string
  fim: string
  localServico: string
  propostaId: string
  propostaNumero: string
  /** Serviço do cadastro de serviços: é ele que sai na nota. */
  servicoId: string
  textoAdicionalNota: string
  escopo: VersaoEscopo[]
  condicoes: CondicoesContrato
  /** Valores das características do modelo, por apelido. */
  caracteristicas: Record<string, string | number>
  /** Componentes além da mensalidade: fórmulas, lançamentos, documentos, cobrança única. */
  componentes: ComponenteContrato[]
  extras: ExtraContrato[]
  /** Documentos da operação vinculados (fretes com CT-e...). */
  documentos: DocumentoVinculado[]
  eventos: EventoContrato[]
  criadoEm: string
  criadoPor: string
}

/** Linha da composição da fatura (fixos, fórmulas, cobrança única; lançamento e documento = variável). */
export interface LinhaComposicao {
  apelido: string
  nome: string
  regra: RegraComponente
  /** Null = variável ou fórmula com erro. */
  valor: number | null
  detalhe: string
  erro: string
}

export interface VersaoFatura {
  em: string
  quem: string
  texto: string
  total: number
}

/** Fatura (fotografia calculada do contrato; com a NF registrada, trava). */
export interface Fatura {
  id: string
  chave: string
  contratoId: string
  empresaId: string
  /** Fatura de um extra cobrado separado do contrato. */
  avulsa: boolean
  descricao: string
  /** yyyy-MM. */
  competencia: string
  referencia: string
  vencimento: string
  previsto: number
  descontos: number
  total: number
  composicao: LinhaComposicao[]
  documentos: DocumentoVinculado[]
  extras: ExtraContrato[]
  extrasFora: string[]
  situacao: SituacaoFatura
  nf: string
  /** NFS-e emitida pelo ELROND para a fatura (vazio = registrada à mão ou ainda não emitida). */
  nfseId?: string
  boleto: string
  recebidaEm: string
  motivo: string
  versoes: VersaoFatura[]
}

/** O que o servidor devolve: contratos e as faturas deles (a tela junta com os cadastros). */
export interface ContratosEFaturas {
  contratos: Contrato[]
  faturas: Fatura[]
}

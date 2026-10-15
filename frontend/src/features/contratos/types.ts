/**
 * Contrato (protótipo). Duas modalidades:
 * - recorrente: contrato fixo, fatura todo mês enquanto estiver vigente;
 * - spot: serviço avulso, uma fatura só, com os documentos do próprio serviço
 *   (3 fretes na semana = 3 spots).
 * Vale para qualquer tipo de operação (os mesmos tipos dos Dados da Operação).
 */
export type Modalidade = 'recorrente' | 'spot'

export type SituacaoContrato = 'vigente' | 'suspenso' | 'encerrado' | 'a-faturar' | 'faturado'

/** Etapas da fatura (o que anda todo mês). A pasta do contrato só mostra; quem move é a Central de Faturamento. */
export type SituacaoFatura = 'prevista' | 'a-conferir' | 'conferida' | 'nf-emitida' | 'boleto-emitido' | 'recebida' | 'atrasada' | 'problema'

export interface ItemEscopo {
  id: string
  servico: string
  descricao: string
  quantidade: number
  unidade: string
  /** Preço de venda unitário (vem do Pricing). */
  valorUnitario: number
  /** Custo unitário precificado (custo logístico/ficha). */
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
  diaFaturamento: number
  /** Mês de referência do serviço cobrado na fatura. */
  referencia: 'mes-anterior' | 'mes-atual'
  diaVencimento: number
  anteciparFimDeSemana: boolean
  renovacaoAutomatica: boolean
  avisoPrevioDias: number
  reajusteIndice: 'IPCA' | 'IGP-M' | 'INPC' | 'Negociado'
  /** Mês-base do reajuste (1–12). Começa só como aviso para alguém aplicar. */
  reajusteMesBase: number
  multaRescisoria: string
  carteira: string
  formaCobranca: string
  prazoPagamentoDias: number
}

export interface FaturaContrato {
  id: string
  /** yyyy-MM. */
  competencia: string
  /** yyyy-MM-dd. */
  vencimento: string
  previsto: number
  extras: number
  descontos: number
  situacao: SituacaoFatura
  nf?: string
  boleto?: string
  recebidoEm?: string
  problema?: string
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
  /** Competência em que entrou (vazio = ainda não faturado). */
  faturadoEm?: string
  lancadoPor: string
}

export interface DocumentoContrato {
  id: string
  nome: string
  tipo: 'contrato' | 'aditivo' | 'proposta' | 'cte' | 'mdfe' | 'canhoto' | 'outro'
  data: string
  tamanho: string
}

export type TipoEvento = 'assinatura' | 'fatura' | 'aditivo' | 'reajuste' | 'extra' | 'ocorrencia' | 'renovacao' | 'documento' | 'encerramento'

export interface EventoContrato {
  data: string
  tipo: TipoEvento
  texto: string
  quem: string
}

export interface Contrato {
  id: string
  numero: string
  empresaId: string
  empresaNome: string
  clienteNome: string
  clienteDocumento: string
  contato: string
  /** Mesmo tipo dos Dados da Operação (Terceirização, Armazenagem, Transporte...). */
  tipoOperacao: string
  modalidade: Modalidade
  situacao: SituacaoContrato
  /** yyyy-MM-dd. No spot, início = data do serviço e fim = início. */
  inicio: string
  fim: string
  propostaNumero: string
  propostaAprovadaEm: string
  /** Serviço do cadastro de serviços: os parâmetros da NFS-e (código, ISS, retenção) vêm de lá. */
  servicoNfse: string
  servicoNfseDetalhe: string
  textoAdicionalNota: string
  centroCusto: string
  responsavel: string
  escopo: VersaoEscopo[]
  condicoes: CondicoesContrato
  faturas: FaturaContrato[]
  extras: ExtraContrato[]
  documentos: DocumentoContrato[]
  eventos: EventoContrato[]
  /** Spot: origem e destino ou local do serviço. */
  localServico?: string
  /** Margem realizada no período (custo real lançado ÷ receita), do RPO. */
  margemRealizada: number
}

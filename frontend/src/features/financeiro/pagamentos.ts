import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'

/** Pagamento pelo banco (piloto: Pix), espelho de PagamentoBancario. */
export type SituacaoPagamento = 'represado' | 'pendente' | 'aguardando-aprovacao' | 'agendado' | 'processando' | 'pago' | 'recusado' | 'cancelado' | 'falha' | 'incerto'

export interface PagamentoBancario {
  id: string
  empresaId: string
  banco: string
  ambiente: string
  movimentoId: string
  movimentoNumero: number
  favorecidoNome: string
  favorecidoEmail: string
  chave: string
  /** pix | boleto */
  forma?: 'pix' | 'boleto'
  codigoBarras?: string
  vencimentoBoleto?: string
  beneficiario?: string
  /** Quem liberou o represado para o banco e quando. */
  liberadoPor?: string
  liberadoEm?: string
  valor: number
  data: string
  descricao: string
  situacao: SituacaoPagamento
  situacaoBanco: string
  idBanco: string
  endToEnd: string
  mensagem: string
  pagoEm: string
  avisoEm: string
  confirmadaEm: string
  confirmadaPor: string
  emailEm: string
  emailSituacao: string
  criadoEm: string
  criadoPor: string
}

export interface PreparoPagamento {
  movimentoId: string
  numero: number
  empresaId: string
  favorecido: string
  email: string
  chaveSugerida: string
  valor: number
  vencimento: string
  descricao: string
  banco: string
  problema: string
  atual: PagamentoBancario | null
}

export interface ResultadoAgendamento {
  movimentoId: string
  ok: boolean
  mensagem: string
  pagamento: PagamentoBancario | null
}

export const ROTULO_PAGAMENTO: Record<SituacaoPagamento, string> = {
  represado: 'Represado: aguarda liberação no Monitor',
  pendente: 'Enviando ao banco',
  'aguardando-aprovacao': 'Pix aguardando aprovação no app',
  agendado: 'Pix agendado no banco',
  processando: 'Pix em processamento',
  pago: 'Pix pago pelo ELROND',
  recusado: 'Recusado pelo banco',
  cancelado: 'Cancelado no banco',
  falha: 'Falhou no banco',
  incerto: 'Sem confirmação (conferindo)',
}

/** Rótulo da situação com a forma certa ("Boleto aguardando aprovação no app"). */
export const rotuloPagamento = (p: Pick<PagamentoBancario, 'situacao' | 'forma'>) =>
  p.forma === 'boleto' ? ROTULO_PAGAMENTO[p.situacao].replace(/^Pix /, 'Boleto ') : ROTULO_PAGAMENTO[p.situacao]

/** Pagamento que ainda vale para o lançamento (não terminou recusado/cancelado/falha). */
export const vigente = (p: PagamentoBancario) => !['recusado', 'cancelado', 'falha'].includes(p.situacao)

const base = '/pagamentos'
export const listarPagamentos = () => apiFetch<PagamentoBancario[]>(base)
export const prepararPagamentos = (movimentoIds: string[]) => apiFetch<PreparoPagamento[]>(`${base}/preparar`, { method: 'POST', body: JSON.stringify({ movimentoIds }) })
export interface ItemAgendamento {
  movimentoId: string
  chave: string
  forma?: 'pix' | 'boleto'
  /** Boleto: linha digitável ou código de barras. */
  codigo?: string
  /** Boleto sem vencimento no código (conta de consumo): yyyy-MM-dd. */
  vencimento?: string
}
export const agendarPagamentos = (itens: ItemAgendamento[], data: string) =>
  apiFetch<ResultadoAgendamento[]>(`${base}/agendar`, { method: 'POST', body: JSON.stringify({ itens, data }) })
/** Monitor dos pagamentos assistidos. */
export interface ConferenciaMonitor {
  nivel: 'ok' | 'aviso' | 'erro'
  texto: string
}
export interface ItemMonitor {
  pagamento: PagamentoBancario
  empresa: string
  conta: string
  valorLancamento: number
  vencimentoLancamento: string
  aprovacao: string
  descricaoLancamento: string
  conferencias: ConferenciaMonitor[]
}
export const listarMonitor = () => apiFetch<ItemMonitor[]>(`${base}/monitor`)
export const liberarPagamento = (id: string) => apiFetch<PagamentoBancario>(`${base}/${encodeURIComponent(id)}/liberar`, { method: 'POST' })
export const cancelarRepresado = (id: string) => apiFetch<PagamentoBancario>(`${base}/${encodeURIComponent(id)}/cancelar-represado`, { method: 'POST' })
export const descartarPagamento = (id: string) => apiFetch<PagamentoBancario>(`${base}/${encodeURIComponent(id)}/descartar`, { method: 'POST' })
export const atualizarPagamento = (id: string) => apiFetch<PagamentoBancario>(`${base}/${encodeURIComponent(id)}/atualizar`, { method: 'POST' })

/** Pagamentos pelo banco (só quem tem a permissão do piloto). Enquanto algum espera o banco, relê a cada 20 s. */
export function usePagamentos(habilitado: boolean) {
  return useQuery({
    queryKey: ['financeiro', 'pagamentos'],
    queryFn: listarPagamentos,
    enabled: habilitado,
    refetchInterval: (q) => ((q.state.data ?? []).some((p) => ['pendente', 'aguardando-aprovacao', 'agendado', 'processando', 'incerto'].includes(p.situacao)) ? 20_000 : false),
  })
}

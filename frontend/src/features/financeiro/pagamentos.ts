import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'

/** Pagamento pelo banco (piloto: Pix), espelho de PagamentoBancario. */
export type SituacaoPagamento = 'pendente' | 'aguardando-aprovacao' | 'agendado' | 'processando' | 'pago' | 'recusado' | 'cancelado' | 'falha' | 'incerto'

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

/** Pagamento que ainda vale para o lançamento (não terminou recusado/cancelado/falha). */
export const vigente = (p: PagamentoBancario) => !['recusado', 'cancelado', 'falha'].includes(p.situacao)

const base = '/pagamentos'
export const listarPagamentos = () => apiFetch<PagamentoBancario[]>(base)
export const prepararPagamentos = (movimentoIds: string[]) => apiFetch<PreparoPagamento[]>(`${base}/preparar`, { method: 'POST', body: JSON.stringify({ movimentoIds }) })
export const agendarPagamentos = (itens: { movimentoId: string; chave: string }[], data: string) =>
  apiFetch<ResultadoAgendamento[]>(`${base}/agendar`, { method: 'POST', body: JSON.stringify({ itens, data }) })
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

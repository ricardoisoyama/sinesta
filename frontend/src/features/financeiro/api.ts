import { apiFetch } from '@/lib/api'
import type { RegraConciliacao } from './conciliar'
import type { Carteira, Movimento, Periodicidade } from './types'

const J = (corpo: unknown) => JSON.stringify(corpo)

// ── carteiras ──
export const listCarteiras = () => apiFetch<Carteira[]>('/financeiro/carteiras')
export const criarCarteira = (c: Carteira) => apiFetch<Carteira>('/financeiro/carteiras', { method: 'POST', body: J(c) })
export const atualizarCarteira = (c: Carteira) => apiFetch<Carteira>(`/financeiro/carteiras/${c.id}`, { method: 'PUT', body: J(c) })

// ── lançamentos ──
export const listMovimentos = () => apiFetch<Movimento[]>('/financeiro/movimentos')
export const criarMovimento = (movimento: Movimento, parcelas: number, periodicidade: Periodicidade) =>
  apiFetch<Movimento[]>('/financeiro/movimentos', { method: 'POST', body: J({ movimento, parcelas, periodicidade }) })
export const atualizarMovimento = (m: Movimento) => apiFetch<Movimento>(`/financeiro/movimentos/${m.id}`, { method: 'PUT', body: J(m) })
export const liquidarMovimentos = (b: { ids: string[]; pagoEm: string; carteiraId: string; desconto?: number; juros?: number; multa?: number }) =>
  apiFetch<number>('/financeiro/movimentos/liquidar', { method: 'POST', body: J(b) })
export const estornarMovimento = (id: string) => apiFetch<Movimento>(`/financeiro/movimentos/${id}/estornar`, { method: 'POST' })
export const cancelarMovimentos = (ids: string[]) => apiFetch<number>('/financeiro/movimentos/cancelar', { method: 'POST', body: J({ ids }) })
export const aprovarMovimento = (id: string) => apiFetch<Movimento>(`/financeiro/movimentos/${id}/aprovar`, { method: 'POST' })
export const reprovarMovimento = (id: string, motivo: string) =>
  apiFetch<Movimento>(`/financeiro/movimentos/${id}/reprovar`, { method: 'POST', body: J({ motivo }) })

// ── conciliação ──
export interface ExtratoLinhaApi {
  id: string
  carteiraId: string
  fitid: string
  data: string
  valor: number
  memo: string
  situacao: 'pendente' | 'conciliado' | 'ignorado'
  movimentoId: string
}
export const listExtrato = (carteiraId: string) => apiFetch<ExtratoLinhaApi[]>(`/financeiro/conciliacao?carteiraId=${encodeURIComponent(carteiraId)}`)
export const importarExtrato = (carteiraId: string, linhas: { fitid: string; data: string; valor: number; memo: string }[]) =>
  apiFetch<{ novas: number; jaImportadas: number }>('/financeiro/conciliacao/importar', { method: 'POST', body: J({ carteiraId, linhas }) })
/** Contas do Caixa ligadas a uma integração bancária com extrato pela API. */
export const listContasComExtrato = () => apiFetch<{ carteiraId: string; banco: string; ambiente: string }[]>('/financeiro/conciliacao/contas-com-extrato')
/** Lê o extrato pela API do banco no período e grava como o OFX (o que já veio não duplica). */
export const buscarDoBanco = (carteiraId: string, de: string, ate: string) =>
  apiFetch<{ lidas: number; novas: number; jaImportadas: number; de: string; ate: string }>('/financeiro/conciliacao/buscar-banco', { method: 'POST', body: J({ carteiraId, de, ate }) })
export const vincularExtrato = (linhaId: string, movimentoId: string) =>
  apiFetch<ExtratoLinhaApi>('/financeiro/conciliacao/vincular', { method: 'POST', body: J({ linhaId, movimentoId }) })
export const criarDoExtrato = (d: { linhaId: string; parceiroNome: string; descricao: string; planoContaId: string; centroCustoId: string; formaPagamento: string; empresaId: string }) =>
  apiFetch<ExtratoLinhaApi>('/financeiro/conciliacao/criar', { method: 'POST', body: J(d) })
export const desfazerExtrato = (linhaId: string) => apiFetch<ExtratoLinhaApi>(`/financeiro/conciliacao/${linhaId}/desfazer`, { method: 'POST' })
export const ignorarExtrato = (linhaId: string) => apiFetch<ExtratoLinhaApi>(`/financeiro/conciliacao/${linhaId}/ignorar`, { method: 'POST' })

// ── de/para da conciliação ──
export const listRegrasConciliacao = () => apiFetch<(RegraConciliacao & { status?: string })[]>('/financeiro/regras-conciliacao')
export const criarRegraConciliacao = (r: RegraConciliacao) =>
  apiFetch<RegraConciliacao>('/financeiro/regras-conciliacao', { method: 'POST', body: J({ ...r, status: 'ativo' }) })
export const inativarRegraConciliacao = (id: string) => apiFetch<void>(`/financeiro/regras-conciliacao/${id}`, { method: 'DELETE' })

import { useEffect, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { apiBlob, apiFetch } from '@/lib/api'

/** A NFS-e como a Central mostra (espelho de NotaFiscalServicoDto). */
export interface NotaNfse {
  id: string
  situacao: 'Pendente' | 'Processando' | 'Emitida' | 'Rejeitada' | 'Cancelando' | 'Cancelada'
  mensagem: string
  numero: string
  ambiente: string
  valorServicos: number
  valorIss: number
  valorRetido: number
  valorLiquido: number
  emAndamento: boolean
  temArquivos: boolean
}

export interface NfseDaFatura {
  faturaId: string
  nota: NotaNfse | null
  /** Situação da fatura depois de aplicar a nota (emitida → "nf-emitida"). */
  fatura: string
}

export const PERMISSAO_NFSE = '/fiscal/nfse'

export const emitirNfseFatura = (id: string) => apiFetch<NfseDaFatura>(`/faturas/${encodeURIComponent(id)}/nfse`, { method: 'POST' })
export const atualizarNfseFatura = (id: string) => apiFetch<NfseDaFatura>(`/faturas/${encodeURIComponent(id)}/nfse/atualizar`, { method: 'POST' })

/** PDF ou XML da nota numa guia nova (a guia abre antes da resposta, senão o navegador bloqueia). */
export async function abrirArquivoNfse(notaId: string, tipo: 'pdf' | 'xml') {
  const guia = window.open('', '_blank')
  try {
    const url = URL.createObjectURL(await apiBlob(`/fiscal/nfse/${encodeURIComponent(notaId)}/${tipo}`))
    if (guia) guia.location.href = url
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
  } catch (e) {
    guia?.close()
    throw e
  }
}

/**
 * Situação das NFS-e das faturas do mês. Enquanto alguma está na prefeitura, pergunta a cada 10 s; a nota
 * que sai emitida vira a NF da fatura no servidor, e a lista da Central recarrega.
 */
export function useNfseDasFaturas(faturaIds: string[], aoMudar: () => void) {
  const qc = useQueryClient()
  const chave = ['faturas-nfse', [...faturaIds].sort().join(',')]
  const q = useQuery({
    queryKey: chave,
    enabled: faturaIds.length > 0,
    queryFn: () => apiFetch<NfseDaFatura[]>('/faturas/nfse/situacao', { method: 'POST', body: JSON.stringify({ ids: faturaIds }) }),
    refetchInterval: (query) => (query.state.data?.some((n) => n.nota?.emAndamento) ? 10_000 : false),
  })
  // Uma nota terminou (emitida ou rejeitada): a fatura pode ter mudado de etapa.
  const antes = useRef('')
  useEffect(() => {
    const assinatura = (q.data ?? []).map((n) => `${n.faturaId}:${n.nota?.situacao}:${n.fatura}`).join('|')
    if (antes.current && assinatura !== antes.current) aoMudar()
    antes.current = assinatura
  }, [q.data, aoMudar])
  const porFatura = new Map((q.data ?? []).map((n) => [n.faturaId, n]))
  return { porFatura, recarregar: () => qc.invalidateQueries({ queryKey: ['faturas-nfse'] }) }
}

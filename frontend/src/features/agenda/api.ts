import { useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import type { Compromisso } from './types'

const J = (c: unknown) => JSON.stringify(c)

export const listCompromissos = () => apiFetch<Compromisso[]>('/compromissos')
export const criarCompromisso = (c: Compromisso) => apiFetch<Compromisso>('/compromissos', { method: 'POST', body: J(c) })
export const atualizarCompromisso = (c: Compromisso) => apiFetch<Compromisso>(`/compromissos/${c.id}`, { method: 'PUT', body: J(c) })
/** Excluir é inativar: o compromisso sai da Agenda e fica no histórico. */
export const excluirCompromisso = (id: string) => apiFetch<void>(`/compromissos/${id}`, { method: 'DELETE' })

const CHAVE = ['compromissos']

/** Compromissos ativos e as ações que gravam e recarregam a lista (lançam o erro do servidor). */
export function useCompromissos() {
  const qc = useQueryClient()
  const q = useQuery({ queryKey: CHAVE, queryFn: listCompromissos })
  const depois = async <T,>(p: Promise<T>) => {
    try {
      return await p
    } finally {
      await qc.invalidateQueries({ queryKey: CHAVE })
    }
  }
  return {
    compromissos: (q.data ?? []).filter((c) => (c.status ?? 'ativo') === 'ativo'),
    carregando: q.isLoading,
    salvar: (c: Compromisso) => depois(c.id ? atualizarCompromisso(c) : criarCompromisso(c)),
    excluir: (id: string) => depois(excluirCompromisso(id)),
  }
}

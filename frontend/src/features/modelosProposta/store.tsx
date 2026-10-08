import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ModeloProposta } from './types'
import { createModelo, listModelos, updateModelo } from '@/features/cadastros/api'

const KEY = ['modelos-proposta']

/** Modelos de proposta (todos, inclusive inativos: propostas antigas ainda imprimem com eles). */
export function useModelosProposta() {
  const qc = useQueryClient()
  const { data } = useQuery({ queryKey: KEY, queryFn: listModelos })

  const inval = () => qc.invalidateQueries({ queryKey: KEY })
  const addM = useMutation({ mutationFn: (m: ModeloProposta) => createModelo(m), onSuccess: inval })
  const updM = useMutation({ mutationFn: (m: ModeloProposta) => updateModelo(m), onSuccess: inval })

  // Modelos antigos vêm sem os blocos das páginas: vira lista vazia (o servidor espera a lista).
  const modelos = (data ?? []).map((m) => ({ ...m, status: m.status ?? 'ativo', paginas: (m.paginas ?? []).map((p) => ({ ...p, itens: p.itens ?? [] })) }))
  return {
    modelos,
    /** Só os que podem ser escolhidos numa proposta nova. */
    ativos: modelos.filter((m) => m.status !== 'inativo'),
    add: (m: ModeloProposta) => addM.mutateAsync(m),
    update: (m: ModeloProposta) => updM.mutateAsync(m),
    setStatus: (m: ModeloProposta, status: 'ativo' | 'inativo') => updM.mutateAsync({ ...m, status }),
  }
}

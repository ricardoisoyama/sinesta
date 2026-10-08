import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { CenarioMeta } from './mock'
import { createMeta, listMetas, updateMeta } from '@/features/cadastros/api'

const KEY = ['metas']

/** Cenários de meta persistidos no backend (react-query). Metas inativas não aparecem. */
export function useMetas() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({ queryKey: KEY, queryFn: listMetas })

  const inval = () => qc.invalidateQueries({ queryKey: KEY })
  const addM = useMutation({ mutationFn: (m: CenarioMeta) => createMeta(m), onSuccess: inval })
  const updM = useMutation({ mutationFn: (m: CenarioMeta) => updateMeta(m), onSuccess: inval })

  return {
    metas: (data ?? []).filter((m) => m.status !== 'inativo'),
    isLoading,
    add: (m: CenarioMeta) => addM.mutateAsync(m),
    update: (m: CenarioMeta) => updM.mutateAsync(m),
    /** Exclusão lógica: a meta fica guardada (com quem/quando) e sai da tela. */
    inativar: (m: CenarioMeta) => updM.mutateAsync({ ...m, status: 'inativo' }),
  }
}

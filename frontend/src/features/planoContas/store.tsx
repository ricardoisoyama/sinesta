import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import type { PlanoConta } from './types'
import { createPlanoConta, listPlanoContas, updatePlanoConta } from '@/features/cadastros/api'

const KEY = ['plano-contas']

const porCodigo = (a: PlanoConta, b: PlanoConta) =>
  a.codigo.localeCompare(b.codigo, undefined, { numeric: true })

/** Mantido por compatibilidade (o estado agora vem do react-query). */
export function PlanoContasProvider({ children }: { children: ReactNode }) {
  return <>{children}</>
}

// eslint-disable-next-line react-refresh/only-export-components
export function usePlanoContas() {
  const qc = useQueryClient()
  const { data } = useQuery({ queryKey: KEY, queryFn: listPlanoContas })
  const contas = data ?? []

  const inval = () => qc.invalidateQueries({ queryKey: KEY })
  const addM = useMutation({ mutationFn: (c: PlanoConta) => createPlanoConta(c), onSuccess: inval })
  const updM = useMutation({ mutationFn: (c: PlanoConta) => updatePlanoConta(c), onSuccess: inval })

  const filhosDe = (paiId: string | null) => contas.filter((c) => c.paiId === paiId).sort(porCodigo)
  const temFilhos = (id: string) => contas.some((c) => c.paiId === id)
  const descendentes = (id: string): string[] => {
    const out: string[] = [id]
    for (const f of contas.filter((c) => c.paiId === id)) out.push(...descendentes(f.id))
    return out
  }
  const analiticas = () => contas.filter((c) => !contas.some((x) => x.paiId === c.id)).sort(porCodigo)
  const nome = (id: string) => {
    const c = contas.find((x) => x.id === id)
    return c ? `${c.codigo} · ${c.nome}` : '—'
  }

  return {
    contas,
    add: (c: PlanoConta) => addM.mutateAsync(c),
    update: (id: string, patch: Partial<PlanoConta>) => {
      const cur = contas.find((x) => x.id === id)
      if (!cur) return Promise.resolve()
      return updM.mutateAsync({ ...cur, ...patch })
    },
    filhosDe,
    temFilhos,
    descendentes,
    analiticas,
    nome,
  }
}

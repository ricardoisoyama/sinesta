import { useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch, getErrorMessage } from '@/lib/api'
import type { Hipotese } from './motor'

/** Cenário da projeção (CenarioProjecao no servidor). As hipóteses vivem só nele. */
export interface Cenario {
  id: string
  nome: string
  hipoteses: Hipotese[]
  status: 'ativo' | 'inativo'
}

type HipoteseApi = Omit<Hipotese, 'fim' | 'custoId'> & { fim: string; custoId: string }
type CenarioApi = Omit<Cenario, 'hipoteses'> & { hipoteses: HipoteseApi[] }

const deApi = (c: CenarioApi): Cenario => ({ ...c, hipoteses: c.hipoteses.map((h) => ({ ...h, fim: h.fim || undefined, custoId: h.custoId || undefined })) })
const paraApi = (c: Cenario): CenarioApi => ({ ...c, hipoteses: c.hipoteses.map((h) => ({ ...h, fim: h.fim ?? '', custoId: h.custoId ?? '' })) })

const base = '/cenarios-projecao'
const listar = async () => (await apiFetch<CenarioApi[]>(base)).filter((c) => c.status !== 'inativo').map(deApi)
const criar = async (c: Omit<Cenario, 'id' | 'status'>) => deApi(await apiFetch<CenarioApi>(base, { method: 'POST', body: JSON.stringify(paraApi({ ...c, id: '', status: 'ativo' })) }))
const atualizar = (c: Cenario) => apiFetch<CenarioApi>(`${base}/${c.id}`, { method: 'PUT', body: JSON.stringify(paraApi(c)) })
const excluir = (id: string) => apiFetch<void>(`${base}/${id}`, { method: 'DELETE' })

/**
 * Cenários gravados no servidor. A tela mexe no estado local e cada cenário alterado grava sozinho
 * um instante depois (renomear letra a letra não vira uma gravação por tecla).
 */
export function useCenarios() {
  const qc = useQueryClient()
  const q = useQuery({ queryKey: ['cenarios-projecao'], queryFn: listar })
  const [editados, setEditados] = useState<Record<string, Cenario>>({})
  const [removidos, setRemovidos] = useState<string[]>([])
  const [erro, setErro] = useState('')
  const timers = useRef<Record<string, number>>({})

  const cenarios = (q.data ?? []).filter((c) => !removidos.includes(c.id)).map((c) => editados[c.id] ?? c)
  const falhou = (e: unknown) => setErro(getErrorMessage(e))

  const alterar = (c: Cenario) => {
    setEditados((x) => ({ ...x, [c.id]: c }))
    window.clearTimeout(timers.current[c.id])
    timers.current[c.id] = window.setTimeout(() => {
      atualizar(c).then(() => setErro('')).catch(falhou)
    }, 700)
  }
  const novo = async (dados: Omit<Cenario, 'id' | 'status'>) => {
    try {
      const c = await criar(dados)
      await qc.invalidateQueries({ queryKey: ['cenarios-projecao'] })
      return c
    } catch (e) {
      falhou(e)
      return null
    }
  }
  const remover = (id: string) => {
    setRemovidos((x) => [...x, id])
    excluir(id).catch(falhou)
  }
  return { cenarios, carregando: q.isLoading, alterar, novo, remover, erro }
}

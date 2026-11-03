import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import { definirFeriados } from '@/features/financeiro/diasUteis'

/** Feriado do cadastro (estadual, municipal); os nacionais o sistema já sabe. */
export interface Feriado {
  id: string
  /** yyyy-MM-dd (com "todo ano", só o dia e o mês valem). */
  data: string
  nome: string
  todoAno: boolean
  status: 'ativo' | 'inativo'
}

const base = '/feriados'
export const listarFeriados = () => apiFetch<Feriado[]>(base)
export const salvarFeriado = (f: Feriado) =>
  f.id ? apiFetch<Feriado>(`${base}/${encodeURIComponent(f.id)}`, { method: 'PUT', body: JSON.stringify(f) }) : apiFetch<Feriado>(base, { method: 'POST', body: JSON.stringify(f) })
export const excluirFeriado = (id: string) => apiFetch<void>(`${base}/${encodeURIComponent(id)}`, { method: 'DELETE' })

/** Feriados do cadastro, já entregues ao cálculo de dia útil da tela (status "atrasado", KPIs). */
export function useFeriados() {
  return useQuery({
    queryKey: ['feriados'],
    queryFn: async () => {
      const l = await listarFeriados()
      definirFeriados(l)
      return l
    },
    staleTime: 10 * 60_000,
  })
}

import { apiFetch } from '@/lib/api'
import type { Funil, Oportunidade } from './types'

export const listFunis = () => apiFetch<Funil[]>('/funis')
export const createFunil = (f: Funil) => apiFetch<Funil>('/funis', { method: 'POST', body: JSON.stringify(f) })
export const updateFunil = (f: Funil) => apiFetch<Funil>(`/funis/${f.id}`, { method: 'PUT', body: JSON.stringify(f) })

export const listOportunidades = () => apiFetch<Oportunidade[]>('/oportunidades')
export const createOportunidade = (o: Oportunidade) =>
  apiFetch<Oportunidade>('/oportunidades', { method: 'POST', body: JSON.stringify(o) })
export const updateOportunidade = (o: Oportunidade) =>
  apiFetch<Oportunidade>(`/oportunidades/${o.id}`, { method: 'PUT', body: JSON.stringify(o) })

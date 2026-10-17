import { apiFetch } from '@/lib/api'
import type { Apolice } from './types'

const base = '/apolices'
export const listApolices = () => apiFetch<Apolice[]>(base)
export const createApolice = (a: Apolice) => apiFetch<Apolice>(base, { method: 'POST', body: JSON.stringify(a) })
export const updateApolice = (a: Apolice) => apiFetch<Apolice>(`${base}/${encodeURIComponent(a.id)}`, { method: 'PUT', body: JSON.stringify(a) })

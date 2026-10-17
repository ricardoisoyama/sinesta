import { apiFetch } from '@/lib/api'

/** Alíquota de ICMS do transporte por UF de origem × destino (fração: 0,12 = 12%; 0 = isento). */
export interface AliquotaIcms {
  id: string
  ufOrigem: string
  ufDestino: string
  aliquota: number
  fundamentacao: string
}

export const listAliquotasIcms = () => apiFetch<AliquotaIcms[]>('/aliquotas-icms')
/** Grava só as linhas enviadas (as que mudaram). */
export const salvarAliquotasIcms = (linhas: Pick<AliquotaIcms, 'ufOrigem' | 'ufDestino' | 'aliquota' | 'fundamentacao'>[]) =>
  apiFetch<AliquotaIcms[]>('/aliquotas-icms', { method: 'PUT', body: JSON.stringify(linhas) })

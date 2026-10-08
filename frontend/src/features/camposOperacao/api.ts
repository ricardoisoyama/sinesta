import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import type { CampoOperacao } from './types'

/** Campos da empresa (ativos e inativos), na ordem da tela. */
export const listCampos = async (empresaId: string): Promise<CampoOperacao[]> =>
  (await apiFetch<CampoOperacao[]>(`/campos-operacao?empresaId=${encodeURIComponent(empresaId)}`)).map((c) => ({
    ...c,
    opcoes: c.opcoes ?? [],
    cadastro: c.cadastro ?? '',
    ajuda: c.ajuda ?? '',
    status: c.status ?? 'ativo',
  }))

/** Grava a lista inteira; o servidor não apaga o que não vier (remover = status "inativo"). */
export const salvarCampos = (empresaId: string, campos: CampoOperacao[]) =>
  apiFetch<CampoOperacao[]>(`/campos-operacao/${encodeURIComponent(empresaId)}`, { method: 'PUT', body: JSON.stringify(campos) })

export const chaveCampos = (empresaId: string) => ['campos-operacao', empresaId] as const

/** Campos ATIVOS da empresa (para a Precificação). */
export function useCamposDaEmpresa(empresaId: string) {
  const q = useQuery({ queryKey: chaveCampos(empresaId), queryFn: () => listCampos(empresaId), enabled: !!empresaId })
  return { campos: (q.data ?? []).filter((c) => c.status === 'ativo'), carregando: q.isLoading }
}

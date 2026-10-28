import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import type { CampoOperacao, DadosOperacao, TipoOperacao } from './types'

/** Tipos de operação e campos (ativos e inativos), na ordem da tela. Valem para todas as empresas. */
export const listDadosOperacao = async (): Promise<DadosOperacao> => {
  const d = await apiFetch<{ tipos?: TipoOperacao[] | null; campos?: CampoOperacao[] | null }>('/campos-operacao')
  return {
    tipos: (d.tipos ?? []).map((t) => ({ ...t, status: t.status ?? 'ativo' })),
    campos: (d.campos ?? []).map((c) => ({
      ...c,
      tipoOperacaoId: c.tipoOperacaoId ?? '',
      opcoes: c.opcoes ?? [],
      cadastro: c.cadastro ?? '',
      ajuda: c.ajuda ?? '',
      status: c.status ?? 'ativo',
    })),
  }
}

/** Grava tipos e campos; o servidor não apaga o que não vier (remover = status "inativo"). */
export const salvarDadosOperacao = (dados: DadosOperacao) =>
  apiFetch<DadosOperacao>('/campos-operacao', { method: 'PUT', body: JSON.stringify(dados) })

export const chaveCampos = ['campos-operacao'] as const

/** Tipos de operação ATIVOS e os campos ativos de cada um (para o Pricing de qualquer empresa). */
export function useDadosOperacao() {
  const q = useQuery({ queryKey: chaveCampos, queryFn: listDadosOperacao })
  const tipos = (q.data?.tipos ?? []).filter((t) => t.status === 'ativo')
  const todosCampos = (q.data?.campos ?? []).filter((c) => c.status === 'ativo')
  return {
    tipos,
    /** Campos ativos de um tipo de operação. */
    camposDo: (tipoId: string) => todosCampos.filter((c) => c.tipoOperacaoId === tipoId),
    /** Todos os campos ativos (para reabrir um item pelo id do campo). */
    todosCampos,
    carregando: q.isLoading,
  }
}

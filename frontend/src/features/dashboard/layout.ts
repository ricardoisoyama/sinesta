import { useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'

/** Tamanho do bloco na grade de 4 colunas: pequeno = 1, médio = 2, grande = a linha inteira. */
export type Tamanho = 'p' | 'm' | 'g'
export const COLUNAS: Record<Tamanho, number> = { p: 1, m: 2, g: 4 }
export const ROTULO_TAMANHO: Record<Tamanho, string> = { p: 'Pequeno', m: 'Médio', g: 'Grande' }

export interface BlocoNoLayout {
  id: string
  tamanho: Tamanho
}

export interface LayoutDashboard {
  versao: 1
  blocos: BlocoNoLayout[]
}

/** O padrão do sistema (vale até o Gestor definir outro para o ambiente ou a pessoa personalizar). */
export const LAYOUT_PADRAO: LayoutDashboard = {
  versao: 1,
  blocos: [
    { id: 'kpi-fator', tamanho: 'p' },
    { id: 'kpi-margem', tamanho: 'p' },
    { id: 'kpi-meta', tamanho: 'p' },
    { id: 'kpi-equilibrio', tamanho: 'p' },
    { id: 'financeiro-semana', tamanho: 'm' },
    { id: 'aprovacoes', tamanho: 'm' },
    { id: 'margem-empresa', tamanho: 'm' },
    { id: 'meta-realizado', tamanho: 'm' },
    { id: 'propostas-recentes', tamanho: 'm' },
    { id: 'top-clientes', tamanho: 'm' },
    { id: 'atalhos', tamanho: 'g' },
  ],
}

const ler = (texto: string | undefined): LayoutDashboard | null => {
  if (!texto) return null
  try {
    const l = JSON.parse(texto) as LayoutDashboard
    return l?.versao === 1 && Array.isArray(l.blocos) ? l : null
  } catch {
    return null
  }
}

const CHAVE = ['preferencias', 'dashboard']

/** O layout da pessoa (ou o padrão do ambiente, ou o do sistema) e o que grava. */
export function useLayoutDashboard() {
  const qc = useQueryClient()
  const q = useQuery({
    queryKey: CHAVE,
    queryFn: () => apiFetch<{ meu: string; padrao: string }>('/preferencias/dashboard'),
  })
  const padraoAmbiente = ler(q.data?.padrao)
  const meu = ler(q.data?.meu)
  const salvar = async (l: LayoutDashboard) => {
    await apiFetch('/preferencias/dashboard', {
      method: 'PUT',
      body: JSON.stringify({ layout: JSON.stringify(l) }),
    })
    await qc.invalidateQueries({ queryKey: CHAVE })
  }
  const restaurar = async () => {
    await apiFetch('/preferencias/dashboard', { method: 'DELETE' })
    await qc.invalidateQueries({ queryKey: CHAVE })
  }
  const salvarComoPadrao = async (l: LayoutDashboard) => {
    await apiFetch('/preferencias/dashboard/padrao', {
      method: 'PUT',
      body: JSON.stringify({ layout: JSON.stringify(l) }),
    })
    await qc.invalidateQueries({ queryKey: CHAVE })
  }
  return {
    carregando: q.isLoading,
    layout: meu ?? padraoAmbiente ?? LAYOUT_PADRAO,
    personalizado: !!meu,
    padrao: padraoAmbiente ?? LAYOUT_PADRAO,
    salvar,
    restaurar,
    salvarComoPadrao,
  }
}

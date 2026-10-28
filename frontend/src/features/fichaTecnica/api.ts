import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import type { ColunaFicha, FichaTecnica, GradeFichas, GrupoFicha } from './types'

/** Ficha Técnica (fichas, colunas e itens, ativos e inativos), na ordem da tela. Vale para todas as empresas. */
export const listFichas = async (): Promise<GradeFichas> => {
  const g = await apiFetch<GradeFichas>('/fichas-tecnicas')
  return {
    grupos: (g.grupos ?? []).map((x) => ({ ...x, formulaTotal: x.formulaTotal ?? '', status: x.status ?? 'ativo' })),
    colunas: g.colunas.map((c) => ({ ...c, grupoId: c.grupoId ?? '', base: c.base ?? '', formula: c.formula ?? '', opcoes: c.opcoes ?? [], status: c.status ?? 'ativo' })),
    fichas: g.fichas.map((f) => ({ ...f, grupoId: f.grupoId ?? '', valores: f.valores ?? {} })),
  }
}

/** Grava a Ficha Técnica inteira; o servidor não apaga o que não vier (remover = status "inativo"). */
export const salvarFichas = (g: GradeFichas) =>
  apiFetch<GradeFichas>('/fichas-tecnicas', {
    method: 'PUT',
    body: JSON.stringify({
      grupos: g.grupos,
      colunas: g.colunas,
      fichas: g.fichas.map((f: FichaTecnica) => ({ id: f.id, grupoId: f.grupoId, nome: f.nome, status: f.status, valores: f.valores })),
    }),
  })

export const chaveFichas = ['fichas-tecnicas'] as const

/** Fichas, colunas e itens ATIVOS (para o Pricing de qualquer empresa). `fichas` são os itens. */
export function useFichas() {
  const q = useQuery({ queryKey: chaveFichas, queryFn: listFichas })
  const grupos: GrupoFicha[] = (q.data?.grupos ?? []).filter((g) => g.status === 'ativo')
  const ativos = new Set(grupos.map((g) => g.id))
  const colunas: ColunaFicha[] = (q.data?.colunas ?? []).filter((c) => c.status === 'ativo')
  // Item de ficha inativada sai do Pricing junto com a ficha.
  const fichas: FichaTecnica[] = (q.data?.fichas ?? []).filter((f) => f.status === 'ativo' && (ativos.has(f.grupoId) || !f.grupoId))
  /** Colunas que valem para o item: as da ficha dele. */
  const colunasDe = (item: FichaTecnica | undefined): ColunaFicha[] => (item ? colunas.filter((c) => c.grupoId === item.grupoId) : [])
  const nomeGrupo = (grupoId: string) => grupos.find((g) => g.id === grupoId)?.nome ?? ''
  /** Fórmula do total da ficha do item ('' = soma das colunas marcadas). */
  const formulaDe = (item: FichaTecnica | undefined): string => (item ? (grupos.find((g) => g.id === item.grupoId)?.formulaTotal ?? '') : '')
  return { grupos, colunas, fichas, colunasDe, formulaDe, nomeGrupo, carregando: q.isLoading }
}

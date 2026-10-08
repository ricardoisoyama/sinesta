import { semAcento } from '@/lib/texto'
import type { Column } from './DataTable'

/** Id de uma coluna (explícito, ou o header quando é string, ou a posição). */
export function colunaId<T>(c: Column<T>, i: number): string {
  if (c.id) return c.id
  return typeof c.header === 'string' ? c.header : `col-${i}`
}

/** Registro com status ativo/inativo (os cadastros). */
const temStatusAtivoInativo = (r: unknown): r is { status: string } =>
  typeof r === 'object' && r !== null && 'status' in r && ((r as { status: unknown }).status === 'ativo' || (r as { status: unknown }).status === 'inativo')

/** A lista tem cadastros com status ativo/inativo? (aí faz sentido o botão "mostrar inativos"). */
export const listaTemStatus = (rows: unknown[]) => rows.some(temStatusAtivoInativo)

/** Remove os inativos (quando a lista é de cadastros com status). */
export function semInativos<T>(rows: T[]): T[] {
  return rows.filter((r) => !temStatusAtivoInativo(r) || r.status !== 'inativo')
}

/** Aplica os filtros por coluna (texto contém, sem acento e sem maiúsculas). */
export function filtrarPorColunas<T>(rows: T[], columns: Column<T>[], filtros: Record<string, string>): T[] {
  const ativos = columns
    .map((c, i) => ({ id: colunaId(c, i), valor: c.valor, termo: semAcento((filtros[colunaId(c, i)] ?? '').trim()) }))
    .filter((f) => f.valor && f.termo)
  if (ativos.length === 0) return rows
  return rows.filter((r) =>
    ativos.every((f) => semAcento(String(f.valor!(r) ?? '')).includes(f.termo)),
  )
}

const chaveOcultas = (gridId: string) => `elrond.grid.${gridId}.ocultas`

/** Colunas escondidas pelo usuário neste grid (lembradas no navegador). */
export function lerOcultas(gridId: string | undefined): Set<string> {
  if (!gridId) return new Set()
  try {
    const raw = localStorage.getItem(chaveOcultas(gridId))
    const lista = raw ? (JSON.parse(raw) as unknown) : []
    return new Set(Array.isArray(lista) ? lista.filter((x): x is string => typeof x === 'string') : [])
  } catch {
    return new Set()
  }
}

export function gravarOcultas(gridId: string | undefined, ocultas: Set<string>) {
  if (!gridId) return
  try {
    localStorage.setItem(chaveOcultas(gridId), JSON.stringify([...ocultas]))
  } catch {
    // storage indisponível: só perde a memória da escolha
  }
}

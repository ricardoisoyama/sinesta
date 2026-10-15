import type { ReactNode } from 'react'
import ui from './ui.module.css'
import { colunaId } from './grid'

export interface Column<T> {
  /** Identificador estável (usado para lembrar colunas ocultas). Padrão: o header, quando é texto. */
  id?: string
  header: ReactNode
  cell: (row: T) => ReactNode
  className?: string
  /** Texto da célula para o filtro por coluna. Sem isso a coluna não tem filtro. */
  valor?: (row: T) => string | number | null | undefined
  /** Coluna que não pode ser escondida (ex.: nome, ações). */
  fixa?: boolean
  /**
   * Largura fixa em px. Quando alguma coluna tem largura, o grid trava as larguras (não mudam
   * de uma página para outra conforme o conteúdo); as colunas sem largura dividem o resto.
   */
  largura?: number
}

/** Espaço mínimo de cada coluna sem largura, num grid de larguras travadas. */
const MINIMO_COLUNA_LIVRE = 180

interface DataTableProps<T> {
  columns: Column<T>[]
  rows: T[]
  getKey: (row: T) => string
  empty?: string
  /** Linha de filtros por coluna (aparece abaixo do cabeçalho). */
  mostrarFiltros?: boolean
  filtros?: Record<string, string>
  onFiltro?: (colunaId: string, valor: string) => void
  /** Clique na linha (ex.: abrir o detalhe). */
  onRowClick?: (row: T) => void
  /** Classe extra por linha (ex.: linha selecionada). */
  rowClassName?: (row: T) => string | undefined
}

export function DataTable<T>({
  columns,
  rows,
  getKey,
  empty = 'Nenhum registro encontrado.',
  mostrarFiltros,
  filtros = {},
  onFiltro,
  onRowClick,
  rowClassName,
}: DataTableProps<T>) {
  // A moldura adapta o grid à largura disponível (zoom do navegador, tela menor): primeiro aperta o
  // espaçamento; se ainda não couber, rola só o grid, com a coluna de ações presa à direita.
  const travado = columns.some((c) => c.largura)
  const larguraMinima = columns.reduce((t, c) => t + (c.largura ?? MINIMO_COLUNA_LIVRE), 0)
  return (
    <div className={ui.tableScroll}>
    <table className={`${ui.table} ${travado ? ui.tableTravada : ''}`} style={travado ? { minWidth: larguraMinima } : undefined}>
      {travado && (
        <colgroup>
          {columns.map((c, i) => <col key={colunaId(c, i)} style={c.largura ? { width: c.largura } : undefined} />)}
        </colgroup>
      )}
      <thead>
        <tr>
          {columns.map((c, i) => <th key={colunaId(c, i)} className={c.className}>{c.header}</th>)}
        </tr>
        {mostrarFiltros && (
          <tr className={ui.filterRow}>
            {columns.map((c, i) => {
              const id = colunaId(c, i)
              return (
                <th key={id} className={c.className}>
                  {c.valor && (
                    <input
                      value={filtros[id] ?? ''}
                      onChange={(e) => onFiltro?.(id, e.target.value)}
                      placeholder="Filtrar..."
                      aria-label={`Filtrar ${typeof c.header === 'string' ? c.header : id}`}
                    />
                  )}
                </th>
              )
            })}
          </tr>
        )}
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr
            key={getKey(r)}
            className={[onRowClick ? ui.rowClick : '', rowClassName?.(r) ?? ''].filter(Boolean).join(' ') || undefined}
            onClick={onRowClick ? () => onRowClick(r) : undefined}
          >
            {columns.map((c, i) => <td key={colunaId(c, i)} className={c.className}>{c.cell(r)}</td>)}
          </tr>
        ))}
        {rows.length === 0 && (
          <tr><td colSpan={columns.length} className={ui.empty}>{empty}</td></tr>
        )}
      </tbody>
    </table>
    </div>
  )
}

import writeXlsxFile, { type SheetData } from 'write-excel-file/browser'
import type { Column } from './DataTable'
import { colunaId } from './grid'

/** Célula segura para planilha: texto que começa com = + - @ ganha apóstrofo (evita fórmula injetada). */
const celula = (v: unknown): string => {
  if (v === null || v === undefined) return ''
  const s = String(v)
  return /^[=+\-@]/.test(s) ? `'${s}` : s
}

/**
 * Exporta linhas para .xlsx usando as colunas visíveis que têm `valor` (mesma base do filtro).
 * Colunas só visuais (ações, ícones) ficam de fora.
 */
export async function exportarXlsx<T>(nomeArquivo: string, columns: Column<T>[], rows: T[]) {
  const exportaveis = columns.filter((c) => c.valor && typeof c.header === 'string')
  const cabecalho = exportaveis.map((c, i) => ({
    value: typeof c.header === 'string' ? c.header : colunaId(c, i),
    fontWeight: 'bold' as const,
  }))
  const dados: SheetData = [
    cabecalho,
    ...rows.map((r) => exportaveis.map((c) => ({ value: celula(c.valor!(r)), type: String }))),
  ]
  const larguras = { columns: exportaveis.map(() => ({ width: 28 })) }
  const hoje = new Date().toISOString().slice(0, 10)
  await writeXlsxFile(dados, larguras).toFile(`${nomeArquivo}-${hoje}.xlsx`)
}

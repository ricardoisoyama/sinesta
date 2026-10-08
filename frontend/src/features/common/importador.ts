/** Contrato da importação de planilha (a leitura em si vive aqui, sem UI). */

export interface ColunaImport {
  /** Título exato do cabeçalho na planilha. */
  titulo: string
  exemplo?: string | number
  obrigatoria?: boolean
}

/** Resultado do mapeamento de uma linha: vira item ou vira erro. */
export type LinhaMapeada<T> = { item: T; resumo: string } | { erro: string }

export interface Prevista<T> {
  /** Número da linha na planilha (1 é o cabeçalho). */
  linha: number
  item?: T
  resumo: string
  erro?: string
}

/** Célula da planilha vira texto (datas viram yyyy-MM-dd). */
export const texto = (v: unknown): string => {
  if (v === null || v === undefined) return ''
  if (v instanceof Date) return v.toISOString().slice(0, 10)
  return String(v).trim()
}

const chave = (v: unknown) => texto(v).replace(/\*/g, '').trim().toLowerCase()

/**
 * Confere o cabeçalho e transforma as linhas da planilha em itens (ou erros).
 * Devolve `{ erro }` quando a planilha inteira não serve.
 */
export function lerLinhas<T>(
  rows: unknown[][],
  colunas: ColunaImport[],
  mapear: (linha: Record<string, string>) => LinhaMapeada<T>,
): { erro: string } | { linhas: Prevista<T>[] } {
  if (rows.length < 2) return { erro: 'A planilha não tem linhas de dados abaixo do cabeçalho.' }

  const cabecalho = rows[0].map(chave)
  const faltando = colunas
    .filter((c) => c.obrigatoria && !cabecalho.includes(c.titulo.toLowerCase()))
    .map((c) => c.titulo)
  if (faltando.length)
    return { erro: `A planilha não tem a(s) coluna(s): ${faltando.join(', ')}. Baixe o modelo.` }

  const linhas = rows.slice(1).flatMap<Prevista<T>>((row, i) => {
    const valores: Record<string, string> = {}
    colunas.forEach((c) => {
      const idx = cabecalho.indexOf(c.titulo.toLowerCase())
      valores[c.titulo] = idx >= 0 ? texto(row[idx]) : ''
    })
    // Linha totalmente vazia (rodapé da planilha) é ignorada.
    if (Object.values(valores).every((v) => v === '')) return []

    const res = mapear(valores)
    return [
      'erro' in res
        ? { linha: i + 2, resumo: Object.values(valores).filter(Boolean).join(' · '), erro: res.erro }
        : { linha: i + 2, item: res.item, resumo: res.resumo },
    ]
  })

  return { linhas }
}

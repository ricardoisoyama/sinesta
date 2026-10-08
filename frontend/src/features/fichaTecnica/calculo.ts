import { avaliar, chaveDe, referencias } from '@/lib/formula'
import { TIPOS_NUMERICOS, type ColunaFicha, type FichaTecnica } from './types'

export interface ColunaCalculada {
  chave: string
  nome: string
  /** Valor numérico resolvido (0 para texto/lista). */
  valor: number
  compoeTotal: boolean
  erro?: string
}

export interface FichaCalculada {
  colunas: ColunaCalculada[]
  total: number
  /** Primeira mensagem de erro de fórmula, se houver. */
  erro?: string
  /** O total veio da fórmula da ficha (e não da soma das colunas marcadas). */
  porFormula?: boolean
}

/** Chave efetiva da coluna: a digitada ou a derivada do nome. */
export const chaveDaColuna = (c: ColunaFicha): string => c.chave || chaveDe(c.nome)

/** Normaliza as colunas: garante chave única para cada uma. */
export function comChaves(colunas: ColunaFicha[]): ColunaFicha[] {
  const usadas = new Set<string>()
  return colunas.map((c) => {
    let k = chaveDaColuna(c) || 'coluna'
    let n = 2
    const base = k
    while (usadas.has(k)) k = `${base}_${n++}`
    usadas.add(k)
    return { ...c, chave: k }
  })
}

const numero = (v: number | string | undefined): number => {
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0
  if (typeof v === 'string' && v.trim()) {
    const n = Number(v.replace(/\./g, '').replace(',', '.'))
    return Number.isFinite(n) ? n : 0
  }
  return 0
}

/**
 * Resolve todas as colunas de uma ficha. Percentuais e fórmulas podem depender de qualquer
 * coluna (inclusive de outra fórmula): resolve em passadas até estabilizar. Ciclo vira erro.
 * `formulaTotal` (da ficha) preenchida: o total é ela; vazia: soma das colunas marcadas.
 * Mesma conta do servidor (FichaCalculo.Total).
 */
export function calcularFicha(colunasBrutas: ColunaFicha[], valores: FichaTecnica['valores'], formulaTotal = ''): FichaCalculada {
  const colunas = comChaves(colunasBrutas)
  const resolvido: Record<string, number> = {}
  const erros: Record<string, string> = {}

  // 1) Valores digitados entram direto.
  for (const c of colunas) {
    if (c.tipo === 'valor' || c.tipo === 'numero') resolvido[c.chave] = numero(valores[c.id])
    if (c.tipo === 'texto' || c.tipo === 'lista') resolvido[c.chave] = 0
  }

  // 2) Percentuais e fórmulas: dependem de outras colunas.
  const pendentes = colunas.filter((c) => c.tipo === 'percentual' || c.tipo === 'calculo')
  let restantes = [...pendentes]
  for (let passada = 0; restantes.length && passada < colunas.length + 1; passada++) {
    const ainda: ColunaFicha[] = []
    for (const c of restantes) {
      const deps = c.tipo === 'percentual' ? (c.base ? [c.base] : []) : referencias(c.formula)
      if (deps.some((d) => !(d in resolvido))) {
        // Depende de algo desconhecido ou ainda não resolvido: tenta na próxima passada.
        const desconhecida = deps.find((d) => !colunas.some((x) => x.chave === d))
        if (desconhecida) {
          erros[c.chave] = `Coluna desconhecida: ${desconhecida}`
          resolvido[c.chave] = 0
        } else ainda.push(c)
        continue
      }
      if (c.tipo === 'percentual') {
        resolvido[c.chave] = c.base ? numero(valores[c.id]) * resolvido[c.base] : 0
        if (!c.base) erros[c.chave] = 'Escolha a coluna base'
      } else {
        const r = avaliar(c.formula, resolvido)
        resolvido[c.chave] = r.valor ?? 0
        if (r.erro) erros[c.chave] = r.erro
      }
    }
    restantes = ainda
  }
  for (const c of restantes) {
    resolvido[c.chave] = 0
    erros[c.chave] = 'Referência circular'
  }

  const saida: ColunaCalculada[] = colunas.map((c) => ({
    chave: c.chave,
    nome: c.nome,
    valor: resolvido[c.chave] ?? 0,
    compoeTotal: c.compoeTotal && TIPOS_NUMERICOS.includes(c.tipo),
    erro: erros[c.chave],
  }))
  const erro = saida.find((c) => c.erro)?.erro
  if (formulaTotal.trim()) {
    const r = avaliar(formulaTotal, resolvido)
    return { colunas: saida, total: Math.round((r.valor ?? 0) * 100) / 100, erro: r.erro ? `Total: ${r.erro}` : erro, porFormula: true }
  }
  const total = saida.filter((c) => c.compoeTotal).reduce((a, c) => a + c.valor, 0)
  return { colunas: saida, total: Math.round(total * 100) / 100, erro }
}

/** Total (custo) de uma ficha: o que entra na Precificação. */
export const totalDaFicha = (colunas: ColunaFicha[], f: FichaTecnica, formulaTotal = ''): number => calcularFicha(colunas, f.valores, formulaTotal).total

import { formatBRL } from '@/lib/format'

/**
 * Regras da meta (espelho de Meta.cs no servidor): o valor anual manda e os 12 meses
 * precisam somar exatamente ele.
 */

const centavos = (v: number) => Math.round((v || 0) * 100)
export const somaMeses = (meses: number[]) => meses.reduce((a, v) => a + centavos(v), 0) / 100

/** Diferença anual − soma dos meses, em centavos exatos (positiva = falta; negativa = passou). */
export const diferencaMeses = (anual: number, meses: number[]) => (centavos(anual) - Math.round(somaMeses(meses) * 100)) / 100

/** Motivo para não salvar, ou null quando o anual e os meses fecham. Mesmas frases do servidor. */
export function conferirValores(anual: number, meses: number[]): string | null {
  if (!(anual > 0)) return 'Informe o valor anual da meta.'
  const soma = somaMeses(meses)
  const dif = diferencaMeses(anual, meses)
  if (dif > 0) return `Os meses somam ${formatBRL(soma)}: faltam ${formatBRL(dif)} para chegar ao valor anual de ${formatBRL(anual)}.`
  if (dif < 0) return `Os meses somam ${formatBRL(soma)}: passaram ${formatBRL(-dif)} do valor anual de ${formatBRL(anual)}.`
  return null
}

/** Anual de "X% sobre o ano anterior", arredondado em centavos (igual ao servidor). */
export const anualSobreAnterior = (totalAnterior: number, crescimento: number) =>
  centavos(totalAnterior * (1 + (crescimento || 0))) / 100

/** Participação de cada mês no anual (fração). Anual zerado = tudo 0. */
export const participacoes = (anual: number, meses: number[]) => meses.map((v) => (anual > 0 ? (v || 0) / anual : 0))

/**
 * Meses em R$ a partir dos percentuais do anual. Quando os percentuais fecham 100%, os
 * centavos do arredondamento vão para o maior mês, para a soma bater com o anual.
 */
export function mesesPorPercentual(anual: number, pcts: number[]): number[] {
  const valores = pcts.map((p) => centavos(anual * (p || 0)))
  const somaPct = pcts.reduce((a, p) => a + (p || 0), 0)
  if (Math.abs(somaPct - 1) < 1e-6) {
    const maior = pcts.indexOf(Math.max(...pcts))
    valores[maior] += centavos(anual) - valores.reduce((a, v) => a + v, 0)
  }
  return valores.map((v) => v / 100)
}

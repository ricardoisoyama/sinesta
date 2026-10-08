/**
 * Converte o que o usuário digitou num campo numérico pt-BR em número.
 * Aceita "1000" (1000), "1.000,50" (1000.5), "1000,5" (1000.5) e também
 * "1000.50" (1000.5) quando o ponto é claramente decimal (só um ponto e até
 * duas casas depois dele), que é como muita gente digita no teclado numérico.
 */
export function parseDigitado(texto: string): number {
  const t = (texto || '').trim()
  if (!t) return 0

  let normalizado: string
  if (t.includes(',')) {
    // Vírgula é o decimal; pontos são milhar.
    normalizado = t.replace(/\./g, '').replace(',', '.')
  } else if (/^\d+\.\d{1,2}$/.test(t)) {
    // Um único ponto com 1 ou 2 casas: decimal.
    normalizado = t
  } else {
    // Sem vírgula: pontos são milhar ("1.000" → 1000).
    normalizado = t.replace(/\./g, '')
  }

  const n = Number.parseFloat(normalizado)
  return Number.isFinite(n) ? n : 0
}

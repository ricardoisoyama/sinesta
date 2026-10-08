import type { CustoFixo } from './types'

/** Data de hoje em yyyy-MM-dd (comparável com as datas de vigência). */
export const hojeISO = (): string => new Date().toISOString().slice(0, 10)

/**
 * O custo entra na base da DF (markup/fator)? Ativos e recorrentes, inclusive os que ainda
 * vão começar (quem precifica hoje já conta com eles); só sai o que já terminou.
 * Espelha `CustoFixo.EntraNaDf` do backend, que é a fonte da verdade do cálculo.
 */
export function entraNaDf(c: CustoFixo, hoje = hojeISO()): boolean {
  if (c.status !== 'ativo' || c.tipo === 'spot') return false
  if (c.dataFim && hoje > c.dataFim) return false
  return true
}

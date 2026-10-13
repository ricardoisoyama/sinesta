import type { CustoFixo, RateioEmpresa } from './types'

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

// ── Rateio entre empresas (espelha CustoFixo.PercentualDa/ValorPara/ConferirRateio do backend) ──

/** Folga de arredondamento na soma (0,01 ponto percentual), igual ao servidor. */
const TOLERANCIA = 0.0001

export const rateada = (c: Pick<CustoFixo, 'rateio'>): boolean => (c.rateio?.length ?? 0) > 0

/** Fração da despesa que é da empresa: sem rateio, 1 para quem paga e 0 para as outras. */
export function percentualDaEmpresa(c: Pick<CustoFixo, 'unidadeId' | 'rateio'>, empresaId: string): number {
  if (!rateada(c)) return c.unidadeId === empresaId ? 1 : 0
  return (c.rateio ?? []).filter((r) => r.empresaId === empresaId).reduce((a, r) => a + r.percentual, 0)
}

/** Quanto do valor mensal vai para a DF da empresa. */
export const valorDaEmpresa = (c: CustoFixo, empresaId: string): number => c.valorMensal * percentualDaEmpresa(c, empresaId)

export const somaRateio = (rateio: RateioEmpresa[]): number => rateio.reduce((a, r) => a + r.percentual, 0)

/** O rateio fecha? Null quando está certo (ou não há rateio); senão, o motivo (mesmas regras do servidor). */
export function conferirRateio(rateio: RateioEmpresa[], pagadoraId: string): string | null {
  if (rateio.length === 0) return null
  if (rateio.some((r) => !r.empresaId)) return 'Escolha a empresa de cada linha do rateio.'
  if (new Set(rateio.map((r) => r.empresaId)).size !== rateio.length) return 'Cada empresa entra uma vez só no rateio.'
  if (rateio.some((r) => !(r.percentual > 0))) return 'Toda empresa do rateio precisa de um percentual maior que zero (tire a que ficou com 0%).'
  if (!rateio.some((r) => r.empresaId === pagadoraId)) return 'A empresa que paga a conta precisa fazer parte do rateio.'
  const total = somaRateio(rateio)
  if (Math.abs(total - 1) > TOLERANCIA) {
    const faltam = (1 - total) * 100
    return faltam > 0
      ? `Faltam ${faltam.toFixed(2).replace('.', ',')}% para fechar 100%.`
      : `Passou ${(-faltam).toFixed(2).replace('.', ',')}% de 100%.`
  }
  return null
}

/** Divide 100% igual entre as empresas; o resto do arredondamento fica com a primeira (quem paga). */
export function dividirIgual(rateio: RateioEmpresa[]): RateioEmpresa[] {
  if (rateio.length === 0) return rateio
  const parte = Math.floor(10000 / rateio.length) / 10000
  const resto = Math.round((1 - parte * rateio.length) * 10000) / 10000
  return rateio.map((r, i) => ({ ...r, percentual: i === 0 ? parte + resto : parte }))
}

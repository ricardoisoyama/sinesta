import type { Proposta } from '@/features/propostas/types'
import type { CenarioMeta } from './mock'

/** Ano da meta: os registros antigos não têm ano, aí vale o corrente. */
export const anoDaMeta = (ano: number | undefined, hoje = new Date()) => (ano && ano > 0 ? ano : hoje.getFullYear())

/**
 * Meta que vale para a empresa no ano: a única ativa do ano ou, havendo várias, a principal.
 * Mesma regra do motor do fator (FatorService.MetaDoAno), para todas as telas usarem a mesma meta.
 */
export function metaDoAno(metas: CenarioMeta[], empresaId: string, ano: number): CenarioMeta | undefined {
  const doAno = metas.filter((m) => m.empresaId === empresaId && m.status !== 'inativo' && (m.ano === ano || !m.ano))
  if (doAno.length <= 1) return doAno[0]
  const principais = doAno.filter((m) => m.principal)
  return principais.length === 1 ? principais[0] : undefined
}

/** "dd/MM/yyyy" (formato gravado pelo backend) → {mes 0-11, ano}. Também aceita ISO. */
export function mesAno(data: string): { mes: number; ano: number } | null {
  const br = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(data)
  if (br) return { mes: Number(br[2]) - 1, ano: Number(br[3]) }
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(data)
  if (iso) return { mes: Number(iso[2]) - 1, ano: Number(iso[1]) }
  return null
}

/**
 * Realizado por mês: soma do total das propostas APROVADAS do ano.
 * É o que "puxa da tela de proposta conforme aprovação", como o cliente pediu.
 */
export function realizadoPorMes(propostas: Proposta[], ano: number, empresaId = ''): number[] {
  const meses = Array<number>(12).fill(0)
  for (const p of propostas) {
    if (p.status !== 'aprovada') continue
    const d = mesAno(p.data)
    if (!d || d.ano !== ano) continue
    // Meta da empresa: soma só os itens que essa empresa vendeu.
    meses[d.mes] += empresaId
      ? (p.itens ?? []).filter((i) => i.empresaId === empresaId).reduce((a, i) => a + (i.precoFinal || 0), 0)
      : p.total
  }
  return meses
}

/** Faixa de cor pelo percentual atingido: verde ≥ 90%, amarelo ≥ 60%, vermelho abaixo. */
export type FaixaMeta = 'ok' | 'atencao' | 'ruim'
export const faixaDaMeta = (pct: number): FaixaMeta => (pct >= 0.9 ? 'ok' : pct >= 0.6 ? 'atencao' : 'ruim')

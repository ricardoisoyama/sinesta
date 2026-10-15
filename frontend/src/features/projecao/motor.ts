import type { CustoFixo } from '@/features/custosFixos/types'
import { percentualDaEmpresa } from '@/features/custosFixos/regras'
import type { CenarioMeta } from '@/features/metas/mock'
import { metaDoAno } from '@/features/metas/realizado'

/**
 * Motor da projeção (protótipo, funções puras). A receita é a META (decisão de 15/10) e a DF vem
 * das despesas fixas, mês a mês, pela vigência de cada uma. O preço já embute DF% + lucro: do que
 * entra, essa fatia paga a DF e o que sobra é lucro. Assim:
 *   lucro(mês) = receita × (DF% da base + lucro%) − DF(mês)
 *   equilíbrio(mês) = DF(mês) ÷ (DF% da base + lucro%)
 *   fator dos preços novos = 1 ÷ (1 − (DF(mês) ÷ receita + DV + lucro))   (mesma conta do Pricing)
 */

export interface Mes {
  /** yyyy-MM. */
  chave: string
  /** "out/26". */
  rotulo: string
  ano: number
  /** 0–11. */
  mes: number
}

const ROT = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

export function proximosMeses(hoje: Date, n = 12): Mes[] {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() + i, 1)
    return { chave: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, rotulo: `${ROT[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`, ano: d.getFullYear(), mes: d.getMonth() }
  })
}

const metaDoMes = (metas: CenarioMeta[], empresaId: string, ano: number, mes: number): number | null => {
  const meta = metaDoAno(metas, empresaId, ano)
  if (!meta) return null
  const meses = meta.valoresMensais?.length === 12 ? meta.valoresMensais : null
  return meses ? meses[mes] ?? 0 : meta.metaAnual / 12
}

export interface ReceitaMes {
  valor: number
  /** O ano não tem meta: repetiu a do mesmo mês do ano anterior. */
  repetida: boolean
}

/**
 * Meta do mês da empresa. Sem meta no ano (é comum o ano seguinte ainda não ter), repete a do
 * mesmo mês do ano anterior e avisa. Null quando nem isso existe.
 */
export function receitaDoMes(metas: CenarioMeta[], empresaId: string, m: Mes): ReceitaMes | null {
  const doAno = metaDoMes(metas, empresaId, m.ano, m.mes)
  if (doAno !== null) return { valor: doAno, repetida: false }
  const anterior = metaDoMes(metas, empresaId, m.ano - 1, m.mes)
  return anterior !== null ? { valor: anterior, repetida: true } : null
}

const ultimoDia = (m: Mes) => `${m.chave}-${String(new Date(m.ano, m.mes + 1, 0).getDate()).padStart(2, '0')}`

/** A despesa conta no mês? Ativa, recorrente e com a vigência cruzando o mês. */
export function custoNoMes(c: CustoFixo, m: Mes): boolean {
  if (c.status !== 'ativo' || c.tipo === 'spot') return false
  if (c.dataInicio && c.dataInicio > ultimoDia(m)) return false
  if (c.dataFim && c.dataFim < `${m.chave}-01`) return false
  return true
}

/** DF do mês: da empresa (parte dela no rateio) ou do grupo (cada despesa uma vez, inteira). */
export function dfDoMes(custos: CustoFixo[], empresaIds: string[], m: Mes): number {
  return custos.filter((c) => custoNoMes(c, m)).reduce((a, c) => a + c.valorMensal * Math.min(1, empresaIds.reduce((p, id) => p + percentualDaEmpresa(c, id), 0)), 0)
}

// ── hipóteses ─────────────────────────────────────────────────────────────

export type TipoHipotese = 'novo-custo' | 'reajuste-custos' | 'variacao-meta' | 'nova-receita' | 'cortar-custo'

export interface Hipotese {
  id: string
  tipo: TipoHipotese
  nome: string
  /** R$/mês (novo custo, nova receita) ou fração (reajuste, variação da meta: 0,1 = 10%). */
  valor: number
  /** yyyy-MM a partir de quando vale. */
  inicio: string
  /** yyyy-MM até quando vale (vazio = até o fim do horizonte). */
  fim?: string
  /** Cortar custo: qual despesa sai. */
  custoId?: string
  ativa: boolean
}

export const ROTULO_HIPOTESE: Record<TipoHipotese, string> = {
  'novo-custo': 'Nova despesa fixa',
  'reajuste-custos': 'Reajuste das despesas',
  'variacao-meta': 'Variação da meta',
  'nova-receita': 'Nova receita (cliente)',
  'cortar-custo': 'Cortar uma despesa',
}

const vale = (h: Hipotese, m: Mes) => h.ativa && h.inicio <= m.chave && (!h.fim || h.fim >= m.chave)

export interface Parametros {
  /** Fração da receita que paga DF + lucro (DF% da base + lucro), ponderada pela receita no grupo. */
  contribuicao: number
  /** DV sem o lucro (impostos, comissão, despesa financeira, outras). */
  dvSemLucro: number
  lucro: number
}

export interface LinhaMes extends Mes {
  receita: number
  df: number
  lucro: number
  equilibrio: number
  /** DF ÷ receita do mês. */
  dfPct: number
  /** Fator dos preços novos no mês (0 = inviável ou sem receita). */
  fator: number
  semMeta: boolean
  /** Receita veio da meta do ano anterior (o ano não tem meta). */
  metaRepetida: boolean
}

export interface Entrada {
  meses: Mes[]
  /** Receita base por mês (meta), null = sem meta. */
  receita: (m: Mes) => ReceitaMes | null
  df: (m: Mes) => number
  /** Valor de uma despesa num mês (para "cortar despesa"). */
  valorDoCusto: (custoId: string, m: Mes) => number
  parametros: Parametros
  hipoteses: Hipotese[]
  /** Sensibilidade: variação aplicada sobre a receita do cenário (0,1 = +10%). */
  sensibilidade?: number
}

const r2 = (v: number) => Math.round(v * 100) / 100

export function projetar(e: Entrada): LinhaMes[] {
  const { contribuicao, dvSemLucro, lucro } = e.parametros
  return e.meses.map((m) => {
    const base = e.receita(m)
    const hs = e.hipoteses.filter((h) => vale(h, m))
    let receita = base?.valor ?? 0
    for (const h of hs) if (h.tipo === 'variacao-meta') receita *= 1 + h.valor
    for (const h of hs) if (h.tipo === 'nova-receita') receita += h.valor
    receita *= 1 + (e.sensibilidade ?? 0)
    let df = e.df(m)
    for (const h of hs) if (h.tipo === 'cortar-custo' && h.custoId) df -= e.valorDoCusto(h.custoId, m)
    for (const h of hs) if (h.tipo === 'reajuste-custos') df *= 1 + h.valor
    for (const h of hs) if (h.tipo === 'novo-custo') df += h.valor
    df = Math.max(0, df)
    const dfPct = receita > 0 ? df / receita : 0
    const markup = dfPct + dvSemLucro + lucro
    return {
      ...m,
      receita: r2(receita),
      df: r2(df),
      lucro: r2(receita * contribuicao - df),
      equilibrio: contribuicao > 0 ? r2(df / contribuicao) : 0,
      dfPct,
      fator: receita > 0 && markup < 1 ? 1 / (1 - markup) : 0,
      semMeta: base === null,
      metaRepetida: !!base?.repetida,
    }
  })
}

export interface Resumo {
  receita: number
  df: number
  lucro: number
  mesesNoVermelho: number
  /** Quanto a receita pode cair (fração) antes do lucro do período zerar. */
  quedaAteZerar: number
  /** Já no prejuízo: quanto a receita precisa subir (fração) para zerar. */
  altaParaZerar: number
}

export function resumir(linhas: LinhaMes[], contribuicao: number): Resumo {
  const receita = linhas.reduce((a, l) => a + l.receita, 0)
  const df = linhas.reduce((a, l) => a + l.df, 0)
  const lucro = linhas.reduce((a, l) => a + l.lucro, 0)
  const capacidade = receita * contribuicao
  return {
    receita: r2(receita),
    df: r2(df),
    lucro: r2(lucro),
    mesesNoVermelho: linhas.filter((l) => l.lucro < 0).length,
    quedaAteZerar: capacidade > 0 ? Math.max(0, 1 - df / capacidade) : 0,
    altaParaZerar: capacidade > 0 ? Math.max(0, df / capacidade - 1) : 0,
  }
}

import type { Contrato, ExtraContrato, FaturaContrato, ItemEscopo, SituacaoFatura, VersaoEscopo } from './types'

const DIA = 86_400_000
const dataDe = (iso: string) => new Date(`${iso.slice(0, 10)}T12:00:00`)
export const isoDe = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
export const hojeISO = () => isoDe(new Date())
export const diasEntre = (de: string, ate: string) => Math.round((dataDe(ate).getTime() - dataDe(de).getTime()) / DIA)

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
/** "2026-10" → "out/2026". */
export const mesAnoCurto = (competencia: string) => `${MESES[Number(competencia.slice(5, 7)) - 1]}/${competencia.slice(0, 4)}`
/** "2026-10-15" → "15/10/2026". */
export const dataBR = (iso: string) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : '—')
/** "2026-06-01" → "06/2026". */
export const mesAnoNum = (iso: string) => `${iso.slice(5, 7)}/${iso.slice(0, 4)}`

/** Versão do escopo que vale hoje (a mais nova já em vigor). */
export function escopoVigente(c: Pick<Contrato, 'escopo'>, hoje = hojeISO()): VersaoEscopo {
  const emVigor = [...c.escopo].filter((v) => v.vigenteDesde <= hoje).sort((a, b) => b.versao - a.versao)
  return emVigor[0] ?? c.escopo[0]
}

export const totalItem = (i: ItemEscopo) => i.quantidade * i.valorUnitario
export const custoItem = (i: ItemEscopo) => i.quantidade * i.custoUnitario
const r2 = (v: number) => Math.round(v * 100) / 100

/** O que o escopo cobra por período (linhas de tabela de preço ficam de fora). */
export const totalEscopo = (v: VersaoEscopo) => r2(v.itens.filter((i) => !i.tabela).reduce((a, i) => a + totalItem(i), 0))
export const custoEscopo = (v: VersaoEscopo) => r2(v.itens.filter((i) => !i.tabela).reduce((a, i) => a + custoItem(i), 0))
/** O escopo é só tabela de preços (contrato por documento: cada frete tem o seu valor). */
export const ehTabela = (v: VersaoEscopo) => v.itens.length > 0 && v.itens.every((i) => i.tabela)

/** Margem precificada: (preço − custo) ÷ preço. Na tabela de preços, a média das linhas. */
export function margemPrecificada(v: VersaoEscopo): number {
  const itens = ehTabela(v) ? v.itens : v.itens.filter((i) => !i.tabela)
  const t = itens.reduce((a, i) => a + totalItem(i), 0)
  return t > 0 ? (t - itens.reduce((a, i) => a + custoItem(i), 0)) / t : 0
}

/** Valor do contrato: mensal no recorrente, total do serviço no spot. */
export const valorContrato = (c: Contrato, hoje = hojeISO()) => totalEscopo(escopoVigente(c, hoje))

/** Quanto da vigência já passou (0 a 1). */
export function progressoVigencia(c: Pick<Contrato, 'inicio' | 'fim'>, hoje = hojeISO()): number {
  const total = diasEntre(c.inicio, c.fim)
  if (total <= 0) return hoje >= c.inicio ? 1 : 0
  return Math.min(1, Math.max(0, diasEntre(c.inicio, hoje) / total))
}

export const diasParaFim = (c: Pick<Contrato, 'fim'>, hoje = hojeISO()) => diasEntre(hoje, c.fim)

/**
 * Próximo reajuste: aniversário no mês-base, a partir de 12 meses de contrato.
 * Começa só como aviso (alguém aplica). Null no spot ou se cai depois do fim.
 */
export function proximoReajuste(c: Contrato, hoje = hojeISO()): string | null {
  if (c.modalidade === 'spot') return null
  const ini = dataDe(c.inicio)
  // O primeiro reajuste é o mês-base que cai depois de 12 meses de contrato.
  const umAno = new Date(ini.getFullYear() + 1, ini.getMonth(), 1, 12)
  const data = new Date(umAno.getFullYear(), c.condicoes.reajusteMesBase - 1, 1, 12)
  if (data < umAno) data.setFullYear(data.getFullYear() + 1)
  const h = dataDe(hoje)
  while (data < new Date(h.getFullYear(), h.getMonth(), 1, 12)) data.setFullYear(data.getFullYear() + 1)
  const iso = isoDe(data)
  return iso <= c.fim ? iso : null
}

/** Próxima data de faturamento do recorrente vigente (dia de faturamento do mês corrente ou do próximo). */
export function proximoFaturamento(c: Contrato, hoje = hojeISO()): string | null {
  if (c.situacao !== 'vigente') return c.modalidade === 'spot' && c.situacao === 'a-faturar' ? c.faturas[0]?.vencimento ?? null : null
  if (c.modalidade === 'spot') return null
  const h = dataDe(hoje)
  const dia = Math.max(1, c.condicoes.diaFaturamento)
  let d = new Date(h.getFullYear(), h.getMonth(), dia, 12)
  if (d < h) d = new Date(h.getFullYear(), h.getMonth() + 1, dia, 12)
  const iso = isoDe(d)
  return iso <= isoDe(new Date(dataDe(c.fim).getFullYear(), dataDe(c.fim).getMonth() + 1, dia, 12)) ? iso : null
}

export const valorExtra = (e: ExtraContrato) => r2(e.quantidade * e.valorUnitario)
export const extrasPendentes = (c: Contrato) => c.extras.filter((e) => !e.faturadoEm && e.cobranca !== 'nao-cobrar')

export const totalFatura = (f: FaturaContrato) => r2(f.previsto + f.extras - f.descontos)
export const faturadoNaVigencia = (c: Contrato) =>
  r2(c.faturas.filter((f) => ['nf-emitida', 'boleto-emitido', 'recebida', 'atrasada'].includes(f.situacao)).reduce((a, f) => a + totalFatura(f), 0))
export const aReceber = (c: Contrato) =>
  r2(c.faturas.filter((f) => ['nf-emitida', 'boleto-emitido', 'atrasada'].includes(f.situacao)).reduce((a, f) => a + totalFatura(f), 0))

export type TomAlerta = 'erro' | 'atencao' | 'info'
export interface Alerta {
  tom: TomAlerta
  texto: string
}

/** O que pede atenção no contrato, do mais urgente ao menos. */
export function alertasDoContrato(c: Contrato, hoje = hojeISO()): Alerta[] {
  const lista: Alerta[] = []
  if (c.faturas.some((f) => f.situacao === 'atrasada')) lista.push({ tom: 'erro', texto: 'Fatura em atraso' })
  if (c.faturas.some((f) => f.situacao === 'problema')) lista.push({ tom: 'erro', texto: 'Fatura com problema' })
  if (c.modalidade === 'recorrente' && c.situacao === 'vigente') {
    const dias = diasParaFim(c, hoje)
    if (dias <= 90) lista.push({ tom: dias <= 30 ? 'erro' : 'atencao', texto: c.condicoes.renovacaoAutomatica ? `Renova em ${dias} dias` : `Vence em ${dias} dias` })
    const reaj = proximoReajuste(c, hoje)
    if (reaj && diasEntre(hoje, reaj) <= 60) lista.push({ tom: 'atencao', texto: `Reajuste ${c.condicoes.reajusteIndice} em ${diasEntre(hoje, reaj)} dias` })
  }
  const pend = extrasPendentes(c)
  if (pend.length > 0) lista.push({ tom: 'info', texto: `${pend.length} extra${pend.length > 1 ? 's' : ''} a faturar` })
  return lista
}

export const ROTULO_SITUACAO_FATURA: Record<SituacaoFatura, string> = {
  prevista: 'Prevista',
  'a-conferir': 'A conferir',
  conferida: 'Conferida',
  'nf-emitida': 'NF emitida',
  'boleto-emitido': 'Boleto emitido',
  recebida: 'Recebida',
  atrasada: 'Em atraso',
  problema: 'Com problema',
  devolvida: 'Devolvida',
}

/** Ordem do ciclo da fatura (para a barra de etapas). */
export const ETAPAS_FATURA: SituacaoFatura[] = ['prevista', 'a-conferir', 'conferida', 'nf-emitida', 'boleto-emitido', 'recebida']

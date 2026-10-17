import type { Contrato, ExtraContrato, Fatura, ItemEscopo, SituacaoContrato, SituacaoFatura, VersaoEscopo } from './types'

const DIA = 86_400_000
const dataDe = (iso: string) => new Date(`${iso.slice(0, 10)}T12:00:00`)
export const isoDe = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
export const hojeISO = () => isoDe(new Date())
export const diasEntre = (de: string, ate: string) => Math.round((dataDe(ate).getTime() - dataDe(de).getTime()) / DIA)
export const somaDias = (iso: string, n: number) => {
  const d = dataDe(iso)
  d.setDate(d.getDate() + n)
  return isoDe(d)
}

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
/** "2026-10" → "out/2026". */
export const mesAnoCurto = (competencia: string) => `${MESES[Number(competencia.slice(5, 7)) - 1]}/${competencia.slice(0, 4)}`
/** "2026-10-15" → "15/10/2026". */
export const dataBR = (iso: string) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : '—')
/** "2026-06-01" → "06/2026". */
export const mesAnoNum = (iso: string) => `${iso.slice(5, 7)}/${iso.slice(0, 4)}`

const r2 = (v: number) => Math.round(v * 100) / 100

/** Versão do escopo que vale na data (a mais nova já em vigor). */
export function escopoVigente(c: Pick<Contrato, 'escopo'>, hoje = hojeISO()): VersaoEscopo {
  const emVigor = [...c.escopo].filter((v) => v.vigenteDesde <= hoje).sort((a, b) => b.versao - a.versao)
  return emVigor[0] ?? c.escopo[0] ?? { versao: 1, vigenteDesde: hoje, motivo: '', itens: [] }
}

export const totalItem = (i: ItemEscopo) => i.quantidade * i.valorUnitario
export const custoItem = (i: ItemEscopo) => i.quantidade * i.custoUnitario
/** O que o escopo cobra por período (linhas de tabela de preço ficam de fora). */
export const totalEscopo = (v: VersaoEscopo) => r2(v.itens.filter((i) => !i.tabela).reduce((a, i) => a + totalItem(i), 0))
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
/** O contrato fatura pelos documentos vinculados (tem um componente "documento" ligado). */
export const porDocumento = (c: Pick<Contrato, 'componentes'>) => c.componentes.some((x) => x.regra === 'documento' && x.ativo)

/** Quanto da vigência já passou (0 a 1). */
export function progressoVigencia(c: Pick<Contrato, 'inicio' | 'fim'>, hoje = hojeISO()): number {
  const total = diasEntre(c.inicio, c.fim)
  if (total <= 0) return hoje >= c.inicio ? 1 : 0
  return Math.min(1, Math.max(0, diasEntre(c.inicio, hoje) / total))
}

export const diasParaFim = (c: Pick<Contrato, 'fim'>, hoje = hojeISO()) => diasEntre(hoje, c.fim)

// ── faturas do contrato ──

export const EMITIDAS: SituacaoFatura[] = ['nf-emitida', 'boleto-emitido', 'atrasada', 'recebida']
const A_RECEBER: SituacaoFatura[] = ['nf-emitida', 'boleto-emitido', 'atrasada']
export const travada = (f: Pick<Fatura, 'situacao'>) => EMITIDAS.includes(f.situacao)
/** As que valem (a cancelada saiu do contrato antes de ser emitida). */
export const faturasDe = (c: Pick<Contrato, 'id'>, faturas: Fatura[]) => faturas.filter((f) => f.contratoId === c.id && f.situacao !== 'cancelada')
export const totalEmitido = (faturas: Fatura[]) => r2(faturas.filter(travada).reduce((a, f) => a + f.total, 0))
export const totalAReceber = (faturas: Fatura[]) => r2(faturas.filter((f) => A_RECEBER.includes(f.situacao)).reduce((a, f) => a + f.total, 0))

/** Situação para mostrar: o spot anda pela fatura (a faturar → faturado). */
export const situacaoDe = (c: Contrato, faturas: Fatura[]): SituacaoContrato =>
  c.modalidade !== 'spot' ? c.situacao : faturasDe(c, faturas).some((f) => !f.avulsa && f.situacao === 'recebida') ? 'faturado' : 'a-faturar'
export const emAndamento = (s: SituacaoContrato) => s === 'vigente' || s === 'suspenso' || s === 'a-faturar'

/**
 * Próximo reajuste: aniversário no mês-base, a partir de 12 meses de contrato.
 * Começa só como aviso (alguém aplica). Null no spot ou se cai depois do fim.
 */
export function proximoReajuste(c: Contrato, hoje = hojeISO()): string | null {
  if (c.modalidade === 'spot') return null
  const ini = dataDe(c.inicio)
  const umAno = new Date(ini.getFullYear() + 1, ini.getMonth(), 1, 12)
  const data = new Date(umAno.getFullYear(), c.condicoes.reajusteMesBase - 1, 1, 12)
  if (data < umAno) data.setFullYear(data.getFullYear() + 1)
  const h = dataDe(hoje)
  while (data < new Date(h.getFullYear(), h.getMonth(), 1, 12)) data.setFullYear(data.getFullYear() + 1)
  const iso = isoDe(data)
  return iso <= c.fim ? iso : null
}

/** Próxima fatura ainda aberta do contrato (a que vai para conferência a seguir). */
export const proximaFatura = (c: Contrato, faturas: Fatura[]) =>
  faturasDe(c, faturas).filter((f) => !travada(f) && !f.avulsa).sort((a, b) => a.vencimento.localeCompare(b.vencimento))[0]

export const valorExtra = (e: Pick<ExtraContrato, 'quantidade' | 'valorUnitario'>) => r2(e.quantidade * e.valorUnitario)
export const extrasPendentes = (c: Contrato) => c.extras.filter((e) => !e.faturadoEm && e.cobranca !== 'nao-cobrar')

export type TomAlerta = 'erro' | 'atencao' | 'info'
export interface Alerta {
  tom: TomAlerta
  texto: string
}

/** O que pede atenção no contrato, do mais urgente ao menos. */
export function alertasDoContrato(c: Contrato, faturas: Fatura[], hoje = hojeISO()): Alerta[] {
  const lista: Alerta[] = []
  const doContrato = faturasDe(c, faturas)
  if (doContrato.some((f) => f.situacao === 'atrasada')) lista.push({ tom: 'erro', texto: 'Fatura em atraso' })
  if (doContrato.some((f) => f.situacao === 'devolvida')) lista.push({ tom: 'erro', texto: 'Fatura devolvida para ajuste' })
  if (c.modalidade === 'recorrente' && c.situacao === 'vigente') {
    const dias = diasParaFim(c, hoje)
    if (dias <= 90) lista.push({ tom: dias <= 30 ? 'erro' : 'atencao', texto: c.condicoes.renovacaoAutomatica ? `Renova em ${dias} dias` : `Vence em ${dias} dias` })
    const reaj = proximoReajuste(c, hoje)
    if (reaj && diasEntre(hoje, reaj) <= 60) lista.push({ tom: 'atencao', texto: `Reajuste ${c.condicoes.reajusteIndice} em ${diasEntre(hoje, reaj)} dias` })
  }
  if (c.situacao === 'suspenso') lista.push({ tom: 'atencao', texto: 'Suspenso: não gera fatura nova' })
  const pend = extrasPendentes(c)
  if (pend.length > 0) lista.push({ tom: 'info', texto: `${pend.length} extra${pend.length > 1 ? 's' : ''} a faturar` })
  return lista
}

export const ROTULO_SITUACAO_FATURA: Record<SituacaoFatura, string> = {
  prevista: 'Prevista',
  'a-conferir': 'A conferir',
  conferida: 'Conferida',
  devolvida: 'Devolvida',
  'nf-emitida': 'NF emitida',
  'boleto-emitido': 'Boleto emitido',
  atrasada: 'Em atraso',
  recebida: 'Recebida',
  cancelada: 'Cancelada',
}

/** Ordem do ciclo da fatura (para a barra de etapas). */
export const ETAPAS_FATURA: SituacaoFatura[] = ['prevista', 'a-conferir', 'conferida', 'nf-emitida', 'boleto-emitido', 'recebida']

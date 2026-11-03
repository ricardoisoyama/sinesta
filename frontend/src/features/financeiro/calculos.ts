import type { Carteira, Movimento, Periodicidade, StatusMovimento } from './types'
import { vencido } from './diasUteis'
import { PERIODICIDADES } from './types'

export const hojeISO = () => new Date().toISOString().slice(0, 10)

/** Soma dias a uma data yyyy-MM-dd (sem fuso: trabalha ao meio-dia). */
export const somarDias = (iso: string, dias: number): string => {
  const d = new Date(`${iso}T12:00:00`)
  d.setDate(d.getDate() + dias)
  return d.toISOString().slice(0, 10)
}

/** Soma meses mantendo o dia quando possível (31/01 + 1 mês = 28/02). */
export const somarMeses = (iso: string, meses: number): string => {
  const [y, m, dia] = iso.split('-').map(Number)
  const alvo = new Date(y, m - 1 + meses, 1, 12)
  const ultimo = new Date(alvo.getFullYear(), alvo.getMonth() + 1, 0).getDate()
  alvo.setDate(Math.min(dia, ultimo))
  return alvo.toISOString().slice(0, 10)
}

export const primeiroDiaDoMes = (iso: string) => `${iso.slice(0, 7)}-01`
export const ultimoDiaDoMes = (iso: string) => {
  const [y, m] = iso.split('-').map(Number)
  return new Date(y, m, 0, 12).toISOString().slice(0, 10)
}

/** Situação do movimento numa data de referência. */
export function statusDe(m: Movimento, hoje = hojeISO()): StatusMovimento {
  if (m.cancelado) return 'cancelado'
  if (m.pagoEm) return 'liquidado'
  // Vence em dia não útil (fim de semana, feriado): só atrasa depois do próximo dia útil.
  return vencido(m.vencimento, hoje, m.empresaId) ? 'atrasado' : 'aberto'
}

/** Valor que sai/entra de fato: valor − desconto + juros + multa (ou o pago, quando liquidado). */
export function liquidoDe(m: Movimento): number {
  if (m.pagoEm && m.valorPago > 0) return m.valorPago
  return Math.max(0, m.valor - m.desconto + m.juros + m.multa)
}

/** Sinal do movimento no caixa: receber soma, pagar subtrai. */
export const sinal = (m: Movimento) => (m.tipo === 'receber' ? 1 : -1)

/** Dias até o vencimento (negativo = atrasado). */
export const diasParaVencer = (m: Movimento, hoje = hojeISO()) =>
  Math.round((new Date(`${m.vencimento}T12:00:00`).getTime() - new Date(`${hoje}T12:00:00`).getTime()) / 86_400_000)

export interface ResumoFinanceiro {
  aReceber: number
  aPagar: number
  vencidos: number
  qtdVencidos: number
  /** Entradas − saídas em aberto nos próximos N dias. */
  previsto30: number
}

export function resumo(movs: Movimento[], hoje = hojeISO()): ResumoFinanceiro {
  // Transferência entre contas em aberto conta como qualquer lançamento (saída a pagar, entrada a receber);
  // depois de baixada sai dos cards, como todos.
  const abertos = movs.filter((m) => !m.cancelado && !m.pagoEm)
  const limite = somarDias(hoje, 30)
  return {
    aReceber: abertos.filter((m) => m.tipo === 'receber').reduce((a, m) => a + liquidoDe(m), 0),
    aPagar: abertos.filter((m) => m.tipo === 'pagar').reduce((a, m) => a + liquidoDe(m), 0),
    // Com Pix já programado no banco (agendado ou esperando aprovação) não é conta esquecida: fora de vencidos.
    vencidos: abertos.filter((m) => vencido(m.vencimento, hoje, m.empresaId) && !m.pixSituacao).reduce((a, m) => a + liquidoDe(m), 0),
    qtdVencidos: abertos.filter((m) => vencido(m.vencimento, hoje, m.empresaId) && !m.pixSituacao).length,
    previsto30: abertos.filter((m) => m.vencimento <= limite).reduce((a, m) => a + sinal(m) * liquidoDe(m), 0),
  }
}

/** Saldo de uma carteira numa data: saldo inicial + tudo que foi liquidado nela até a data. */
export function saldoCarteira(c: Carteira, movs: Movimento[], ate = hojeISO()): number {
  return movs
    .filter((m) => m.carteiraId === c.id && m.pagoEm && !m.cancelado && m.pagoEm <= ate && m.pagoEm >= c.saldoInicialEm)
    .reduce((s, m) => s + sinal(m) * liquidoDe(m), c.saldoInicial)
}

/** Saldo previsto da carteira no fim de um período: saldo hoje + abertos até a data. */
export function saldoPrevisto(c: Carteira, movs: Movimento[], ate: string, hoje = hojeISO()): number {
  const base = saldoCarteira(c, movs, hoje)
  return movs
    .filter((m) => m.carteiraId === c.id && !m.pagoEm && !m.cancelado && m.vencimento <= ate)
    .reduce((s, m) => s + sinal(m) * liquidoDe(m), base)
}

export type Granularidade = 'dia' | 'semana' | 'mes'

export interface LinhaFluxo {
  /** Chave do período (yyyy-MM-dd do primeiro dia). */
  periodo: string
  rotulo: string
  entradas: number
  saidas: number
  resultado: number
  acumulado: number
  /** Período ainda não fechado (tem previsão). */
  futuro: boolean
  movimentos: Movimento[]
}

const chaveDoPeriodo = (iso: string, g: Granularidade): string => {
  if (g === 'dia') return iso
  if (g === 'mes') return primeiroDiaDoMes(iso)
  const d = new Date(`${iso}T12:00:00`)
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7)) // segunda-feira
  return d.toISOString().slice(0, 10)
}

const rotuloDoPeriodo = (chave: string, g: Granularidade): string => {
  const [y, m, d] = chave.split('-')
  if (g === 'mes') return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })
  if (g === 'semana') return `sem. ${d}/${m}`
  return `${d}/${m}`
}

/**
 * Fluxo de caixa por período: realizado (liquidados, pela data do pagamento) até hoje e, se
 * `incluirPrevistos`, os em aberto pela data de vencimento. O acumulado parte do saldo das
 * carteiras no dia anterior ao início.
 */
export function fluxoDeCaixa(
  movs: Movimento[],
  carteiras: Carteira[],
  inicio: string,
  fim: string,
  g: Granularidade,
  incluirPrevistos: boolean,
  carteiraId = '',
  hoje = hojeISO(),
): { linhas: LinhaFluxo[]; saldoInicial: number; saldoFinal: number; menorSaldo: { valor: number; em: string } | null } {
  const cs = carteiras.filter((c) => c.status === 'ativo' && (!carteiraId || c.id === carteiraId))
  const doFiltro = movs.filter((m) => !m.cancelado && (!carteiraId || m.carteiraId === carteiraId))
  const vespera = somarDias(inicio, -1)
  const saldoInicial = cs.reduce((s, c) => s + saldoCarteira(c, doFiltro, vespera), 0)

  const data = (m: Movimento) => (m.pagoEm ? m.pagoEm : m.vencimento)
  const noPeriodo = doFiltro.filter((m) => {
    if (m.pagoEm) return m.pagoEm >= inicio && m.pagoEm <= fim
    return incluirPrevistos && m.vencimento >= inicio && m.vencimento <= fim
  })

  const grupos = new Map<string, Movimento[]>()
  for (const m of noPeriodo) {
    const k = chaveDoPeriodo(data(m), g)
    grupos.set(k, [...(grupos.get(k) ?? []), m])
  }

  let acumulado = saldoInicial
  let menor: { valor: number; em: string } | null = null
  const linhas: LinhaFluxo[] = [...grupos.keys()]
    .sort()
    .map((k) => {
      const lista = grupos.get(k)!.sort((a, b) => data(a).localeCompare(data(b)))
      const entradas = lista.filter((m) => m.tipo === 'receber').reduce((a, m) => a + liquidoDe(m), 0)
      const saidas = lista.filter((m) => m.tipo === 'pagar').reduce((a, m) => a + liquidoDe(m), 0)
      acumulado += entradas - saidas
      if (!menor || acumulado < menor.valor) menor = { valor: acumulado, em: k }
      return {
        periodo: k,
        rotulo: rotuloDoPeriodo(k, g),
        entradas,
        saidas,
        resultado: entradas - saidas,
        acumulado,
        futuro: lista.some((m) => !m.pagoEm) || k > hoje,
        movimentos: lista,
      }
    })

  return { linhas, saldoInicial, saldoFinal: acumulado, menorSaldo: menor }
}

/** Gera as parcelas de um lançamento: divide o valor (centavos sobram na última) e avança o vencimento. */
export function gerarParcelas(base: Movimento, n: number, periodicidade: Periodicidade): Movimento[] {
  const qtd = Math.max(1, Math.floor(n))
  const meses = PERIODICIDADES.find((p) => p.valor === periodicidade)?.meses ?? 1
  const centavos = Math.round(base.valor * 100)
  const cada = Math.floor(centavos / qtd)
  const grupoId = base.grupoId || crypto.randomUUID()
  return Array.from({ length: qtd }, (_, i) => ({
    ...base,
    id: crypto.randomUUID(),
    grupoId,
    parcela: i + 1,
    totalParcelas: qtd,
    valor: (i === qtd - 1 ? centavos - cada * (qtd - 1) : cada) / 100,
    vencimento: somarMeses(base.vencimento, i * meses),
    competencia: base.competencia || base.vencimento.slice(0, 7),
  }))
}

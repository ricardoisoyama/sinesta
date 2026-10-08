/**
 * Datas da Agenda, sempre no horário local e como texto: dia "yyyy-MM-dd" e momento
 * "yyyy-MM-ddTHH:mm" (o mesmo formato do <input type="datetime-local">). Assim a comparação
 * é de texto e não há surpresa de fuso.
 */
export type Vista = 'dia' | 'semana-util' | 'semana' | 'mes'

export const VISTAS: { valor: Vista; label: string }[] = [
  { valor: 'dia', label: 'Dia' },
  { valor: 'semana-util', label: 'Semana útil' },
  { valor: 'semana', label: 'Semana' },
  { valor: 'mes', label: 'Mês' },
]

const dois = (n: number) => String(n).padStart(2, '0')

export const paraDia = (d: Date) => `${d.getFullYear()}-${dois(d.getMonth() + 1)}-${dois(d.getDate())}`
export const hojeDia = () => paraDia(new Date())
export const agoraMomento = () => {
  const d = new Date()
  return `${paraDia(d)}T${dois(d.getHours())}:${dois(d.getMinutes())}`
}

/** Date local (meio-dia, longe da virada do horário de verão) a partir de "yyyy-MM-dd". */
export const deDia = (dia: string) => {
  const [a, m, d] = dia.split('-').map(Number)
  return new Date(a, m - 1, d, 12)
}

export const somarDias = (dia: string, n: number) => {
  const d = deDia(dia)
  d.setDate(d.getDate() + n)
  return paraDia(d)
}

export const somarMeses = (dia: string, n: number) => {
  const d = deDia(dia)
  d.setDate(1)
  d.setMonth(d.getMonth() + n)
  return paraDia(d)
}

/** 0 = domingo. */
export const diaDaSemana = (dia: string) => deDia(dia).getDay()

/** Domingo da semana do dia (a semana começa no domingo, como no Outlook). */
export const inicioDaSemana = (dia: string) => somarDias(dia, -diaDaSemana(dia))

export const primeiroDoMes = (dia: string) => `${dia.slice(0, 8)}01`

/** As 6 semanas (42 dias) que a grade do mês mostra, de domingo a sábado. */
export function gradeDoMes(dia: string): string[] {
  const inicio = inicioDaSemana(primeiroDoMes(dia))
  return Array.from({ length: 42 }, (_, i) => somarDias(inicio, i))
}

/** Dias (colunas) de cada vista. */
export function diasDaVista(vista: Vista, dia: string): string[] {
  if (vista === 'dia') return [dia]
  if (vista === 'mes') return gradeDoMes(dia)
  const domingo = inicioDaSemana(dia)
  if (vista === 'semana') return Array.from({ length: 7 }, (_, i) => somarDias(domingo, i))
  return Array.from({ length: 5 }, (_, i) => somarDias(domingo, i + 1))
}

/** Anda um período para frente (+1) ou para trás (−1) na vista. */
export function andar(vista: Vista, dia: string, sentido: 1 | -1): string {
  if (vista === 'mes') return somarMeses(dia, sentido)
  return somarDias(dia, sentido * (vista === 'dia' ? 1 : 7))
}

export const diaDe = (momento: string) => momento.slice(0, 10)
export const horaDe = (momento: string) => (momento.length > 10 ? momento.slice(11, 16) : '')
/** Minutos desde a meia-noite ("13:30" → 810). Sem hora = 0. */
export const minutosDe = (momento: string) => {
  const h = horaDe(momento)
  if (!h) return 0
  const [hh, mm] = h.split(':').map(Number)
  return hh * 60 + mm
}
export const momentoDe = (dia: string, minutos: number) => {
  const m = Math.max(0, Math.min(24 * 60 - 1, Math.round(minutos)))
  return `${dia}T${dois(Math.floor(m / 60))}:${dois(m % 60)}`
}
export const somarMinutos = (momento: string, n: number) => {
  const dia = diaDe(momento)
  const total = minutosDe(momento) + n
  // Passou da meia-noite: fecha no fim do dia (compromisso de horário fica dentro do dia).
  return total >= 24 * 60 ? `${dia}T23:59` : momentoDe(dia, total)
}

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
export const SEMANA_CURTA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const SEMANA_LONGA = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado']

export const nomeDoMes = (dia: string) => `${MESES[Number(dia.slice(5, 7)) - 1]} de ${dia.slice(0, 4)}`

/** Título do período: "1–5 de outubro de 2026", "28 de setembro – 2 de outubro de 2026"... */
export function tituloDoPeriodo(vista: Vista, dia: string): string {
  if (vista === 'mes') return nomeDoMes(dia)
  const [a, m, d] = dia.split('-').map(Number)
  if (vista === 'dia') return `${SEMANA_LONGA[diaDaSemana(dia)]}, ${d} de ${MESES[m - 1]} de ${a}`
  const dias = diasDaVista(vista, dia)
  const [ini, fim] = [dias[0], dias[dias.length - 1]]
  const [ai, mi, di] = ini.split('-').map(Number)
  const [af, mf, df] = fim.split('-').map(Number)
  if (ai !== af) return `${di} de ${MESES[mi - 1]} de ${ai} – ${df} de ${MESES[mf - 1]} de ${af}`
  if (mi !== mf) return `${di} de ${MESES[mi - 1]} – ${df} de ${MESES[mf - 1]} de ${af}`
  return `${di}–${df} de ${MESES[mf - 1]} de ${af}`
}

export const dataCurta = (dia: string) => `${dia.slice(8, 10)}/${dia.slice(5, 7)}/${dia.slice(0, 4)}`

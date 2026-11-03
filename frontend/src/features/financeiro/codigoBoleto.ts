/**
 * Leitura da linha digitável / código de barras na tela (prévia do valor e do vencimento enquanto a pessoa
 * cola o código). Espelha Elrond.Domain.Regras.CodigoBoleto; quem decide é o servidor.
 */
export interface CodigoBoletoLido {
  barras: string
  arrecadacao: boolean
  valor: number
  /** yyyy-MM-dd; vazio = o código não traz (conta de consumo, tributo). */
  vencimento: string
}

const dv10 = (s: string) => {
  let soma = 0
  let peso = 2
  for (let i = s.length - 1; i >= 0; i--) {
    const n = Number(s[i]) * peso
    soma += n > 9 ? n - 9 : n
    peso = 3 - peso
  }
  return (10 - (soma % 10)) % 10
}

const soma11 = (s: string) => {
  let soma = 0
  let peso = 2
  for (let i = s.length - 1; i >= 0; i--) {
    soma += Number(s[i]) * peso
    peso = peso === 9 ? 2 : peso + 1
  }
  return soma
}

const dvBancario = (s: string) => {
  const dv = 11 - (soma11(s) % 11)
  return dv === 0 || dv === 10 || dv === 11 ? 1 : dv
}

const dvArrecadacao11 = (s: string) => {
  const resto = soma11(s) % 11
  return resto <= 1 ? 0 : 11 - resto
}

const iso = (d: Date) => d.toISOString().slice(0, 10)
const maisDias = (base: string, dias: number) => {
  const d = new Date(`${base}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + dias)
  return d
}

/** Fator de vencimento: base 07/10/1997 e, desde 22/02/2025, recomeçando em 1000; vale a data mais perto de hoje. */
export function dataDoFator(fator: number, hoje: string): string {
  if (fator === 0) return ''
  const antiga = maisDias('1997-10-07', fator)
  if (fator < 1000) return iso(antiga)
  const nova = maisDias('2025-02-22', fator - 1000)
  const ref = new Date(`${hoje}T00:00:00Z`).getTime()
  return iso(Math.abs(nova.getTime() - ref) < Math.abs(antiga.getTime() - ref) ? nova : antiga)
}

export function lerCodigoBoleto(texto: string, hoje: string): { codigo?: CodigoBoletoLido; erro?: string } {
  const d = texto.replace(/\D/g, '')
  if (!d) return { erro: 'Cole a linha digitável ou o código de barras.' }
  if (![44, 47, 48].includes(d.length)) return { erro: `A linha digitável tem 47 dígitos (48 em conta de consumo/tributo); este tem ${d.length}.` }
  let barras: string
  if (d.length === 44) barras = d
  else if (d[0] === '8') {
    if (d.length !== 48) return { erro: 'Conta de consumo/tributo: a linha digitável tem 48 dígitos.' }
    const mod10 = d[2] === '6' || d[2] === '7'
    for (let b = 0; b < 4; b++) {
      const bloco = d.slice(b * 12, b * 12 + 11)
      if ((mod10 ? dv10(bloco) : dvArrecadacao11(bloco)) !== Number(d[b * 12 + 11])) return { erro: `O ${b + 1}º bloco não confere. Confira a digitação.` }
    }
    barras = [0, 1, 2, 3].map((b) => d.slice(b * 12, b * 12 + 11)).join('')
  } else {
    if (d.length !== 47) return { erro: 'Boleto bancário: a linha digitável tem 47 dígitos.' }
    if (dv10(d.slice(0, 9)) !== Number(d[9]) || dv10(d.slice(10, 20)) !== Number(d[20]) || dv10(d.slice(21, 31)) !== Number(d[31]))
      return { erro: 'A linha digitável não confere. Confira a digitação.' }
    barras = d.slice(0, 4) + d[32] + d.slice(33, 47) + d.slice(4, 9) + d.slice(10, 20) + d.slice(21, 31)
  }
  if (barras[0] === '8') {
    const mod10 = barras[2] === '6' || barras[2] === '7'
    const semDv = barras.slice(0, 3) + barras.slice(4)
    if ((mod10 ? dv10(semDv) : dvArrecadacao11(semDv)) !== Number(barras[3])) return { erro: 'O código de barras não confere.' }
    const valor = barras[2] === '6' || barras[2] === '8' ? Number(barras.slice(4, 15)) / 100 : 0
    return { codigo: { barras, arrecadacao: true, valor, vencimento: '' } }
  }
  if (dvBancario(barras.slice(0, 4) + barras.slice(5)) !== Number(barras[4])) return { erro: 'O código de barras não confere.' }
  return { codigo: { barras, arrecadacao: false, valor: Number(barras.slice(9, 19)) / 100, vencimento: dataDoFator(Number(barras.slice(5, 9)), hoje) } }
}

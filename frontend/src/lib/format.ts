/** Formatação/parsing pt-BR para moeda e percentuais. */

export const formatBRL = (n: number): string =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n || 0)

/** Número com 2 casas, sem símbolo (para inputs). */
export const formatNumberBRL = (n: number): string =>
  new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0)

/** Converte texto digitado ("34.000,50") em número (34000.5). */
export function parseBRL(input: string): number {
  const cleaned = (input || '')
    .replace(/[^\d,-]/g, '') // mantém dígitos, vírgula e sinal
    .replace(',', '.')
  const n = Number.parseFloat(cleaned)
  return Number.isFinite(n) ? n : 0
}

/**
 * Número vindo de planilha: aceita tanto o formato pt-BR digitado ("1.234,56")
 * quanto o que o Excel entrega de uma célula numérica ("1234.56").
 */
export function parseNumeroPlanilha(input: string): number {
  const t = (input || '').trim()
  if (/^-?\d+(\.\d+)?$/.test(t)) return Number(t)
  return parseBRL(t)
}

/** Fração (0.148) → "14,80%". */
export const formatPct = (frac: number, digits = 2): string =>
  `${new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format((frac || 0) * 100)}%`

/** Máscara progressiva de CNPJ: aceita qualquer texto, formata "00.000.000/0000-00". */
export function formatCnpj(input: string): string {
  const d = (input || '').replace(/\D/g, '').slice(0, 14)
  return d
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\/\d{4})(\d)/, '$1-$2')
}

/** Máscara progressiva de CPF: "000.000.000-00". */
export function formatCpf(input: string): string {
  const d = (input || '').replace(/\D/g, '').slice(0, 11)
  return d
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d{1,2})$/, '.$1-$2')
}

/**
 * Máscara progressiva de telefone: "(13) 3227-9176" no fixo (8 dígitos após o DDD)
 * e "(13) 99717-4540" no celular (9 dígitos). O parêntese só fecha a partir do
 * terceiro dígito, senão não dá para apagar de volta.
 */
export function formatTelefone(input: string): string {
  const d = (input || '').replace(/\D/g, '').slice(0, 11)
  if (d.length <= 2) return d
  const ddd = d.slice(0, 2)
  const resto = d.slice(2)
  if (resto.length <= 4) return `(${ddd}) ${resto}`
  if (resto.length <= 8) return `(${ddd}) ${resto.slice(0, 4)}-${resto.slice(4)}`
  return `(${ddd}) ${resto.slice(0, 5)}-${resto.slice(5)}`
}

/**
 * Máscara de RG: "12.345.678-9". Aceita X como dígito verificador e limita a 9
 * caracteres, que é o formato usado na maior parte dos estados.
 */
export function formatRg(input: string): string {
  const limpo = (input || '').toUpperCase().replace(/[^0-9X]/g, '').slice(0, 9)
  const corpo = limpo.slice(0, 8)
  const dv = limpo.slice(8)
  const base = corpo
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
  return dv ? `${base}-${dv}` : base
}

/** Agência bancária: só dígitos, com dígito verificador opcional ("1234-5"). */
export function formatAgencia(input: string): string {
  const d = (input || '').toUpperCase().replace(/[^0-9X]/g, '').slice(0, 6)
  return d.length > 4 ? `${d.slice(0, 4)}-${d.slice(4)}` : d
}

/** Conta bancária: dígitos e o verificador no fim ("12345-6" ou "12345-X"). */
export function formatContaBancaria(input: string): string {
  const d = (input || '').toUpperCase().replace(/[^0-9X]/g, '').slice(0, 13)
  return d.length > 1 ? `${d.slice(0, -1)}-${d.slice(-1)}` : d
}

/** CEP: "00000-000". */
export function formatCep(input: string): string {
  const d = (input || '').replace(/\D/g, '').slice(0, 8)
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d
}

/** CPF ou CNPJ conforme a quantidade de dígitos (até 11 = CPF). */
export function formatCpfCnpj(input: string): string {
  const d = (input || '').replace(/\D/g, '')
  return d.length > 11 ? formatCnpj(d) : formatCpf(d)
}

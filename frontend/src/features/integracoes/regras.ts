import { formatBRL } from '@/lib/format'
import type { RegrasBoleto } from './api'

const pct = (v: number) => `${v.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%`

/** O que o pagador vai ver acontecer com o boleto, em português (a prévia da tela). */
export function resumoRegras(r: RegrasBoleto): string[] {
  const linhas: string[] = []
  const multa = r.multaTipo === 'percentual' ? `multa de ${pct(r.multa)}` : r.multaTipo === 'valor' ? `multa de ${formatBRL(r.multa)}` : ''
  const juros =
    r.jurosTipo === 'percentual-mes' ? `juros de ${pct(r.juros)} ao mês` : r.jurosTipo === 'valor-dia' ? `juros de ${formatBRL(r.juros)} por dia` : ''
  const encargos = [multa, juros].filter(Boolean)
  linhas.push(encargos.length ? `Depois do vencimento: ${encargos.join(' e ')}.` : 'Depois do vencimento: sem multa e sem juros.')

  if (r.descontoTipo !== 'nenhum') {
    const valor = r.descontoTipo === 'percentual' ? pct(r.desconto) : formatBRL(r.desconto)
    const quando = r.descontoDiasAntes > 0 ? `até ${r.descontoDiasAntes} ${r.descontoDiasAntes === 1 ? 'dia' : 'dias'} antes do vencimento` : 'até o vencimento'
    linhas.push(`Desconto de ${valor} pagando ${quando}.`)
  }

  linhas.push(
    r.diasBaixa === 0
      ? 'O banco cancela o boleto no dia seguinte ao vencimento se não for pago.'
      : `O banco cancela o boleto sozinho ${r.diasBaixa} ${r.diasBaixa === 1 ? 'dia' : 'dias'} depois do vencimento se não for pago.`,
  )
  linhas.push(r.comPix ? 'Pix junto do boleto (QR Code no PDF).' : 'Só boleto, sem Pix.')
  return linhas
}

/** Dias até a validade do certificado (negativo = vencido). Null quando não há data. */
export function diasAteVencer(validoAte: string, hoje: Date): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(validoAte)) return null
  const [a, m, d] = validoAte.split('-').map(Number)
  const fim = Date.UTC(a, m - 1, d)
  const ini = Date.UTC(hoje.getFullYear(), hoje.getMonth(), hoje.getDate())
  return Math.round((fim - ini) / 86_400_000)
}

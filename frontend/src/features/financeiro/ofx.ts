/**
 * Leitor de extrato OFX (o arquivo que o banco exporta). O OFX "clássico" é SGML: as tags
 * não fecham (<TRNAMT>-12198.21), então lemos por expressão regular, tag a tag.
 */
export interface LinhaExtrato {
  /** FITID do banco: identifica a transação e evita reimportar a mesma linha. */
  id: string
  /** yyyy-MM-dd. */
  data: string
  /** Positivo = crédito (entrou), negativo = débito (saiu). */
  valor: number
  memo: string
  tipo: 'credito' | 'debito'
}

export interface Extrato {
  banco: string
  agencia: string
  conta: string
  inicio: string
  fim: string
  linhas: LinhaExtrato[]
}

const tag = (bloco: string, nome: string): string => {
  const m = new RegExp(`<${nome}>([^<\\r\\n]*)`, 'i').exec(bloco)
  return m ? m[1].trim() : ''
}

/** "20260920120000" (com ou sem o sufixo de fuso do banco) → "2026-09-20". */
const dataOfx = (s: string): string => (s.length >= 8 ? `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}` : '')

const numeroOfx = (s: string): number => {
  const n = Number(s.replace(',', '.'))
  return Number.isFinite(n) ? n : 0
}

export function lerOfx(texto: string): Extrato {
  const blocos = texto.split(/<STMTTRN>/i).slice(1)
  const linhas: LinhaExtrato[] = blocos.map((b, i) => {
    const corpo = b.split(/<\/STMTTRN>/i)[0]
    const valor = numeroOfx(tag(corpo, 'TRNAMT'))
    const memo = tag(corpo, 'MEMO') || tag(corpo, 'NAME')
    return {
      id: tag(corpo, 'FITID') || `sem-fitid-${i}`,
      data: dataOfx(tag(corpo, 'DTPOSTED')),
      valor,
      memo: memo.replace(/\s+/g, ' ').trim(),
      tipo: valor >= 0 ? 'credito' : 'debito',
    }
  })
  return {
    banco: tag(texto, 'BANKID') || tag(texto, 'ORG'),
    agencia: tag(texto, 'BRANCHID'),
    conta: tag(texto, 'ACCTID'),
    inicio: dataOfx(tag(texto, 'DTSTART')) || linhas[0]?.data || '',
    fim: dataOfx(tag(texto, 'DTEND')) || linhas[linhas.length - 1]?.data || '',
    linhas,
  }
}

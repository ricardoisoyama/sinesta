import { BANCOS } from './bancos-lista'
import { semAcento } from './texto'

export interface Banco {
  /** Código COMPE (3 dígitos, ex.: "341"). */
  codigo: string
  ispb: string
  nome: string
}

const LISTA: Banco[] = BANCOS.map(([codigo, ispb, nome]) => ({ codigo, ispb, nome }))

/** Como o banco é gravado e exibido: "341 - ITAÚ UNIBANCO S.A.". */
export const rotuloBanco = (b: Banco) => `${b.codigo} - ${b.nome}`

/**
 * Busca por código COMPE, ISPB ou nome (sem acento). Código casa pelo início
 * ("34" acha 341); nome casa por trecho ("ita" acha Itaú).
 */
export function buscarBancos(termo: string, limite = 8): Banco[] {
  const t = semAcento(termo.trim())
  if (!t) return []
  const soDigitos = /^\d+$/.test(t)
  // Quanto menor, melhor: código exato < código começa com < ISPB começa com < nome.
  const pontua = (b: Banco): number => {
    if (soDigitos) {
      if (b.codigo === t.padStart(3, '0')) return 0
      if (b.codigo.startsWith(t)) return 1
      if (b.ispb.startsWith(t)) return 2
      return -1
    }
    const i = semAcento(b.nome).indexOf(t)
    return i === -1 ? -1 : 10 + i
  }
  return LISTA.map((b) => ({ b, p: pontua(b) }))
    .filter((x) => x.p >= 0)
    .sort((x, y) => x.p - y.p || x.b.codigo.localeCompare(y.b.codigo))
    .slice(0, limite)
    .map((x) => x.b)
}

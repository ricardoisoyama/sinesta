import { semAcento } from '@/lib/texto'

/** Região em que o vendedor NÃO pode vender (lista de exclusão). */
export interface RegiaoBloqueada {
  /** "pais" | "estado" | "cidade". */
  tipo: 'pais' | 'estado' | 'cidade'
  /** "Brasil", "SP" ou "Campinas - SP". */
  valor: string
}

/** UF da cidade "Campinas - SP" → "SP". */
export const ufDaCidade = (cidade: string): string => {
  const i = cidade.lastIndexOf('-')
  return i < 0 ? '' : cidade.slice(i + 1).trim().toUpperCase()
}

/**
 * Espelho de `RegiaoVendedor.Bloqueio` do backend: devolve a região que bloqueia o
 * vendedor para a cidade do cliente ("Cidade - UF"), ou null quando pode atender.
 */
export function bloqueioDeRegiao(regioes: RegiaoBloqueada[], cidadeCliente: string): RegiaoBloqueada | null {
  if (!cidadeCliente.trim()) return null
  const cidade = semAcento(cidadeCliente.trim())
  const uf = ufDaCidade(cidadeCliente)
  for (const r of regioes) {
    const valor = semAcento(r.valor.trim())
    if (!valor) continue
    if (r.tipo === 'pais' && valor === 'brasil' && uf.length === 2) return r
    if (r.tipo === 'estado' && uf.length === 2 && valor.toUpperCase() === uf) return r
    if (r.tipo === 'cidade' && valor === cidade) return r
  }
  return null
}

export const descreverRegiao = (r: RegiaoBloqueada) =>
  r.tipo === 'pais' ? `País: ${r.valor}` : r.tipo === 'estado' ? `Estado: ${r.valor}` : `Cidade: ${r.valor}`

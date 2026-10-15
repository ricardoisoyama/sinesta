import { semAcento } from '@/lib/texto'
import { separarCidade } from '@/lib/ufs'

/** Região em que o vendedor NÃO pode vender (lista de exclusão). */
export interface RegiaoBloqueada {
  /** "pais" | "estado" | "cidade". */
  tipo: 'pais' | 'estado' | 'cidade'
  /** "Brasil", "SP" ou "Campinas - SP". */
  valor: string
}

/** UF da cidade ("Campinas - SP" ou "SP - Campinas" → "SP"). Vazio sem UF válida. */
export const ufDaCidade = (cidade: string): string => separarCidade(cidade).uf

/** Forma única para comparar cidades escritas em qualquer dos dois formatos. */
const canonica = (texto: string) => {
  const { nome, uf } = separarCidade(texto)
  return semAcento(uf ? `${nome} - ${uf}` : nome)
}

/**
 * Espelho de `RegiaoVendedor.Bloqueio` do backend: devolve a região que bloqueia o
 * vendedor para a cidade do cliente ("Cidade - UF" ou "UF - Cidade"), ou null quando pode atender.
 */
export function bloqueioDeRegiao(regioes: RegiaoBloqueada[], cidadeCliente: string): RegiaoBloqueada | null {
  if (!cidadeCliente.trim()) return null
  const cidade = canonica(cidadeCliente)
  const uf = ufDaCidade(cidadeCliente)
  for (const r of regioes) {
    const valor = semAcento(r.valor.trim())
    if (!valor) continue
    if (r.tipo === 'pais' && valor === 'brasil' && uf.length === 2) return r
    if (r.tipo === 'estado' && uf.length === 2 && valor.toUpperCase() === uf) return r
    if (r.tipo === 'cidade' && canonica(r.valor) === cidade) return r
  }
  return null
}

export const descreverRegiao = (r: RegiaoBloqueada) =>
  r.tipo === 'pais' ? `País: ${r.valor}` : r.tipo === 'estado' ? `Estado: ${r.valor}` : `Cidade: ${r.valor}`

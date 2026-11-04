/**
 * Ordem das fichas e pastas: a lista inteira é gravada na ordem da tela (o servidor numera pela posição).
 * Mover = tirar o item e pôr antes/depois do alvo; sem alvo, vai para o fim. `mudar` troca a pasta junto.
 */
export function moverPara<T extends { id: string }>(lista: T[], id: string, alvoId: string, depois: boolean, mudar?: (x: T) => T): T[] {
  const item = lista.find((x) => x.id === id)
  if (!item || id === alvoId) return lista
  const resto = lista.filter((x) => x.id !== id)
  const novo = mudar ? mudar(item) : item
  const i = resto.findIndex((x) => x.id === alvoId)
  if (i < 0) return [...resto, novo]
  resto.splice(depois ? i + 1 : i, 0, novo)
  return resto
}

/** Sobe (−1) ou desce (+1) uma posição entre os irmãos (mesmo nível). */
export function moverEntreIrmaos<T extends { id: string }>(lista: T[], irmaos: T[], id: string, delta: -1 | 1): T[] {
  const i = irmaos.findIndex((x) => x.id === id)
  const alvo = irmaos[i + delta]
  return i < 0 || !alvo ? lista : moverPara(lista, id, alvo.id, delta > 0)
}

/** Onde soltar, pela altura do cursor na linha: pasta aceita "dentro" no meio; ficha só antes/depois. */
export type Zona = 'antes' | 'depois' | 'dentro'
export const zonaDoCursor = (fracao: number, aceitaDentro: boolean): Zona =>
  aceitaDentro ? (fracao < 0.3 ? 'antes' : fracao > 0.7 ? 'depois' : 'dentro') : fracao < 0.5 ? 'antes' : 'depois'

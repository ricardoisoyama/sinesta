/** Abre a janela do suporte de qualquer lugar (menu, busca global) sem acoplar ao componente. */
const EVENTO = 'elrond:abrir-suporte'

export const abrirSuporte = () => window.dispatchEvent(new Event(EVENTO))

export function aoPedirSuporte(fn: () => void): () => void {
  window.addEventListener(EVENTO, fn)
  return () => window.removeEventListener(EVENTO, fn)
}

import { useEffect, useState, type FocusEvent, type MouseEvent } from 'react'
import { createPortal } from 'react-dom'
import { Info } from 'lucide-react'
import s from './hint.module.css'

interface Props {
  /** Texto da explicação. */
  text: string
  /** Mantido por compatibilidade: o balão agora se posiciona sozinho. */
  left?: boolean
}

/** Onde o balão abre. Fica fora do modal (portal no body), então nunca é cortado. */
interface Posicao {
  /** Centro horizontal do ícone, já limitado para o balão caber na janela. */
  x: number
  /** Distância do topo (abaixo do ícone) ou do rodapé (acima do ícone). */
  y: number
  acima: boolean
}

const LARGURA_MAX = 240
const MARGEM = 8

/**
 * Ícone de ajuda com balão explicativo. Abre no hover e no foco pelo teclado.
 * O balão é renderizado no body com posição fixa: dentro de modal com rolagem
 * ele ficava cortado pela borda; assim cabe sempre, e vira para baixo quando
 * o ícone está colado no topo.
 */
export function Hint({ text }: Props) {
  const [pos, setPos] = useState<Posicao | null>(null)

  const abrir = (el: HTMLElement) => {
    const r = el.getBoundingClientRect()
    const meia = LARGURA_MAX / 2
    const x = Math.min(Math.max(r.left + r.width / 2, MARGEM + meia), window.innerWidth - MARGEM - meia)
    // Altura estimada pelo tamanho do texto (~34 caracteres por linha a 12px): textos longos
    // perto do topo abrem para baixo, senão o começo ficava cortado na borda da janela.
    const altura = Math.ceil(text.length / 34) * 17.5 + 18
    const acima = r.top > altura + 16
    setPos({ x, y: acima ? window.innerHeight - r.top + 7 : r.bottom + 7, acima })
  }
  const onEnter = (e: MouseEvent<HTMLElement>) => abrir(e.currentTarget)
  const onFocus = (e: FocusEvent<HTMLElement>) => abrir(e.currentTarget)
  const fechar = () => setPos(null)

  // Rolagem ou redimensionamento desloca o ícone: fecha para não ficar balão perdido.
  useEffect(() => {
    if (!pos) return
    window.addEventListener('scroll', fechar, true)
    window.addEventListener('resize', fechar)
    return () => {
      window.removeEventListener('scroll', fechar, true)
      window.removeEventListener('resize', fechar)
    }
  }, [pos])

  return (
    // Fora da ordem do Tab: quem preenche o formulário pula de campo em campo, sem parar no balão
    // (o balão abre no hover; o texto continua no aria-label para leitores de tela).
    <span
      className={s.wrap}
      tabIndex={-1}
      role="note"
      aria-label={text}
      onMouseEnter={onEnter}
      onMouseLeave={fechar}
      onFocus={onFocus}
      onBlur={fechar}
    >
      <Info className={s.icon} aria-hidden />
      {pos &&
        createPortal(
          <span
            className={`${s.bubble} ${pos.acima ? s.acima : s.abaixo}`}
            role="tooltip"
            style={pos.acima ? { left: pos.x, bottom: pos.y } : { left: pos.x, top: pos.y }}
          >
            {text}
          </span>,
          document.body,
        )}
    </span>
  )
}

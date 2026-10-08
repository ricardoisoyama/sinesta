import { useEffect, useId, useState, type KeyboardEvent } from 'react'

/**
 * Teclado nas listas de sugestão (autocompletes): ↓ ↑ percorrem, Enter ou Tab escolhem o item
 * destacado (com um item só na lista, escolhem direto, sem precisar destacar), Esc fecha.
 * O componente continua dono da lista e de quando ela está aberta.
 * `escolheUnico` = false quando a lista aparece sem nada digitado (um Tab de passagem não escolhe).
 */
export function useNavegacaoLista<T>(itens: T[], aberto: boolean, escolher: (item: T) => void, fechar: () => void, escolheUnico = true) {
  const [ativo, setAtivo] = useState(-1)
  const listaId = useId()
  // A lista muda a cada letra digitada: destaque fora do tamanho atual não vale.
  const atual = aberto && ativo < itens.length ? ativo : -1

  // Mantém o item destacado visível quando a lista tem rolagem.
  useEffect(() => {
    if (atual < 0) return
    document.getElementById(listaId)?.querySelectorAll('li')[atual]?.scrollIntoView({ block: 'nearest' })
  }, [atual, listaId])

  const alvo = (): T | undefined => (atual >= 0 ? itens[atual] : escolheUnico && itens.length === 1 ? itens[0] : undefined)

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!aberto || itens.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setAtivo((atual + 1) % itens.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setAtivo(atual <= 0 ? itens.length - 1 : atual - 1)
    } else if (e.key === 'Enter') {
      // Com a lista aberta, Enter escolhe; não envia o formulário por engano.
      e.preventDefault()
      const item = alvo()
      if (item !== undefined) {
        escolher(item)
        setAtivo(-1)
      }
    } else if (e.key === 'Tab') {
      // Tab escolhe e segue para o próximo campo (o foco anda normalmente).
      const item = alvo()
      if (item !== undefined) {
        escolher(item)
        setAtivo(-1)
      }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      fechar()
      setAtivo(-1)
    }
  }

  /** Props de cada item: destaque e o mouse movendo o destaque. */
  const itemProps = (i: number) => ({
    'aria-selected': i === atual,
    'data-ativo': i === atual ? 'sim' : undefined,
    onMouseEnter: () => setAtivo(i),
  })

  return { listaId, onKeyDown, itemProps, limpar: () => setAtivo(-1) }
}

import { useState } from 'react'
import { semAcento } from '@/lib/texto'
import s from './cidade-autocomplete.module.css'
import { useNavegacaoLista } from './useNavegacaoLista'

interface Props {
  value: string
  onChange: (v: string) => void
  /** Sugestões (a pessoa pode digitar qualquer outra coisa). */
  sugestoes: string[]
  placeholder?: string
  /** Quantas sugestões mostrar de cada vez. */
  limite?: number
}

/**
 * Texto livre com sugestões (marca e modelo do veículo, por exemplo). Filtra sem acento e
 * sem maiúscula; ↓ ↑ e Enter escolhem. Tab não troca o que foi digitado por uma sugestão.
 */
export function TextoComSugestoes({ value, onChange, sugestoes, placeholder, limite = 8 }: Props) {
  const [aberto, setAberto] = useState(false)
  const termo = semAcento(value.trim())
  const lista = [...new Set(sugestoes.filter(Boolean))]
    .filter((x) => !termo || (semAcento(x).includes(termo) && semAcento(x) !== termo))
    .slice(0, limite)
  const escolher = (x: string) => {
    onChange(x)
    setAberto(false)
  }
  const nav = useNavegacaoLista(lista, aberto, escolher, () => setAberto(false), false)

  return (
    <div className={s.wrap}>
      <input
        value={value}
        onChange={(e) => {
          onChange(e.target.value)
          setAberto(true)
          nav.limpar()
        }}
        onFocus={() => setAberto(true)}
        onBlur={() => setAberto(false)}
        onKeyDown={nav.onKeyDown}
        placeholder={placeholder}
        autoComplete="off"
      />
      {aberto && lista.length > 0 && (
        <ul className={s.lista} role="listbox" id={nav.listaId}>
          {lista.map((x, i) => (
            <li key={x} {...nav.itemProps(i)}>
              {/* onMouseDown: dispara antes do blur do input, senão a lista fecha antes do clique */}
              <button type="button" tabIndex={-1} onMouseDown={() => escolher(x)}>
                {x}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

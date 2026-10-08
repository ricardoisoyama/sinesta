import { useState } from 'react'
import { buscarPaises, paisPorNome, type Pais } from '@/lib/paises'
import s from './cidade-autocomplete.module.css'
import { useNavegacaoLista } from './useNavegacaoLista'

interface Props {
  /** Nome do país gravado (ex.: "Estados Unidos"). */
  value: string
  onChange: (pais: string, dados?: Pais) => void
  placeholder?: string
  invalid?: boolean
}

/**
 * País do exterior: digite o nome, o código (US) ou o DDI (+44) e escolha na lista
 * (↓ ↑ Enter/Tab). Grava o nome em português; o DDI e a moeda vêm junto para quem usa.
 */
export function PaisAutocomplete({ value, onChange, placeholder, invalid }: Props) {
  const [texto, setTexto] = useState<string | null>(null)
  const [aberto, setAberto] = useState(false)
  const exibido = texto ?? value
  const sugestoes = buscarPaises(texto ?? '').slice(0, 60)
  const escolher = (p: Pais) => {
    onChange(p.nome, p)
    setTexto(null)
    setAberto(false)
  }
  const nav = useNavegacaoLista(sugestoes, aberto, escolher, () => setAberto(false), !!texto?.trim())
  const atual = paisPorNome(value)

  return (
    <div className={s.wrap}>
      <input
        value={exibido}
        onChange={(e) => {
          setTexto(e.target.value)
          setAberto(true)
          nav.limpar()
        }}
        onFocus={() => setAberto(true)}
        onBlur={() => {
          setAberto(false)
          // Texto que não virou país da lista volta para o gravado.
          setTexto(null)
        }}
        onKeyDown={nav.onKeyDown}
        placeholder={placeholder ?? 'Digite o país (ex.: Estados Unidos)'}
        autoComplete="off"
        aria-invalid={invalid || undefined}
        title={atual ? `DDI +${atual.ddi} · moeda ${atual.moeda}` : undefined}
      />
      {aberto && sugestoes.length > 0 && (
        <ul className={s.lista} role="listbox" id={nav.listaId}>
          {sugestoes.map((p, i) => (
            <li key={p.iso} {...nav.itemProps(i)}>
              <button type="button" tabIndex={-1} onMouseDown={() => escolher(p)}>
                {p.nome} <span>+{p.ddi}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

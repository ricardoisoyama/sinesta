import { useState } from 'react'
import { buscarBancos, rotuloBanco, type Banco } from '@/lib/bancos'
import s from './cidade-autocomplete.module.css'
import { useNavegacaoLista } from './useNavegacaoLista'

interface Props {
  value: string
  onChange: (v: string) => void
  placeholder?: string
}

/**
 * Input de banco com sugestões da lista do Banco Central: digite o código
 * (341), o ISPB ou o nome (Itaú). Ao escolher, grava "341 - ITAÚ UNIBANCO S.A.".
 */
export function BancoAutocomplete({ value, onChange, placeholder }: Props) {
  const [sugestoes, setSugestoes] = useState<Banco[]>([])
  const [aberto, setAberto] = useState(false)

  const digitar = (texto: string) => {
    onChange(texto)
    const res = buscarBancos(texto)
    setSugestoes(res)
    setAberto(res.length > 0)
  }

  const escolher = (b: Banco) => {
    onChange(rotuloBanco(b))
    setSugestoes([])
    setAberto(false)
  }
  const nav = useNavegacaoLista(sugestoes, aberto, escolher, () => setAberto(false))

  return (
    <div className={s.wrap}>
      <input
        value={value}
        onChange={(e) => {
          digitar(e.target.value)
          nav.limpar()
        }}
        onFocus={() => setAberto(sugestoes.length > 0)}
        onBlur={() => setAberto(false)}
        onKeyDown={nav.onKeyDown}
        placeholder={placeholder ?? 'Código ou nome (ex.: 341 ou Itaú)'}
        autoComplete="off"
      />
      {aberto && (
        <ul className={s.lista} role="listbox" id={nav.listaId}>
          {sugestoes.map((b, i) => (
            <li key={b.ispb} {...nav.itemProps(i)}>
              {/* onMouseDown: dispara antes do blur do input, senão a lista fecha antes do clique */}
              <button type="button" tabIndex={-1} onMouseDown={() => escolher(b)}>
                {b.nome} <span>{b.codigo}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

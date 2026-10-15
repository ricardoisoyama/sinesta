import { useRef, useState } from 'react'
import { buscarCidades, type CidadeDto } from '@/features/cadastros/api'
import s from './cidade-autocomplete.module.css'
import { useNavegacaoLista } from './useNavegacaoLista'

interface Props {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  /** Só cidades desta UF (vazio = todas). */
  uf?: string
  /** "Cidade - UF" (endereços, padrão) ou "UF - Cidade" (Dados da Operação). */
  formato?: 'cidade-uf' | 'uf-cidade'
}

/**
 * Input de cidade com sugestões da base IBGE (backend /api/cidades).
 * Ao escolher uma sugestão, preenche "Cidade - UF" (ou "UF - Cidade"). Texto livre continua valendo.
 */
export function CidadeAutocomplete({ value, onChange, placeholder, uf = '', formato = 'cidade-uf' }: Props) {
  const rotulo = (c: CidadeDto) => (formato === 'uf-cidade' ? `${c.uf} - ${c.nome}` : `${c.nome} - ${c.uf}`)
  const [sugestoes, setSugestoes] = useState<CidadeDto[]>([])
  const [aberto, setAberto] = useState(false)
  const timer = useRef<number | undefined>(undefined)

  const digitar = (texto: string) => {
    onChange(texto)
    window.clearTimeout(timer.current)
    const termo = texto.trim()
    if (termo.length < 2) {
      setSugestoes([])
      setAberto(false)
      return
    }
    timer.current = window.setTimeout(async () => {
      try {
        const res = await buscarCidades(termo, uf)
        setSugestoes(res)
        setAberto(res.length > 0)
      } catch {
        setSugestoes([])
        setAberto(false)
      }
    }, 250)
  }

  const escolher = (c: CidadeDto) => {
    onChange(rotulo(c))
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
        placeholder={placeholder}
        autoComplete="off"
      />
      {aberto && (
        <ul className={s.lista} role="listbox" id={nav.listaId}>
          {sugestoes.map((c, i) => (
            <li key={c.id} {...nav.itemProps(i)}>
              {/* onMouseDown: dispara antes do blur do input, senão a lista fecha antes do clique */}
              <button type="button" tabIndex={-1} onMouseDown={() => escolher(c)}>
                {formato === 'uf-cidade' ? (
                  rotulo(c)
                ) : (
                  <>
                    {c.nome} <span>{c.uf}</span>
                  </>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

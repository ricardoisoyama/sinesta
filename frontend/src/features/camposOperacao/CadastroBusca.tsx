import { useState } from 'react'
import { formatCpfCnpj } from '@/lib/format'
import { semAcento } from '@/lib/texto'
import s from '@/features/common/cidade-autocomplete.module.css'
import { useNavegacaoLista } from '@/features/common/useNavegacaoLista'

export interface OpcaoCadastro {
  id: string
  nome: string
  /** CPF/CNPJ (clientes e fornecedores): também serve para buscar. */
  doc?: string
}

interface Props {
  opcoes: OpcaoCadastro[]
  /** Id escolhido ('' = nenhum). */
  value: string
  onChange: (id: string) => void
  placeholder?: string
}

/**
 * Campo do tipo Cadastro: busca por nome ou por CPF/CNPJ, sem carregar uma lista enorme na tela.
 * Só aceita um registro escolhido da lista.
 */
export function CadastroBusca({ opcoes, value, onChange, placeholder }: Props) {
  const escolhido = opcoes.find((o) => o.id === value)
  const [texto, setTexto] = useState<string | null>(null)
  const [aberto, setAberto] = useState(false)
  const exibido = texto ?? escolhido?.nome ?? ''
  const termo = semAcento((texto ?? '').trim())
  const digitos = termo.replace(/\D/g, '')
  const sugestoes = termo
    ? opcoes
        .filter((o) => semAcento(o.nome).includes(termo) || (digitos.length >= 3 && (o.doc ?? '').replace(/\D/g, '').includes(digitos)))
        .slice(0, 8)
    : []
  const escolher = (o: OpcaoCadastro) => {
    onChange(o.id)
    setTexto(null)
    setAberto(false)
  }
  const nav = useNavegacaoLista(sugestoes, aberto, escolher, () => setAberto(false))

  return (
    <div className={s.wrap}>
      <input
        value={exibido}
        onChange={(e) => {
          setTexto(e.target.value)
          setAberto(true)
          nav.limpar()
          if (value) onChange('')
        }}
        onFocus={() => setAberto(true)}
        onBlur={() => {
          setAberto(false)
          setTexto(null)
        }}
        onKeyDown={nav.onKeyDown}
        placeholder={placeholder ?? 'Digite o nome ou o CNPJ'}
        autoComplete="off"
      />
      {aberto && sugestoes.length > 0 && (
        <ul className={s.lista} role="listbox" id={nav.listaId}>
          {sugestoes.map((o, i) => (
            <li key={o.id} {...nav.itemProps(i)}>
              <button type="button" tabIndex={-1} onMouseDown={() => escolher(o)}>
                {o.nome}
                {o.doc && <span>{formatCpfCnpj(o.doc)}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
      {aberto && termo && sugestoes.length === 0 && (
        <ul className={s.lista}>
          <li style={{ padding: '8px 12px', fontSize: 12.5, color: '#6b7b72' }}>Nada encontrado no cadastro.</li>
        </ul>
      )}
    </div>
  )
}

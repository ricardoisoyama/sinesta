import { useState } from 'react'
import { formatCpfCnpj } from '@/lib/format'
import { semAcento } from '@/lib/texto'
import s from '@/features/common/cidade-autocomplete.module.css'
import { useNavegacaoLista } from '@/features/common/useNavegacaoLista'
import type { Parceiro } from './types'

interface Props {
  clientes: Parceiro[]
  /** Texto digitado (nome). */
  value: string
  /** Cliente escolhido da lista ('' = ainda não escolheu). */
  clienteId: string
  onChange: (texto: string) => void
  onSelect: (cliente: Parceiro) => void
  placeholder?: string
  className?: string
  invalid?: boolean
}

/**
 * Busca um cliente do cadastro por nome, nome fantasia ou CNPJ. A proposta só
 * aceita cliente escolhido da lista (quem não existe precisa ser cadastrado antes).
 */
export function ClienteAutocomplete({ clientes, value, clienteId, onChange, onSelect, placeholder, className, invalid }: Props) {
  const [aberto, setAberto] = useState(false)
  const termo = semAcento(value.trim())
  const digitos = termo.replace(/\D/g, '')
  const sugestoes = termo
    ? clientes
        .filter(
          (c) =>
            semAcento(c.nome).includes(termo) ||
            semAcento(c.nomeFantasia).includes(termo) ||
            (digitos.length >= 3 && c.cpfCnpj.replace(/\D/g, '').includes(digitos)),
        )
        .slice(0, 8)
    : clientes.slice(0, 8)
  const escolher = (c: Parceiro) => {
    onSelect(c)
    setAberto(false)
  }
  const nav = useNavegacaoLista(sugestoes, aberto, escolher, () => setAberto(false), !!termo)

  return (
    <div className={s.wrap}>
      <input
        className={className}
        value={value}
        onChange={(e) => {
          onChange(e.target.value)
          setAberto(true)
          nav.limpar()
        }}
        onFocus={() => setAberto(true)}
        onBlur={() => setAberto(false)}
        onKeyDown={nav.onKeyDown}
        placeholder={placeholder ?? 'Digite e escolha o cliente do cadastro'}
        autoComplete="off"
        aria-invalid={invalid || undefined}
        data-escolhido={clienteId ? 'sim' : 'nao'}
      />
      {aberto && sugestoes.length > 0 && (
        <ul className={s.lista} role="listbox" id={nav.listaId}>
          {sugestoes.map((c, i) => (
            <li key={c.id} {...nav.itemProps(i)}>
              <button type="button" tabIndex={-1} onMouseDown={() => escolher(c)}>
                {c.nomeFantasia || c.nome}
                <span>{c.cpfCnpj ? formatCpfCnpj(c.cpfCnpj) : c.cidade || 'sem CNPJ'}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

import { useState } from 'react'
import { useUsuarios } from '@/features/usuarios/store'
import type { Usuario } from '@/features/usuarios/types'
import { semAcento } from '@/lib/texto'
import s from '@/features/common/cidade-autocomplete.module.css'
import { useNavegacaoLista } from '@/features/common/useNavegacaoLista'

interface Props {
  /** Id do funcionário vinculado ('' = nenhum). */
  usuarioId: string
  onChange: (usuario: Usuario | null) => void
  placeholder?: string
}

/**
 * Busca um funcionário por nome ou CPF e devolve o registro escolhido.
 * Usado no cadastro do vendedor para dizer "este vendedor é o funcionário X":
 * é esse elo que faz a Precificação saber quem é o vendedor pelo usuário logado.
 */
export function FuncionarioAutocomplete({ usuarioId, onChange, placeholder }: Props) {
  const { usuarios } = useUsuarios()
  const vinculado = usuarios.find((u) => u.id === usuarioId) ?? null
  const [texto, setTexto] = useState<string | null>(null)
  const [aberto, setAberto] = useState(false)

  const exibido = texto ?? (vinculado ? `${vinculado.nome}${vinculado.cpf ? ` · ${vinculado.cpf}` : ''}` : '')
  const termo = semAcento((texto ?? '').trim())
  const digitos = termo.replace(/\D/g, '')
  const sugestoes = termo
    ? usuarios
        .filter((u) => u.status === 'ativo')
        .filter((u) => semAcento(u.nome).includes(termo) || (digitos.length >= 3 && u.cpf.replace(/\D/g, '').includes(digitos)))
        .slice(0, 8)
    : []

  const digitar = (v: string) => {
    setTexto(v)
    setAberto(true)
    if (!v.trim() && vinculado) onChange(null)
  }

  const escolher = (u: Usuario) => {
    onChange(u)
    setTexto(null)
    setAberto(false)
  }
  const nav = useNavegacaoLista(sugestoes, aberto, escolher, () => setAberto(false))

  return (
    <div className={s.wrap}>
      <input
        value={exibido}
        onChange={(e) => {
          digitar(e.target.value)
          nav.limpar()
        }}
        onFocus={() => setAberto(true)}
        onBlur={() => {
          setAberto(false)
          setTexto(null)
        }}
        onKeyDown={nav.onKeyDown}
        placeholder={placeholder ?? 'Nome ou CPF do funcionário'}
        autoComplete="off"
      />
      {aberto && sugestoes.length > 0 && (
        <ul className={s.lista} role="listbox" id={nav.listaId}>
          {sugestoes.map((u, i) => (
            <li key={u.id} {...nav.itemProps(i)}>
              <button type="button" tabIndex={-1} onMouseDown={() => escolher(u)}>
                {u.nome} <span>{u.cpf || u.cargo || u.perfil}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

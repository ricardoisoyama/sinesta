import { useEffect, useRef, useState } from 'react'
import { ChevronDown, Search, X } from 'lucide-react'
import { semAcento } from '@/lib/texto'
import type { PlanoConta } from './types'
import s from './planoContaBusca.module.css'

interface Props {
  value: string
  onChange: (id: string) => void
  /** Todas as contas (a árvore precisa dos grupos para os títulos). */
  contas: PlanoConta[]
  /** Quais contas (sem filhos) podem ser escolhidas. Padrão: todas as ativas. */
  permitida?: (c: PlanoConta) => boolean
  /** Texto da opção vazia; sem ele, não dá para deixar em branco. */
  vazio?: string
  invalid?: boolean
  id?: string
}

interface Linha {
  conta: PlanoConta
  nivel: number
  grupo: boolean
}

const porCodigo = (a: PlanoConta, b: PlanoConta) => a.codigo.localeCompare(b.codigo, 'pt-BR', { numeric: true })

/**
 * Escolha de conta do plano de contas com busca: a árvore como na tela do Plano de Contas, com os
 * grupos em negrito (só título) e as contas que podem ser escolhidas embaixo. Digitar filtra por
 * código ou nome e mantém o grupo de cada conta achada.
 */
export function PlanoContaBusca({ value, onChange, contas, permitida = (c) => c.status === 'ativo', vazio, invalid, id }: Props) {
  const [aberto, setAberto] = useState(false)
  const [busca, setBusca] = useState('')
  const caixa = useRef<HTMLDivElement>(null)
  const entrada = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!aberto) return
    const fora = (e: MouseEvent) => {
      if (caixa.current && !caixa.current.contains(e.target as Node)) setAberto(false)
    }
    document.addEventListener('mousedown', fora)
    return () => document.removeEventListener('mousedown', fora)
  }, [aberto])

  const filhos = (paiId: string | null) => contas.filter((c) => c.paiId === paiId).sort(porCodigo)
  const termo = semAcento(busca)
  const bate = (c: PlanoConta) => !termo || semAcento(`${c.codigo} ${c.nome}`).includes(termo)

  // Monta a lista: um grupo só aparece se tiver, embaixo, alguma conta que pode ser escolhida e bate com a busca.
  const montar = (paiId: string | null, nivel: number): Linha[] =>
    filhos(paiId).flatMap((c) => {
      const sub = filhos(c.id).length ? montar(c.id, nivel + 1) : []
      if (filhos(c.id).length) {
        const temFolha = sub.some((l) => !l.grupo)
        // Buscando pelo nome do grupo: mostra o grupo inteiro (o que pode ser escolhido dentro dele).
        if (termo && bate(c) && !temFolha) {
          const todas = (pai: string, n: number): Linha[] =>
            filhos(pai).flatMap((f) => (filhos(f.id).length ? [{ conta: f, nivel: n, grupo: true }, ...todas(f.id, n + 1)] : permitida(f) ? [{ conta: f, nivel: n, grupo: false }] : []))
          const dentro = todas(c.id, nivel + 1)
          return dentro.some((l) => !l.grupo) ? [{ conta: c, nivel, grupo: true }, ...dentro] : []
        }
        return temFolha ? [{ conta: c, nivel, grupo: true }, ...sub] : []
      }
      return permitida(c) && bate(c) ? [{ conta: c, nivel, grupo: false }] : []
    })
  const linhas = aberto ? montar(null, 0) : []
  const escolhida = contas.find((c) => c.id === value)
  const primeira = linhas.find((l) => !l.grupo)

  const escolher = (idConta: string) => {
    onChange(idConta)
    setAberto(false)
    setBusca('')
  }

  return (
    <div className={s.caixa} ref={caixa}>
      <div className={`${s.campo} ${invalid ? s.invalido : ''} ${aberto ? s.campoAberto : ''}`} onClick={() => { setAberto(true); entrada.current?.focus() }}>
        {aberto ? <Search size={14} className={s.lupa} /> : null}
        <input
          id={id}
          ref={entrada}
          value={aberto ? busca : escolhida ? `${escolhida.codigo} · ${escolhida.nome}` : ''}
          placeholder={aberto ? 'Digite o código ou o nome da conta' : vazio ?? 'Escolha a conta'}
          onFocus={() => setAberto(true)}
          onChange={(e) => { setBusca(e.target.value); setAberto(true) }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') { setAberto(false); setBusca('') }
            if (e.key === 'Enter') { e.preventDefault(); if (primeira) escolher(primeira.conta.id) }
          }}
          readOnly={!aberto}
          autoComplete="off"
          role="combobox"
          aria-expanded={aberto}
        />
        {value && vazio && !aberto ? (
          <button type="button" className={s.limpar} title="Deixar sem conta" onClick={(e) => { e.stopPropagation(); onChange('') }}><X size={13} /></button>
        ) : (
          <ChevronDown size={15} className={s.seta} />
        )}
      </div>
      {aberto && (
        <ul className={s.lista} role="listbox">
          {vazio && !termo && (
            <li className={`${s.opcao} ${!value ? s.atual : ''}`} onMouseDown={(e) => { e.preventDefault(); escolher('') }}>{vazio}</li>
          )}
          {linhas.map((l) =>
            l.grupo ? (
              <li key={l.conta.id} className={s.grupo} style={{ paddingLeft: 10 + l.nivel * 14 }}>{l.conta.codigo} · {l.conta.nome}</li>
            ) : (
              <li
                key={l.conta.id}
                role="option"
                aria-selected={l.conta.id === value}
                className={`${s.opcao} ${l.conta.id === value ? s.atual : ''}`}
                style={{ paddingLeft: 10 + l.nivel * 14 }}
                onMouseDown={(e) => { e.preventDefault(); escolher(l.conta.id) }}
              >
                {l.conta.codigo} · {l.conta.nome}
              </li>
            ),
          )}
          {linhas.length === 0 && <li className={s.nada}>Nenhuma conta com “{busca}”.</li>}
        </ul>
      )}
    </div>
  )
}

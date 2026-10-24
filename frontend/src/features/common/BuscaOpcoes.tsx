import { useEffect, useRef, useState } from 'react'
import { ChevronDown, Search, Sparkles, X } from 'lucide-react'
import { semAcento } from '@/lib/texto'
import s from '@/features/planoContas/planoContaBusca.module.css'
import extra from './buscaOpcoes.module.css'

/** Uma opção da lista. Grupo: título em negrito (ex.: o CST "000 - Tributação integral"). */
export interface OpcaoBusca {
  valor: string
  rotulo: string
  grupo?: string
  /** Texto menor embaixo (ex.: o local da operação). */
  detalhe?: string
}

interface Props {
  value: string
  onChange: (valor: string) => void
  opcoes: OpcaoBusca[]
  /** Valores sugeridos (ex.: pela tabela oficial de correlação): aparecem primeiro, marcados. */
  sugeridos?: string[]
  placeholder?: string
  vazio?: string
  id?: string
  /** Limite de linhas mostradas (listas grandes, como a NBS): a busca filtra o resto. */
  limite?: number
}

/**
 * Lista com busca e tópicos em negrito (o combo do CST/classificação, do indicador da operação, da NBS):
 * digitar filtra por código ou texto; os sugeridos vêm primeiro.
 */
export function BuscaOpcoes({ value, onChange, opcoes, sugeridos = [], placeholder, vazio, id, limite = 400 }: Props) {
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

  const termo = semAcento(busca)
  const bate = (o: OpcaoBusca) => !termo || semAcento(`${o.rotulo} ${o.detalhe ?? ''} ${o.grupo ?? ''}`).includes(termo)
  const sugestoes = sugeridos.map((v) => opcoes.find((o) => o.valor === v)).filter((o): o is OpcaoBusca => !!o && bate(o))
  const filtradas = aberto ? opcoes.filter(bate).slice(0, limite) : []
  const escolhida = opcoes.find((o) => o.valor === value)
  const primeira = sugestoes[0] ?? filtradas[0]

  const escolher = (v: string) => {
    onChange(v)
    setAberto(false)
    setBusca('')
  }

  // Linhas com o título do grupo antes da primeira opção de cada grupo.
  const linhas: ({ tipo: 'grupo'; texto: string } | { tipo: 'opcao'; o: OpcaoBusca })[] = []
  let grupoAtual: string | undefined
  for (const o of filtradas) {
    if (o.grupo && o.grupo !== grupoAtual) {
      linhas.push({ tipo: 'grupo', texto: o.grupo })
      grupoAtual = o.grupo
    }
    linhas.push({ tipo: 'opcao', o })
  }

  const item = (o: OpcaoBusca, chave: string, sugerido = false) => (
    <li
      key={chave}
      role="option"
      aria-selected={o.valor === value}
      className={`${s.opcao} ${o.valor === value ? s.atual : ''} ${o.grupo && !sugerido ? extra.recuo : ''}`}
      onMouseDown={(e) => {
        e.preventDefault()
        escolher(o.valor)
      }}
    >
      {sugerido && <Sparkles size={12} className={extra.estrela} />} {o.rotulo}
      {o.detalhe && <small className={extra.detalhe}>{o.detalhe}</small>}
    </li>
  )

  return (
    <div className={s.caixa} ref={caixa}>
      <div className={`${s.campo} ${aberto ? s.campoAberto : ''}`} onClick={() => { setAberto(true); entrada.current?.focus() }}>
        {aberto ? <Search size={14} className={s.lupa} /> : null}
        <input
          id={id}
          ref={entrada}
          value={aberto ? busca : escolhida ? escolhida.rotulo : value}
          placeholder={aberto ? 'Digite o código ou parte do texto' : placeholder ?? vazio ?? 'Escolha'}
          title={escolhida?.rotulo}
          onFocus={() => setAberto(true)}
          onChange={(e) => { setBusca(e.target.value); setAberto(true) }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') { setAberto(false); setBusca('') }
            if (e.key === 'Enter') { e.preventDefault(); if (primeira) escolher(primeira.valor) }
          }}
          readOnly={!aberto}
          autoComplete="off"
          role="combobox"
          aria-expanded={aberto}
        />
        {value && vazio && !aberto ? (
          <button type="button" className={s.limpar} title="Limpar" onClick={(e) => { e.stopPropagation(); onChange('') }}><X size={13} /></button>
        ) : (
          <ChevronDown size={15} className={s.seta} />
        )}
      </div>
      {aberto && (
        <ul className={`${s.lista} ${extra.lista}`} role="listbox">
          {vazio && !termo && (
            <li className={`${s.opcao} ${!value ? s.atual : ''}`} onMouseDown={(e) => { e.preventDefault(); escolher('') }}>{vazio}</li>
          )}
          {sugestoes.length > 0 && (
            <>
              <li className={s.grupo}>Sugeridos pela tabela oficial</li>
              {sugestoes.map((o) => item(o, `s-${o.valor}`, true))}
              <li className={extra.separador} aria-hidden />
            </>
          )}
          {linhas.map((l, i) => (l.tipo === 'grupo' ? <li key={`g-${l.texto}-${i}`} className={s.grupo}>{l.texto}</li> : item(l.o, l.o.valor)))}
          {filtradas.length === 0 && sugestoes.length === 0 && <li className={s.nada}>Nada com “{busca}”.</li>}
          {filtradas.length >= limite && <li className={s.nada}>Mostrando os {limite} primeiros: digite para filtrar.</li>}
        </ul>
      )}
    </div>
  )
}

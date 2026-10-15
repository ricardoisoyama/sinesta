import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown, Layers, Pencil, Plus, Power, RotateCcw } from 'lucide-react'
import { avisar, confirmar } from '@/features/common/dialogo/dialogo'
import type { TipoOperacao } from './types'
import s from './seletorTipo.module.css'

interface Props {
  tipos: TipoOperacao[]
  selecionadoId: string
  /** Quantos campos ativos cada tipo tem (aparece ao lado do nome). */
  qtdCampos: (tipoId: string) => number
  onSelecionar: (id: string) => void
  onAdicionar: (nome: string) => void
  onRenomear: (id: string, nome: string) => void
  onStatus: (id: string, status: 'ativo' | 'inativo') => void
}

/**
 * Tipo de operação (Transporte, Armazenagem...) da tela de Dados da Operação: um botão compacto
 * ao lado da empresa que abre a lista para escolher, criar, renomear e inativar; fecha ao sair.
 */
export function SeletorTipoOperacao({ tipos, selecionadoId, qtdCampos, onSelecionar, onAdicionar, onRenomear, onStatus }: Props) {
  const [aberto, setAberto] = useState(false)
  const [novo, setNovo] = useState('')
  const [editando, setEditando] = useState<{ id: string; nome: string } | null>(null)
  const raiz = useRef<HTMLDivElement>(null)
  const ativos = tipos.filter((t) => t.status === 'ativo')
  const inativos = tipos.filter((t) => t.status !== 'ativo')
  const atual = tipos.find((t) => t.id === selecionadoId)

  const fechar = () => {
    setAberto(false)
    setEditando(null)
    setNovo('')
  }

  // Fecha ao clicar fora ou com Esc (e descarta a renomeação em andamento).
  useEffect(() => {
    if (!aberto) return
    const sair = () => {
      setAberto(false)
      setEditando(null)
      setNovo('')
    }
    const fora = (e: MouseEvent) => {
      if (!raiz.current?.contains(e.target as Node)) sair()
    }
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && sair()
    document.addEventListener('mousedown', fora)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('mousedown', fora)
      document.removeEventListener('keydown', esc)
    }
  }, [aberto])
  const escolher = (id: string) => {
    onSelecionar(id)
    fechar()
  }
  const criar = () => {
    const nome = novo.trim()
    if (!nome) return
    onAdicionar(nome)
    fechar()
  }
  const salvarNome = () => {
    if (editando && editando.nome.trim()) onRenomear(editando.id, editando.nome.trim())
    setEditando(null)
  }
  const inativar = async (t: TipoOperacao) => {
    if (ativos.length === 1) {
      await avisar({ titulo: 'Tipo de operação', mensagem: 'A empresa precisa de pelo menos um tipo de operação ativo. Crie outro antes de inativar este.' })
      return
    }
    const ok = await confirmar({
      titulo: 'Inativar tipo de operação',
      mensagem: `Inativar "${t.nome}"? Ele e os campos dele saem do Pricing. Nada é apagado: dá para reativar depois, e as propostas já feitas não mudam.`,
      confirmar: 'Inativar',
      perigo: true,
    })
    if (ok) onStatus(t.id, 'inativo')
  }

  return (
    <div className={s.campo}>
      <span className={s.rotulo}>Tipo de operação</span>
      <div className={s.raiz} ref={raiz}>
      <button type="button" className={`${s.botao} ${aberto ? s.botaoAberto : ''}`} onClick={() => (aberto ? fechar() : setAberto(true))} aria-expanded={aberto}>
        <Layers size={14} />
        <b>{atual?.nome ?? 'Selecione'}</b>
        <ChevronDown size={14} className={s.seta} />
      </button>

      {aberto && (
        <div className={s.painel} role="dialog" aria-label="Tipos de operação">
          <ul className={s.lista}>
            {ativos.map((t) => (
              <li key={t.id} className={t.id === selecionadoId ? s.ativo : ''}>
                {editando?.id === t.id ? (
                  <input
                    className={s.renomear}
                    value={editando.nome}
                    autoFocus
                    onChange={(e) => setEditando({ id: t.id, nome: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') salvarNome()
                      if (e.key === 'Escape') {
                        e.stopPropagation()
                        setEditando(null)
                      }
                    }}
                    onBlur={salvarNome}
                    maxLength={80}
                  />
                ) : (
                  <button type="button" className={s.item} onClick={() => escolher(t.id)}>
                    {t.id === selecionadoId ? <Check size={14} /> : <span className={s.vazioIcone} />}
                    <span className={s.nome}>{t.nome}</span>
                    <span className={s.qtd}>{qtdCampos(t.id)}</span>
                  </button>
                )}
                <button type="button" className={s.acao} title="Renomear" onClick={() => setEditando({ id: t.id, nome: t.nome })}>
                  <Pencil size={13} />
                </button>
                <button type="button" className={s.acao} title="Inativar" onClick={() => void inativar(t)}>
                  <Power size={13} />
                </button>
              </li>
            ))}
          </ul>

          <div className={s.novo}>
            <Plus size={14} />
            <input
              value={novo}
              onChange={(e) => setNovo(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && criar()}
              placeholder="Novo tipo de operação (ex.: Armazenagem)"
              maxLength={80}
            />
            <button type="button" className={s.criar} onClick={criar} disabled={!novo.trim()}>
              Criar
            </button>
          </div>

          {inativos.length > 0 && (
            <div className={s.inativos}>
              <span>Inativos</span>
              {inativos.map((t) => (
                <div key={t.id} className={s.inativo}>
                  <span>{t.nome}</span>
                  <button type="button" onClick={() => onStatus(t.id, 'ativo')}>
                    <RotateCcw size={12} /> Reativar
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      </div>
    </div>
  )
}

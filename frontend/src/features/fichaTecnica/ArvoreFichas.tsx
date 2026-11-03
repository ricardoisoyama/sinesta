import { useState, type ReactNode } from 'react'
import { ChevronDown, ChevronRight, CopyPlus, FilePlus, Folder, FolderOpen, FolderPlus, Pencil, Plus, Power } from 'lucide-react'
import { confirmar } from '@/features/common/dialogo/dialogo'
import { caminhoPasta, novaPasta, type GradeFichas, type GrupoFicha, type PastaFicha } from './types'
import css from './fichaTecnica.module.css'

interface Props {
  grade: GradeFichas
  mostrarInativas: boolean
  grupoAtual: string
  focoGrupo: string
  carregando: boolean
  qtdItens: (grupoId: string) => number
  onEscolher: (grupoId: string) => void
  onSalvarGrupo: (g: GrupoFicha) => void
  onDuplicar: (grupoId: string) => void
  /** Cria uma ficha dentro da pasta ('' = na raiz). */
  onNovaFicha: (pastaId: string) => void
  onGravar: (g: Partial<GradeFichas>) => void
  /** Pasta virtual com o que ficou de antes das fichas. */
  semFicha?: { ativo: boolean; qtd: number; onEscolher: () => void }
}

/**
 * Pastas em níveis à esquerda da Ficha Técnica: uma pasta guarda subpastas e fichas (COBRECOM › Operação
 * Santos › Funcionários). Fichas soltas ficam na raiz. Mover não perde nada (só muda onde aparece);
 * inativar a pasta sobe o que estava nela para a pasta de cima.
 */
export function ArvoreFichas({ grade, mostrarInativas, grupoAtual, focoGrupo, carregando, qtdItens, onEscolher, onSalvarGrupo, onDuplicar, onNovaFicha, onGravar, semFicha }: Props) {
  const pastas = grade.pastas ?? []
  const [recolhidas, setRecolhidas] = useState<Set<string>>(new Set())
  const [renomeando, setRenomeando] = useState('')
  const ativas = pastas.filter((p) => p.status === 'ativo')
  const visiveis = pastas.filter((p) => mostrarInativas || p.status === 'ativo')
  const existe = (id: string | undefined) => !!id && ativas.some((p) => p.id === id)

  const salvarPasta = (p: PastaFicha) => onGravar({ pastas: pastas.map((x) => (x.id === p.id ? p : x)) })
  const criarPasta = (paiId: string) => {
    const p = novaPasta(paiId)
    onGravar({ pastas: [...pastas, p] })
    setRenomeando(p.id)
    if (paiId) setRecolhidas((r) => { const n = new Set(r); n.delete(paiId); return n })
  }
  /** Pastas que ficam dentro desta (não dá para mover uma pasta para dentro dela mesma). */
  const descendentes = (id: string): Set<string> => {
    const s = new Set<string>([id])
    let mudou = true
    while (mudou) {
      mudou = false
      for (const p of pastas) if (p.paiId && s.has(p.paiId) && !s.has(p.id)) { s.add(p.id); mudou = true }
    }
    return s
  }
  const inativarPasta = async (p: PastaFicha) => {
    if (p.status !== 'ativo') return salvarPasta({ ...p, status: 'ativo' })
    const ok = await confirmar({
      titulo: 'Inativar a pasta?',
      mensagem: `As fichas e subpastas de "${p.nome}" sobem para ${p.paiId ? `"${pastas.find((x) => x.id === p.paiId)?.nome}"` : 'a raiz'}. Nada é apagado.`,
      confirmar: 'Inativar',
    })
    if (!ok) return
    onGravar({
      pastas: pastas.map((x) => (x.id === p.id ? { ...x, status: 'inativo' } : x.paiId === p.id ? { ...x, paiId: p.paiId } : x)),
      grupos: grade.grupos.map((g) => (g.pastaId === p.id ? { ...g, pastaId: p.paiId } : g)),
    })
  }
  const alternar = (id: string) => setRecolhidas((r) => { const n = new Set(r); if (n.has(id)) n.delete(id); else n.add(id); return n })

  const opcoesMover = (excluir: Set<string>) => (
    <>
      <option value="">Na raiz</option>
      {ativas.filter((p) => !excluir.has(p.id)).map((p) => (
        <option key={p.id} value={p.id}>{caminhoPasta(pastas, p.id)}</option>
      ))}
    </>
  )

  const linhaFicha = (g: GrupoFicha, nivel: number) => {
    const on = g.id === grupoAtual
    const Icone = on ? FolderOpen : Folder
    return (
      <div key={g.id} className={`${css.pasta} ${css.ficha} ${on ? css.pastaOn : ''} ${g.status !== 'ativo' ? css.pastaOff : ''}`} style={{ paddingLeft: nivel * 14 }}>
        {on ? (
          <div className={css.fichaAberta}>
            <div className={css.fichaAbertaTopo}>
              <Icone size={16} />
              <input
                className={css.pastaNome}
                value={g.nome}
                autoFocus={focoGrupo === g.id}
                onFocus={(e) => focoGrupo === g.id && e.target.select()}
                onChange={(e) => onSalvarGrupo({ ...g, nome: e.target.value })}
                aria-label="Nome da ficha"
                title={g.nome}
              />
              <button type="button" className={css.pastaAcao} title="Duplicar ficha (colunas, itens e valores)" onClick={() => onDuplicar(g.id)}>
                <CopyPlus size={14} />
              </button>
              <button type="button" className={css.pastaAcao} title={g.status === 'ativo' ? 'Inativar a ficha (os itens saem do Pricing)' : 'Reativar a ficha'} onClick={() => onSalvarGrupo({ ...g, status: g.status === 'ativo' ? 'inativo' : 'ativo' })}>
                <Power size={14} />
              </button>
            </div>
            {ativas.length > 0 && (
              <select className={css.mover} value={existe(g.pastaId) ? g.pastaId : ''} onChange={(e) => onSalvarGrupo({ ...g, pastaId: e.target.value })} aria-label="Pasta da ficha" title="Mover a ficha para outra pasta">
                {opcoesMover(new Set())}
              </select>
            )}
          </div>
        ) : (
          <button type="button" className={css.pastaBtn} onClick={() => onEscolher(g.id)} title={g.nome}>
            <Icone size={16} />
            <span>{g.nome || 'Sem nome'}</span>
            <small>{qtdItens(g.id)}</small>
          </button>
        )}
      </div>
    )
  }

  const paiVisivel = (p: PastaFicha) => !!p.paiId && visiveis.some((x) => x.id === p.paiId)
  const nivelDe = (paiId: string, nivel: number): ReactNode[] => {
    const filhas = visiveis.filter((p) => (paiId ? p.paiId === paiId : !paiVisivel(p)))
    const fichas = grade.grupos
      .filter((g) => mostrarInativas || g.status === 'ativo')
      .filter((g) => (paiId ? g.pastaId === paiId : !existe(g.pastaId)))
    return [
      ...filhas.map((p) => {
        const aberta = !recolhidas.has(p.id)
        const qtd = grade.grupos.filter((g) => g.status === 'ativo' && descendentes(p.id).has(g.pastaId ?? '')).length
        return (
          <div key={p.id} className={css.ramo}>
            <div className={`${css.pastaMae} ${p.status !== 'ativo' ? css.pastaOff : ''}`} style={{ paddingLeft: nivel * 14 }}>
              <button type="button" className={css.chevron} onClick={() => alternar(p.id)} aria-label={aberta ? 'Recolher pasta' : 'Abrir pasta'} aria-expanded={aberta}>
                {aberta ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>
              {renomeando === p.id ? (
                <div className={css.fichaAberta}>
                  <input
                    className={css.pastaNome}
                    value={p.nome}
                    autoFocus
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => salvarPasta({ ...p, nome: e.target.value })}
                    onKeyDown={(e) => e.key === 'Enter' && setRenomeando('')}
                    onBlur={() => setRenomeando('')}
                    aria-label="Nome da pasta"
                  />
                  <select className={css.mover} value={existe(p.paiId) ? p.paiId : ''} onMouseDown={(e) => e.stopPropagation()} onChange={(e) => salvarPasta({ ...p, paiId: e.target.value })} aria-label="Pasta de cima" title="Mover a pasta">
                    {opcoesMover(descendentes(p.id))}
                  </select>
                </div>
              ) : (
                <button type="button" className={css.pastaMaeNome} onClick={() => alternar(p.id)} onDoubleClick={() => setRenomeando(p.id)} title={caminhoPasta(pastas, p.id)}>
                  {aberta ? <FolderOpen size={16} /> : <Folder size={16} />}
                  <span>{p.nome || 'Sem nome'}</span>
                  <small>{qtd}</small>
                </button>
              )}
              <span className={css.pastaMaeAcoes}>
                <button type="button" className={css.pastaAcao} title="Nova ficha nesta pasta" onClick={() => onNovaFicha(p.id)} disabled={carregando}><FilePlus size={14} /></button>
                <button type="button" className={css.pastaAcao} title="Nova subpasta" onClick={() => criarPasta(p.id)} disabled={carregando}><FolderPlus size={14} /></button>
                <button type="button" className={css.pastaAcao} title="Renomear ou mover a pasta" onClick={() => setRenomeando(renomeando === p.id ? '' : p.id)}><Pencil size={13} /></button>
                <button type="button" className={css.pastaAcao} title={p.status === 'ativo' ? 'Inativar a pasta (o que está nela sobe)' : 'Reativar a pasta'} onClick={() => void inativarPasta(p)}><Power size={14} /></button>
              </span>
            </div>
            {aberta && nivelDe(p.id, nivel + 1)}
          </div>
        )
      }),
      ...fichas.map((g) => linhaFicha(g, nivel)),
    ]
  }

  return (
    <nav className={css.pastas} aria-label="Fichas">
      <div className={css.pastasTitulo}>Fichas</div>
      {nivelDe('', 0)}
      {semFicha && (
        <div className={`${css.pasta} ${semFicha.ativo ? css.pastaOn : ''}`}>
          <button type="button" className={css.pastaBtn} onClick={semFicha.onEscolher}>
            <Folder size={16} />
            <span>Sem ficha</span>
            <small>{semFicha.qtd}</small>
          </button>
        </div>
      )}
      <div className={css.novos}>
        <button type="button" className={css.novaPasta} onClick={() => onNovaFicha('')} disabled={carregando}>
          <Plus size={15} /> Nova ficha
        </button>
        <button type="button" className={css.novaPasta} onClick={() => criarPasta('')} disabled={carregando}>
          <FolderPlus size={15} /> Nova pasta
        </button>
      </div>
      {grade.grupos.length === 0 && !semFicha && !carregando && (
        <p className={css.pastasDica}>Crie a primeira ficha, por exemplo <b>Funcionários</b> ou <b>Tecnologia</b>. Com <b>Nova pasta</b>, agrupe fichas por cliente ou operação (ex.: COBRECOM › Operação Santos).</p>
      )}
    </nav>
  )
}

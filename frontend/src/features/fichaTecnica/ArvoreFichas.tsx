import { useState, type DragEvent, type ReactNode } from 'react'
import { ArrowDown, ArrowUp, ChevronDown, ChevronRight, CopyPlus, FilePlus, Folder, FolderOpen, FolderPlus, Pencil, Plus, Power } from 'lucide-react'
import { confirmar } from '@/features/common/dialogo/dialogo'
import { caminhoPasta, novaPasta, type GradeFichas, type GrupoFicha, type PastaFicha } from './types'
import { moverEntreIrmaos, moverPara, zonaDoCursor, type Zona } from './ordem'
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
 * inativar a pasta sobe o que estava nela para a pasta de cima. A ordem muda pelas setas ou arrastando
 * (soltar no meio de uma pasta põe dentro dela; em "Fichas", na raiz); a ordem gravada vale para todos.
 */
export function ArvoreFichas({ grade, mostrarInativas, grupoAtual, focoGrupo, carregando, qtdItens, onEscolher, onSalvarGrupo, onDuplicar, onNovaFicha, onGravar, semFicha }: Props) {
  const pastas = grade.pastas ?? []
  const [recolhidas, setRecolhidas] = useState<Set<string>>(new Set())
  const [renomeando, setRenomeando] = useState('')
  const ativas = pastas.filter((p) => p.status === 'ativo')
  const visiveis = pastas.filter((p) => mostrarInativas || p.status === 'ativo')
  const existe = (id: string | undefined) => !!id && ativas.some((p) => p.id === id)
  const paiVisivel = (p: PastaFicha) => !!p.paiId && visiveis.some((x) => x.id === p.paiId)

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
  const abrir = (id: string) => setRecolhidas((r) => { const n = new Set(r); n.delete(id); return n })

  // ── ordem: setas (entre os irmãos do mesmo nível) e arrastar ──
  const pastaDaFicha = (g: GrupoFicha) => (existe(g.pastaId) ? g.pastaId! : '')
  const paiDaPasta = (p: PastaFicha) => (paiVisivel(p) ? p.paiId! : '')
  const fichasVisiveis = grade.grupos.filter((g) => mostrarInativas || g.status === 'ativo')
  const subirFicha = (g: GrupoFicha, delta: -1 | 1) =>
    onGravar({ grupos: moverEntreIrmaos(grade.grupos, fichasVisiveis.filter((x) => pastaDaFicha(x) === pastaDaFicha(g)), g.id, delta) })
  const subirPasta = (p: PastaFicha, delta: -1 | 1) =>
    onGravar({ pastas: moverEntreIrmaos(pastas, visiveis.filter((x) => paiDaPasta(x) === paiDaPasta(p)), p.id, delta) })
  const setas = (subir: (d: -1 | 1) => void, nome: string) => (
    <span className={css.ordemAcoes}>
      <button type="button" className={css.pastaAcao} title={`Subir "${nome}"`} onClick={() => subir(-1)}><ArrowUp size={13} /></button>
      <button type="button" className={css.pastaAcao} title={`Descer "${nome}"`} onClick={() => subir(1)}><ArrowDown size={13} /></button>
    </span>
  )

  const [arrastando, setArrastando] = useState<{ tipo: 'ficha' | 'pasta'; id: string } | null>(null)
  const [alvo, setAlvo] = useState<{ id: string; zona: Zona } | null>(null)
  const fimArraste = () => { setArrastando(null); setAlvo(null) }
  const comecar = (tipo: 'ficha' | 'pasta', id: string) => (e: DragEvent) => {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', id)
    setArrastando({ tipo, id })
  }
  /** Onde o item arrastado cairia sobre esta linha (null = não dá: pasta sobre ficha, ou pasta dentro dela mesma). */
  const zonaSobre = (tipo: 'ficha' | 'pasta', id: string, e: DragEvent): Zona | null => {
    if (!arrastando || arrastando.id === id) return null
    if (arrastando.tipo === 'pasta' && (tipo === 'ficha' || descendentes(arrastando.id).has(id))) return null
    if (arrastando.tipo === 'ficha' && tipo === 'pasta') return 'dentro'
    const r = e.currentTarget.getBoundingClientRect()
    return zonaDoCursor((e.clientY - r.top) / r.height, tipo === 'pasta')
  }
  const sobre = (tipo: 'ficha' | 'pasta', id: string) => (e: DragEvent) => {
    const zona = zonaSobre(tipo, id, e)
    if (!zona) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (alvo?.id !== id || alvo.zona !== zona) setAlvo({ id, zona })
  }
  const soltar = (tipo: 'ficha' | 'pasta', id: string) => (e: DragEvent) => {
    e.preventDefault()
    const zona = zonaSobre(tipo, id, e)
    const a = arrastando
    fimArraste()
    if (!zona || !a) return
    if (a.tipo === 'ficha') {
      if (tipo === 'pasta') {
        onGravar({ grupos: moverPara(grade.grupos, a.id, '', true, (g) => ({ ...g, pastaId: id })) })
        abrir(id)
      } else {
        const destino = grade.grupos.find((g) => g.id === id)
        if (destino) onGravar({ grupos: moverPara(grade.grupos, a.id, id, zona === 'depois', (g) => ({ ...g, pastaId: pastaDaFicha(destino) })) })
      }
      return
    }
    const destino = pastas.find((p) => p.id === id)
    if (!destino) return
    if (zona === 'dentro') {
      onGravar({ pastas: moverPara(pastas, a.id, '', true, (p) => ({ ...p, paiId: id })) })
      abrir(id)
    } else onGravar({ pastas: moverPara(pastas, a.id, id, zona === 'depois', (p) => ({ ...p, paiId: paiDaPasta(destino) })) })
  }
  /** Soltar no título "Fichas": vai para a raiz (no fim). */
  const soltarNaRaiz = (e: DragEvent) => {
    e.preventDefault()
    const a = arrastando
    fimArraste()
    if (!a) return
    if (a.tipo === 'ficha') onGravar({ grupos: moverPara(grade.grupos, a.id, '', true, (g) => ({ ...g, pastaId: '' })) })
    else onGravar({ pastas: moverPara(pastas, a.id, '', true, (p) => ({ ...p, paiId: '' })) })
  }
  const classeAlvo = (id: string) =>
    alvo?.id !== id ? '' : alvo.zona === 'antes' ? css.soltarAntes : alvo.zona === 'depois' ? css.soltarDepois : css.soltarDentro
  const arrastavel = (tipo: 'ficha' | 'pasta', id: string, pode: boolean) => ({
    draggable: pode,
    onDragStart: pode ? comecar(tipo, id) : undefined,
    onDragEnd: fimArraste,
    onDragOver: sobre(tipo, id),
    onDragLeave: () => alvo?.id === id && setAlvo(null),
    onDrop: soltar(tipo, id),
  })

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
      <div
        key={g.id}
        className={`${css.pasta} ${css.ficha} ${on ? css.pastaOn : ''} ${g.status !== 'ativo' ? css.pastaOff : ''} ${arrastando?.id === g.id ? css.arrastando : ''} ${classeAlvo(g.id)}`}
        style={{ paddingLeft: nivel * 14 }}
        {...arrastavel('ficha', g.id, !on)}
        title={on ? undefined : 'Arraste para mudar a ordem ou a pasta'}
      >
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
              {setas((d) => subirFicha(g, d), g.nome)}
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
          <>
            <button type="button" className={css.pastaBtn} onClick={() => onEscolher(g.id)} title={g.nome}>
              <Icone size={16} />
              <span>{g.nome || 'Sem nome'}</span>
              <small>{qtdItens(g.id)}</small>
            </button>
            {setas((d) => subirFicha(g, d), g.nome)}
          </>
        )}
      </div>
    )
  }

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
            <div
              className={`${css.pastaMae} ${p.status !== 'ativo' ? css.pastaOff : ''} ${arrastando?.id === p.id ? css.arrastando : ''} ${classeAlvo(p.id)}`}
              style={{ paddingLeft: nivel * 14 }}
              {...arrastavel('pasta', p.id, renomeando !== p.id)}
            >
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
                {setas((d) => subirPasta(p, d), p.nome)}
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
      <div
        className={`${css.pastasTitulo} ${arrastando && alvo?.id === '' ? css.soltarDentro : ''}`}
        onDragOver={(e) => { if (!arrastando) return; e.preventDefault(); if (alvo?.id !== '') setAlvo({ id: '', zona: 'dentro' }) }}
        onDragLeave={() => alvo?.id === '' && setAlvo(null)}
        onDrop={soltarNaRaiz}
        title={arrastando ? 'Solte aqui para tirar da pasta (vai para a raiz)' : undefined}
      >
        Fichas
      </div>
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

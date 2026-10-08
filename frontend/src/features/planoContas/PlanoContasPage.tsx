import { useMemo, useState } from 'react'
import {
  Plus,
  Search,
  ChevronRight,
  Folder,
  FolderOpen,
  Receipt,
  Pencil,
  Trash2,
  RotateCcw,
  UnfoldVertical,
  FoldVertical,
  FileSpreadsheet,
} from 'lucide-react'
import ui from '@/features/common/ui.module.css'
import { PageHeader } from '@/features/common/PageHeader'
import { formatBRL } from '@/lib/format'
import { getErrorMessage } from '@/lib/api'
import { usePlanoContas } from './store'
import { PlanoContaFormModal } from './PlanoContaFormModal'
import { ImportarPlanoContasModal } from './ImportarPlanoContasModal'
import type { PlanoConta } from './types'
import type { PlanoContaForm } from './plano-conta-schema'
import s from './planoContas.module.css'

export function PlanoContasPage() {
  const { contas, add, update, filhosDe, temFilhos } = usePlanoContas()

  const [query, setQuery] = useState('')
  // Inativas ficam escondidas por padrão para não poluir a tela (pedido do cliente).
  const [mostrarInativas, setMostrarInativas] = useState(false)
  const somenteAtivas = !mostrarInativas
  const [criandoBase, setCriandoBase] = useState(false)
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(contas.filter((c) => c.paiId === null).map((c) => c.id)),
  )
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<PlanoConta | null>(null)
  const [paiInicial, setPaiInicial] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [importarAberto, setImportarAberto] = useState(false)

  const q = query.trim().toLowerCase()
  const filtroAtivo = q !== '' || somenteAtivas

  // Conjunto visível quando há filtro: contas que casam + seus ancestrais (mantém o caminho).
  const visiveis = useMemo(() => {
    if (!filtroAtivo) return null
    const byId = new Map(contas.map((c) => [c.id, c]))
    const passa = (c: PlanoConta) =>
      (!somenteAtivas || c.status === 'ativo') &&
      (q === '' || c.codigo.toLowerCase().includes(q) || c.nome.toLowerCase().includes(q))
    const set = new Set<string>()
    for (const c of contas) {
      if (!passa(c)) continue
      let cur: PlanoConta | undefined = c
      while (cur) {
        set.add(cur.id)
        cur = cur.paiId ? byId.get(cur.paiId) : undefined
      }
    }
    return set
  }, [contas, q, somenteAtivas, filtroAtivo])

  const sinteticasIds = () => contas.filter((c) => temFilhos(c.id)).map((c) => c.id)
  const expandirTudo = () => setExpanded(new Set(sinteticasIds()))
  const recolherTudo = () => setExpanded(new Set())
  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const openNovaRaiz = () => { setEditing(null); setPaiInicial(null); setModalOpen(true) }
  const openSubconta = (pai: PlanoConta) => { setEditing(null); setPaiInicial(pai.id); setModalOpen(true) }
  const openEdit = (c: PlanoConta) => { setEditing(c); setPaiInicial(null); setModalOpen(true) }
  const close = () => { setEditing(null); setModalOpen(false) }

  const save = async (data: PlanoContaForm) => {
    setSaveError(null)
    const paiId = data.paiId || null
    const patch = {
      ...data,
      paiId,
      contaContabil: data.contaContabil || undefined,
      limiteGasto: data.limiteGasto || undefined,
      tipo: data.tipo || undefined,
    }
    try {
      if (editing) await update(editing.id, patch)
      else {
        await add({ id: crypto.randomUUID(), ...patch })
        if (paiId) setExpanded((prev) => new Set(prev).add(paiId)) // abre o pai p/ ver a nova
      }
    } catch (err) {
      setSaveError(getErrorMessage(err))
      return
    }
    close()
  }

  const setStatus = async (id: string, st: 'ativo' | 'inativo') => {
    try {
      await update(id, { status: st })
    } catch (err) {
      window.alert(getErrorMessage(err))
    }
  }

  /** Base vazia: cria os dois grupos principais (1 Receitas, 2 Despesas) de uma vez. */
  const criarEstruturaPadrao = async () => {
    setCriandoBase(true)
    try {
      await add({ id: crypto.randomUUID(), codigo: '1', nome: 'RECEITAS', paiId: null, grupoDre: 'Receita', contaContabil: '1', status: 'ativo' })
      await add({ id: crypto.randomUUID(), codigo: '2', nome: 'DESPESAS', paiId: null, grupoDre: 'Despesa', contaContabil: '2', status: 'ativo' })
    } catch (err) {
      window.alert(getErrorMessage(err))
    } finally {
      setCriandoBase(false)
    }
  }

  const raizes = filhosDe(null)
  const totalAnaliticas = contas.filter((c) => !temFilhos(c.id)).length

  return (
    <div>
      <PageHeader
        breadcrumb="Cadastros"
        title="Plano de Contas"
        subtitle="Estrutura de contas (categorias) em árvore para classificar receitas e despesas."
        action={
          <>
            <button className={`${ui.btn} ${ui.btnGhost}`} onClick={() => setImportarAberto(true)}>
              <FileSpreadsheet /> Importar planilha
            </button>
            <button className={`${ui.btn} ${ui.btnPrimary}`} onClick={openNovaRaiz}>
              <Plus /> Nova conta
            </button>
          </>
        }
      />

      <div className={ui.card}>
        <div className={ui.toolbar}>
          <div className={ui.search}>
            <Search />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por código ou nome..."
            />
          </div>

          <label className={s.treeToolBtn} style={{ cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={mostrarInativas}
              onChange={(e) => setMostrarInativas(e.target.checked)}
            />
            Mostrar inativas
          </label>

          <div className={s.treeTools}>
            <button className={s.treeToolBtn} onClick={expandirTudo}>
              <UnfoldVertical /> Expandir tudo
            </button>
            <button className={s.treeToolBtn} onClick={recolherTudo}>
              <FoldVertical /> Recolher tudo
            </button>
          </div>

          <div style={{ flex: 1 }} />
          <span className={ui.count}>{totalAnaliticas} contas analíticas</span>
        </div>

        <div className={s.tree}>
          {raizes.length === 0 && (
            <div className={s.empty}>
              <div>Nenhuma conta cadastrada.</div>
              <div style={{ fontSize: 13, marginTop: 6 }}>
                Comece pelos grupos principais: <b>1 Receitas</b> e <b>2 Despesas</b>. Depois use o “+” de cada
                grupo para criar as subcontas (2.01, 2.01.01...).
              </div>
              <button
                className={`${ui.btn} ${ui.btnPrimary}`}
                style={{ marginTop: 14 }}
                onClick={criarEstruturaPadrao}
                disabled={criandoBase}
              >
                <Plus /> {criandoBase ? 'Criando...' : 'Criar Receitas e Despesas'}
              </button>
            </div>
          )}
          {visiveis && visiveis.size === 0 && <div className={s.empty}>Nenhuma conta encontrada.</div>}
          {raizes.map((c) => (
            <TreeNode
              key={c.id}
              conta={c}
              filhosDe={filhosDe}
              temFilhos={temFilhos}
              expanded={expanded}
              forcarAberto={filtroAtivo}
              visiveis={visiveis}
              onToggle={toggle}
              onSub={openSubconta}
              onEdit={openEdit}
              onStatus={(id, st) => setStatus(id, st)}
            />
          ))}
        </div>
      </div>

      <PlanoContaFormModal
        open={modalOpen}
        initial={editing}
        paiInicial={paiInicial}
        error={saveError}
        onClose={() => {
          setSaveError(null)
          close()
        }}
        onSave={save}
      />

      <ImportarPlanoContasModal open={importarAberto} onClose={() => setImportarAberto(false)} />
    </div>
  )
}

interface NodeProps {
  conta: PlanoConta
  filhosDe: (paiId: string | null) => PlanoConta[]
  temFilhos: (id: string) => boolean
  expanded: Set<string>
  forcarAberto: boolean
  visiveis: Set<string> | null
  onToggle: (id: string) => void
  onSub: (pai: PlanoConta) => void
  onEdit: (c: PlanoConta) => void
  onStatus: (id: string, st: 'ativo' | 'inativo') => void
}

function TreeNode(props: NodeProps) {
  const { conta, filhosDe, temFilhos, expanded, forcarAberto, visiveis } = props
  if (visiveis && !visiveis.has(conta.id)) return null

  const isRaiz = conta.paiId === null
  const sintetica = temFilhos(conta.id)
  const aberto = forcarAberto || expanded.has(conta.id)
  const filhos = sintetica ? filhosDe(conta.id) : []
  const nFilhos = filhos.length

  return (
    <div className={s.branch}>
      <div className={`${s.row} ${conta.status === 'inativo' ? s.rowInativa : ''}`}>
        {sintetica ? (
          <button
            className={`${s.caret} ${aberto ? s.caretOpen : ''}`}
            onClick={() => props.onToggle(conta.id)}
            aria-label={aberto ? 'Recolher' : 'Expandir'}
          >
            <ChevronRight size={16} />
          </button>
        ) : (
          <span className={s.caretSpacer} />
        )}

        <span
          className={`${s.icon} ${
            sintetica ? (conta.grupoDre === 'Receita' ? s.iconReceita : s.iconDespesa) : s.iconLeaf
          }`}
        >
          {sintetica ? aberto ? <FolderOpen /> : <Folder /> : <Receipt />}
        </span>

        <span className={s.codigo}>{conta.codigo}</span>
        <span className={`${s.nome} ${isRaiz ? s.nomeRaiz : sintetica ? s.nomeSintetica : ''}`}>
          {conta.nome}
        </span>
        {sintetica && <span className={s.count}>({nFilhos})</span>}

        <span className={s.spacer} />

        {conta.contaContabil && <span className={s.contabil}>{conta.contaContabil}</span>}
        {conta.contaDre && <span className={s.dre} title="Conta do DRE">{conta.contaDre}</span>}
        {!!conta.limiteGasto && <span className={s.limite}>limite {formatBRL(conta.limiteGasto)}</span>}
        {conta.tipo && <span className={s.tipoTag}>{conta.tipo === 'fixa' ? 'Fixa' : 'Variável'}</span>}
        {!isRaiz && (
          <span className={`${s.dre} ${conta.grupoDre === 'Receita' ? s.dreReceita : s.dreDespesa}`}>
            {conta.grupoDre}
          </span>
        )}
        {conta.status === 'inativo' && <span className={s.tagOff}>inativa</span>}

        <span className={s.actions}>
          <button className={ui.iconBtn} onClick={() => props.onSub(conta)} title="Adicionar subconta">
            <Plus />
          </button>
          <button className={ui.iconBtn} onClick={() => props.onEdit(conta)} title="Editar">
            <Pencil />
          </button>
          {conta.status === 'inativo' ? (
            <button className={ui.iconBtn} onClick={() => props.onStatus(conta.id, 'ativo')} title="Reativar">
              <RotateCcw />
            </button>
          ) : (
            <button
              className={`${ui.iconBtn} ${ui.danger}`}
              onClick={() => { if (window.confirm('Inativar esta conta?')) props.onStatus(conta.id, 'inativo') }}
              title="Inativar"
            >
              <Trash2 />
            </button>
          )}
        </span>
      </div>

      {sintetica && aberto && (
        <div className={s.children}>
          {filhos.map((f) => (
            <TreeNode key={f.id} {...props} conta={f} />
          ))}
        </div>
      )}
    </div>
  )
}

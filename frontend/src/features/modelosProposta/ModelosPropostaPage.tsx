import { useMemo, useState } from 'react'
import { Plus, FileText } from 'lucide-react'
import ui from '@/features/common/ui.module.css'
import { PageHeader } from '@/features/common/PageHeader'
import { CrudList } from '@/features/common/CrudList'
import { RowActions } from '@/features/common/RowActions'
import { StatusBadge } from '@/features/common/StatusBadge'
import type { Column } from '@/features/common/DataTable'
import { nomeUnidade } from '@/features/unidades/mock'
import { useEmpresasQuery } from '@/features/cadastros/hooks'
import { getErrorMessage } from '@/lib/api'
import { useModelosProposta } from './store'
import { ModeloPropostaFormModal } from './ModeloPropostaFormModal'
import type { ModeloProposta } from './types'

export function ModelosPropostaPage() {
  useEmpresasQuery()
  const { modelos, add, update, setStatus } = useModelosProposta()
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState<ModeloProposta | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return modelos.filter(
      (m) => m.nome.toLowerCase().includes(q) || nomeUnidade(m.empresaId).toLowerCase().includes(q),
    )
  }, [modelos, query])

  const openNew = () => { setEditing(null); setModalOpen(true) }
  const openEdit = (m: ModeloProposta) => { setEditing(m); setModalOpen(true) }
  const close = () => { setEditing(null); setModalOpen(false) }

  const save = async (data: ModeloProposta) => {
    setSaveError(null)
    try {
      if (editing) await update(data)
      else await add({ ...data, id: crypto.randomUUID() })
    } catch (err) {
      setSaveError(getErrorMessage(err))
      return
    }
    close()
  }

  // Exclusão lógica: modelo inativo some da escolha; propostas antigas seguem imprimindo com ele.
  const mudarStatus = async (m: ModeloProposta, status: 'ativo' | 'inativo') => {
    try {
      await setStatus(m, status)
    } catch (err) {
      window.alert(getErrorMessage(err))
    }
  }

  const columns: Column<ModeloProposta>[] = [
    {
      header: 'Modelo',
      fixa: true,
      valor: (m) => m.nome,
      cell: (m) => (
        <div className={ui.rowName}>
          <span className={ui.avatarSm}>
            <FileText size={15} />
          </span>
          <span className={ui.cellStrong}>{m.nome}</span>
        </div>
      ),
    },
    { header: 'Empresa', valor: (m) => nomeUnidade(m.empresaId), cell: (m) => <span className={ui.cellMut}>{nomeUnidade(m.empresaId)}</span> },
    { header: 'Páginas', valor: (m) => m.paginas.length, cell: (m) => <span className={ui.cellMut}>{m.paginas.length}</span> },
    { header: 'Status', valor: (m) => m.status, cell: (m) => <StatusBadge status={m.status} /> },
    {
      header: 'Ações',
      fixa: true,
      className: ui.colActions,
      cell: (m) => <RowActions status={m.status} onEdit={() => openEdit(m)} onSetStatus={(st) => mudarStatus(m, st)} />,
    },
  ]

  return (
    <div>
      <PageHeader
        breadcrumb="Cadastros"
        title="Modelos de Proposta"
        subtitle="Modelos (templates) do PDF de proposta, por empresa. Escolha o modelo ao gerar a proposta."
        action={
          <button className={`${ui.btn} ${ui.btnPrimary}`} onClick={openNew}>
            <Plus /> Novo modelo
          </button>
        }
      />

      <CrudList
        id="modelos-proposta"
        query={query}
        onQuery={setQuery}
        searchPlaceholder="Buscar por nome ou empresa..."
        columns={columns}
        rows={filtered}
        getKey={(m) => m.id}
        onStatusLote={async (itens, st) => {
          for (const it of itens) await mudarStatus(it, st)
        }}
      />

      <ModeloPropostaFormModal
        open={modalOpen}
        initial={editing}
        error={saveError}
        onClose={() => {
          setSaveError(null)
          close()
        }}
        onSave={save}
      />
    </div>
  )
}

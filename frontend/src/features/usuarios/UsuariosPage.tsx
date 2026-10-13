import { useMemo, useState } from 'react'
import { Plus, UserRound } from 'lucide-react'
import ui from '@/features/common/ui.module.css'
import { PageHeader } from '@/features/common/PageHeader'
import { CrudList } from '@/features/common/CrudList'
import { StatusBadge } from '@/features/common/StatusBadge'
import { RowActions } from '@/features/common/RowActions'
import type { Column } from '@/features/common/DataTable'
import { getErrorMessage } from '@/lib/api'
import { avisar } from '@/features/common/dialogo/dialogo'
import { useUsuarios } from './store'
import { UsuarioFormModal } from './UsuarioFormModal'
import { TODAS_FUNCIONALIDADES } from './funcionalidades'
import type { Usuario } from './types'
import type { UsuarioForm } from './usuario-schema'

function iniciais(nome: string) {
  const p = nome.trim().split(/\s+/)
  return ((p[0]?.[0] ?? '') + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase()
}

export function UsuariosPage() {
  const { usuarios, add, update } = useUsuarios()
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState<Usuario | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return usuarios.filter(
      (u) =>
        u.nome.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.cargo ?? '').toLowerCase().includes(q),
    )
  }, [usuarios, query])

  const openNew = () => { setEditing(null); setModalOpen(true) }
  const openEdit = (u: Usuario) => { setEditing(u); setModalOpen(true) }
  const close = () => { setEditing(null); setModalOpen(false) }

  const save = async (data: UsuarioForm) => {
    setSaveError(null)
    try {
      if (editing) await update(editing.id, data)
      else await add({ ...data, id: crypto.randomUUID() })
    } catch (err) {
      setSaveError(getErrorMessage(err))
      return
    }
    close()
  }

  const setStatus = async (u: Usuario, status: 'ativo' | 'inativo') => {
    try {
      await update(u.id, { status })
    } catch (err) {
      void avisar({ titulo: 'Não foi possível concluir', mensagem: getErrorMessage(err) })
    }
  }

  const totalFuncs = TODAS_FUNCIONALIDADES.length

  const columns: Column<Usuario>[] = [
    {
      header: 'Funcionário',
      fixa: true,
      valor: (u) => `${u.nome} ${u.email}`,
      cell: (u) => (
        <div className={ui.rowName}>
          <span className={ui.avatarSm}>{iniciais(u.nome) || <UserRound size={15} />}</span>
          <div>
            <div className={ui.cellStrong}>{u.nome}</div>
            <div className={ui.cellMut}>{u.email}</div>
          </div>
        </div>
      ),
    },
    {
      header: 'Cargo',
      valor: (u) => `${u.cargo ?? ''} ${u.departamento ?? ''}`,
      cell: (u) => (
        <div>
          <div className={ui.cellMut}>{u.cargo || '—'}</div>
          {u.departamento && <div className={ui.cellMut}>{u.departamento}</div>}
        </div>
      ),
    },
    {
      header: 'Perfil',
      valor: (u) => u.perfil,
      cell: (u) => (
        <span className={`${ui.badge} ${u.perfil === 'Gestor' ? ui.badgeOk : ui.badgeOff}`}>
          {u.perfil}
        </span>
      ),
    },
    {
      header: 'Acessos',
      className: ui.right,
      cell: (u) => (
        <span className={ui.cellMut}>
          {u.perfil === 'Gestor' ? 'Todas' : `${u.permissoes.length} de ${totalFuncs}`}
        </span>
      ),
    },
    { header: 'Status', valor: (u) => u.status, cell: (u) => <StatusBadge status={u.status} /> },
    {
      header: 'Ações',
      fixa: true,
      className: ui.colActions,
      cell: (u) => (
        <RowActions
          status={u.status}
          onEdit={() => openEdit(u)}
          onSetStatus={(st) => setStatus(u, st)}
        />
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        breadcrumb="Cadastros"
        title="Funcionários"
        subtitle="A equipe da empresa e o acesso de cada um ao portal (perfil e permissões por funcionalidade)."
        action={
          <button className={`${ui.btn} ${ui.btnPrimary}`} onClick={openNew}>
            <Plus /> Novo funcionário
          </button>
        }
      />

      <CrudList
        id="funcionarios"
        query={query}
        onQuery={setQuery}
        searchPlaceholder="Buscar por nome, e-mail ou cargo..."
        columns={columns}
        rows={filtered}
        getKey={(u) => u.id}
        onStatusLote={async (itens, st) => {
          for (const it of itens) await setStatus(it, st)
        }}
      />

      <UsuarioFormModal
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

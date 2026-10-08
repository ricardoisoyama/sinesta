import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Tags } from 'lucide-react'
import ui from '@/features/common/ui.module.css'
import { PageHeader } from '@/features/common/PageHeader'
import { CrudList } from '@/features/common/CrudList'
import { StatusBadge } from '@/features/common/StatusBadge'
import { RowActions } from '@/features/common/RowActions'
import { useCrud } from '@/features/common/useCrud'
import type { Column } from '@/features/common/DataTable'
import { usePlanoContas } from '@/features/planoContas/store'
import {
  listCategoriasCusto,
  createCategoriaCusto,
  updateCategoriaCusto,
} from '@/features/cadastros/api'
import { getErrorMessage } from '@/lib/api'
import { CategoriaFormModal, type CategoriaForm } from './CategoriaFormModal'
import type { CategoriaCusto } from './types'

export function CategoriasPage() {
  const qc = useQueryClient()
  const { nome: nomeConta } = usePlanoContas()
  const { data } = useQuery({ queryKey: ['categorias-custo'], queryFn: listCategoriasCusto })
  const crud = useCrud<CategoriaCusto>([], (c, q) => c.nome.toLowerCase().includes(q))

  useEffect(() => {
    if (data) crud.reset(data)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data])

  const invalidate = () => qc.invalidateQueries({ queryKey: ['categorias-custo'] })
  const [saveError, setSaveError] = useState<string | null>(null)

  const save = async (form: CategoriaForm) => {
    setSaveError(null)
    try {
      if (crud.editing) {
        const upd = await updateCategoriaCusto({ ...form, id: crud.editing.id })
        crud.update(upd.id, upd)
      } else {
        const created = await createCategoriaCusto({ ...form, id: '' })
        crud.add(created)
      }
    } catch (err) {
      setSaveError(getErrorMessage(err))
      return
    }
    invalidate()
    crud.close()
  }

  const setStatus = async (c: CategoriaCusto, status: 'ativo' | 'inativo') => {
    try {
      const upd = await updateCategoriaCusto({ ...c, status })
      crud.update(upd.id, upd)
    } catch (err) {
      window.alert(getErrorMessage(err))
      return
    }
    invalidate()
  }

  const columns: Column<CategoriaCusto>[] = [
    {
      header: 'Centro de custo',
      fixa: true,
      valor: (c) => c.nome,
      cell: (c) => (
        <div className={ui.rowName}>
          <span className={ui.avatarSm}>
            <Tags size={15} />
          </span>
          <span className={ui.cellStrong}>{c.nome}</span>
        </div>
      ),
    },
    {
      header: 'Conta padrão',
      valor: (c) => (c.planoContaId ? nomeConta(c.planoContaId) : ''),
      cell: (c) => <span className={ui.cellMut}>{c.planoContaId ? nomeConta(c.planoContaId) : '—'}</span>,
    },
    { header: 'Status', valor: (c) => c.status, cell: (c) => <StatusBadge status={c.status} /> },
    {
      header: 'Ações',
      fixa: true,
      className: ui.colActions,
      cell: (c) => (
        <RowActions status={c.status} onEdit={() => crud.openEdit(c)} onSetStatus={(st) => setStatus(c, st)} />
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        breadcrumb="Cadastros"
        title="Centro de Custo"
        subtitle="Setores que agrupam as despesas e sugerem a conta do plano de contas."
        action={
          <button className={`${ui.btn} ${ui.btnPrimary}`} onClick={crud.openNew}>
            <Plus /> Novo centro de custo
          </button>
        }
      />

      <CrudList
        id="centros-custo"
        query={crud.query}
        onQuery={crud.setQuery}
        searchPlaceholder="Buscar por nome..."
        columns={columns}
        rows={crud.filtered}
        getKey={(c) => c.id}
        onStatusLote={async (itens, st) => {
          for (const it of itens) await setStatus(it, st)
        }}
      />

      <CategoriaFormModal
        open={crud.modalOpen}
        initial={crud.editing}
        error={saveError}
        onClose={() => {
          setSaveError(null)
          crud.close()
        }}
        onSave={save}
      />
    </div>
  )
}

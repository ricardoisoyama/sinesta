import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Plus, Building2 } from 'lucide-react'
import ui from '@/features/common/ui.module.css'
import { PageHeader } from '@/features/common/PageHeader'
import { CrudList } from '@/features/common/CrudList'
import { StatusBadge } from '@/features/common/StatusBadge'
import { RowActions } from '@/features/common/RowActions'
import { useCrud } from '@/features/common/useCrud'
import type { Column } from '@/features/common/DataTable'
import { useEmpresasQuery } from '@/features/cadastros/hooks'
import { createEmpresa, updateEmpresa } from '@/features/cadastros/api'
import { getErrorMessage } from '@/lib/api'
import { formatCnpj } from '@/lib/format'
import { mockUnidades } from './mock'
import { UnidadeFormModal } from './UnidadeFormModal'
import type { Unidade } from './types'
import type { UnidadeForm } from './unidade-schema'

export function UnidadesPage() {
  const qc = useQueryClient()
  const { data } = useEmpresasQuery()
  const crud = useCrud<Unidade>(
    mockUnidades,
    (u, q) => {
      const qDigits = q.replace(/\D/g, '')
      return (
        u.nome.toLowerCase().includes(q) ||
        u.razaoSocial.toLowerCase().includes(q) ||
        u.nomeFantasia.toLowerCase().includes(q) ||
        (qDigits.length > 0 && u.cnpj.replace(/\D/g, '').includes(qDigits))
      )
    },
  )

  useEffect(() => {
    if (data) crud.reset(data)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data])

  const invalidate = () => qc.invalidateQueries({ queryKey: ['empresas'] })
  const [saveError, setSaveError] = useState<string | null>(null)

  const save = async (form: UnidadeForm) => {
    setSaveError(null)
    try {
      if (crud.editing) {
        const upd = await updateEmpresa({ ...form, id: crud.editing.id })
        crud.update(upd.id, upd)
      } else {
        const created = await createEmpresa({ ...form, id: '' })
        crud.add(created)
      }
    } catch (err) {
      setSaveError(getErrorMessage(err))
      return
    }
    invalidate()
    crud.close()
  }

  const setStatus = async (u: Unidade, status: 'ativo' | 'inativo') => {
    try {
      const upd = await updateEmpresa({ ...u, status })
      crud.update(upd.id, upd)
    } catch (err) {
      window.alert(getErrorMessage(err))
      return
    }
    invalidate()
  }

  const columns: Column<Unidade>[] = [
    {
      header: 'Empresa',
      fixa: true,
      valor: (u) => `${u.nome} ${u.nomeFantasia}`,
      cell: (u) => (
        <div className={ui.rowName}>
          <span className={ui.avatarSm}>
            <Building2 size={15} />
          </span>
          <span className={ui.cellStrong}>{u.nomeFantasia}</span>
          {u.padrao && <span className={`${ui.badge} ${ui.badgeWarn}`} title="As telas abrem com esta empresa">Padrão</span>}
        </div>
      ),
    },
    { header: 'Razão social', valor: (u) => u.razaoSocial, cell: (u) => <span className={ui.cellMut}>{u.razaoSocial}</span> },
    { header: 'CNPJ', valor: (u) => `${u.cnpj} ${formatCnpj(u.cnpj)}`, cell: (u) => <span className={ui.cellMut}>{formatCnpj(u.cnpj)}</span> },
    { header: 'Tipo', valor: (u) => u.tipo, cell: (u) => <span className={ui.cellMut}>{u.tipo}</span> },
    { header: 'Regime', valor: (u) => u.regime, cell: (u) => <span className={ui.cellMut}>{u.regime}</span> },
    { header: 'Endereço', valor: (u) => u.endereco, cell: (u) => <span className={ui.cellMut}>{u.endereco}</span> },
    { header: 'Status', valor: (u) => u.status, cell: (u) => <StatusBadge status={u.status} /> },
    {
      header: 'Ações',
      fixa: true,
      className: ui.colActions,
      cell: (u) => (
        <RowActions
          status={u.status}
          onEdit={() => crud.openEdit(u)}
          onSetStatus={(st) => setStatus(u, st)}
        />
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        breadcrumb="Cadastros"
        title="Empresas"
        subtitle="Empresas e estabelecimentos que emitem as propostas (Matriz e filiais)."
        action={
          <button className={`${ui.btn} ${ui.btnPrimary}`} onClick={crud.openNew}>
            <Plus /> Nova empresa
          </button>
        }
      />

      <CrudList
        id="empresas"
        query={crud.query}
        onQuery={crud.setQuery}
        searchPlaceholder="Buscar por nome, razão social ou CNPJ..."
        columns={columns}
        rows={crud.filtered}
        getKey={(u) => u.id}
        onStatusLote={async (itens, st) => {
          for (const it of itens) await setStatus(it, st)
        }}
      />

      <UnidadeFormModal
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

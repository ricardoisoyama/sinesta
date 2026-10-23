import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Plus, Percent } from 'lucide-react'
import ui from '@/features/common/ui.module.css'
import { PageHeader } from '@/features/common/PageHeader'
import { CrudList } from '@/features/common/CrudList'
import { StatusBadge } from '@/features/common/StatusBadge'
import { RowActions } from '@/features/common/RowActions'
import { useCrud } from '@/features/common/useCrud'
import type { Column } from '@/features/common/DataTable'
import { LARGURA } from '@/features/common/grid'
import { formatBRL, formatPct } from '@/lib/format'
import { useTaxasQuery } from '@/features/cadastros/hooks'
import { createTaxa, updateTaxa } from '@/features/cadastros/api'
import { getErrorMessage } from '@/lib/api'
import { avisar } from '@/features/common/dialogo/dialogo'
import { mockTaxas } from './mock'
import { TaxaFormModal } from './TaxaFormModal'
import type { Taxa } from './types'
import type { TaxaForm } from './taxa-schema'

export function TaxasPage() {
  const qc = useQueryClient()
  const { data } = useTaxasQuery()
  const crud = useCrud<Taxa>(mockTaxas, (t, q) => t.nome.toLowerCase().includes(q))

  useEffect(() => {
    if (data) crud.reset(data)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data])

  const invalidate = () => qc.invalidateQueries({ queryKey: ['taxas'] })
  const [saveError, setSaveError] = useState<string | null>(null)

  const save = async (form: TaxaForm) => {
    setSaveError(null)
    try {
      if (crud.editing) {
        const upd = await updateTaxa({ ...form, id: crud.editing.id })
        crud.update(upd.id, upd)
      } else {
        const created = await createTaxa({ ...form, id: '' })
        crud.add(created)
      }
    } catch (err) {
      setSaveError(getErrorMessage(err))
      return
    }
    invalidate()
    crud.close()
  }

  const setStatus = async (t: Taxa, status: 'ativo' | 'inativo') => {
    try {
      const upd = await updateTaxa({ ...t, status })
      crud.update(upd.id, upd)
    } catch (err) {
      void avisar({ titulo: 'Não foi possível concluir', mensagem: getErrorMessage(err) })
      return
    }
    invalidate()
  }

  const columns: Column<Taxa>[] = [
    {
      header: 'Taxa / Seguro',
      fixa: true,
      valor: (t) => t.nome,
      cell: (t) => (
        <div className={ui.rowName}>
          <span className={ui.avatarSm}>
            <Percent size={15} />
          </span>
          <span className={ui.cellStrong}>{t.nome}</span>
        </div>
      ),
    },
    {
      header: 'Tipo',
      largura: LARGURA.media,
      valor: (t) => (t.tipo === 'percentual' ? 'Percentual (NF)' : 'Valor fixo'),
      cell: (t) => (
        <span className={ui.cellMut}>{t.tipo === 'percentual' ? 'Percentual (NF)' : 'Valor fixo'}</span>
      ),
    },
    {
      header: 'Valor',
      largura: LARGURA.media,
      className: ui.right,
      valor: (t) => (t.tipo === 'percentual' ? formatPct(t.valor) : formatBRL(t.valor)),
      cell: (t) => (
        <span className={ui.cellStrong}>
          {t.tipo === 'percentual' ? `${formatPct(t.valor)} sobre NF` : formatBRL(t.valor)}
        </span>
      ),
    },
    { header: 'Status', largura: LARGURA.status, valor: (t) => t.status, cell: (t) => <StatusBadge status={t.status} /> },
    {
      header: 'Ações',
      fixa: true,
      largura: LARGURA.acoes,
      className: ui.colActions,
      cell: (t) => (
        <RowActions status={t.status} onEdit={() => crud.openEdit(t)} onSetStatus={(st) => setStatus(t, st)} />
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        breadcrumb="Cadastros"
        title="Taxas e Seguros"
        subtitle="Seguros e taxas que entram no preço: percentual sobre a NF ou valor fixo."
        action={
          <button className={`${ui.btn} ${ui.btnPrimary}`} onClick={crud.openNew}>
            <Plus /> Nova taxa
          </button>
        }
      />

      <CrudList
        id="taxas"
        query={crud.query}
        onQuery={crud.setQuery}
        searchPlaceholder="Buscar por nome..."
        columns={columns}
        rows={crud.filtered}
        getKey={(t) => t.id}
        onStatusLote={async (itens, st) => {
          for (const it of itens) await setStatus(it, st)
        }}
      />

      <TaxaFormModal
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

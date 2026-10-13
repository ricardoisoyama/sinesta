import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Coins } from 'lucide-react'
import ui from '@/features/common/ui.module.css'
import { PageHeader } from '@/features/common/PageHeader'
import { CrudList } from '@/features/common/CrudList'
import { StatusBadge } from '@/features/common/StatusBadge'
import { RowActions } from '@/features/common/RowActions'
import { useCrud } from '@/features/common/useCrud'
import type { Column } from '@/features/common/DataTable'
import { listTiposCusto, createTipoCusto, updateTipoCusto, type TipoCustoDto } from '@/features/cadastros/api'
import { getErrorMessage } from '@/lib/api'
import { avisar } from '@/features/common/dialogo/dialogo'
import { formatBRL, formatPct } from '@/lib/format'
import { TipoCustoFormModal } from './TipoCustoFormModal'
import type { TipoCustoForm } from './tipo-custo-schema'

/** "R$ 150,00", "2,00% da NF" ou "2,00% do serviço". */
const descreverValor = (t: TipoCustoDto) =>
  t.modo === 'percentual'
    ? `${formatPct(t.valor)} ${t.basePercentual === 'servico' ? 'do serviço' : 'da NF'}`
    : t.valor > 0
      ? formatBRL(t.valor)
      : '—'

export function TiposCustoPage() {
  const qc = useQueryClient()
  const { data } = useQuery({ queryKey: ['tipos-custo'], queryFn: listTiposCusto })
  const crud = useCrud<TipoCustoDto>([], (t, q) => t.nome.toLowerCase().includes(q))

  useEffect(() => {
    if (data) crud.reset(data)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data])

  const invalidate = () => qc.invalidateQueries({ queryKey: ['tipos-custo'] })
  const [saveError, setSaveError] = useState<string | null>(null)

  const save = async (form: TipoCustoForm) => {
    setSaveError(null)
    try {
      if (crud.editing) {
        const upd = await updateTipoCusto({ ...form, id: crud.editing.id })
        crud.update(upd.id, upd)
      } else {
        const created = await createTipoCusto({ ...form, id: '' })
        crud.add(created)
      }
    } catch (err) {
      setSaveError(getErrorMessage(err))
      return
    }
    invalidate()
    crud.close()
  }

  const setStatus = async (t: TipoCustoDto, status: 'ativo' | 'inativo') => {
    try {
      const upd = await updateTipoCusto({ ...t, status })
      crud.update(upd.id, upd)
    } catch (err) {
      void avisar({ titulo: 'Não foi possível concluir', mensagem: getErrorMessage(err) })
      return
    }
    invalidate()
  }

  const columns: Column<TipoCustoDto>[] = [
    {
      header: 'Tipo de Custo',
      fixa: true,
      valor: (t) => t.nome,
      cell: (t) => (
        <div className={ui.rowName}>
          <span className={ui.avatarSm}>
            <Coins size={15} />
          </span>
          <span className={ui.cellStrong}>{t.nome}</span>
        </div>
      ),
    },
    {
      header: 'Valor pré-cadastrado',
      className: ui.right,
      valor: (t) => descreverValor(t),
      cell: (t) => <span className={ui.cellStrong}>{descreverValor(t)}</span>,
    },
    { header: 'Status', valor: (t) => t.status, cell: (t) => <StatusBadge status={t.status} /> },
    {
      header: 'Ações',
      fixa: true,
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
        title="Tipos de Custo"
        subtitle="Custos pré-cadastrados para usar na precificação (ex.: Mão de obra, Deslocamento, Material)."
        action={
          <button className={`${ui.btn} ${ui.btnPrimary}`} onClick={crud.openNew}>
            <Plus /> Novo tipo de custo
          </button>
        }
      />

      <CrudList
        id="tipos-custo"
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

      <TipoCustoFormModal
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

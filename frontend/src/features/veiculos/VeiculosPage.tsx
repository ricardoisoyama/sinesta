import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Truck } from 'lucide-react'
import ui from '@/features/common/ui.module.css'
import { PageHeader } from '@/features/common/PageHeader'
import { CrudList } from '@/features/common/CrudList'
import { StatusBadge } from '@/features/common/StatusBadge'
import { RowActions } from '@/features/common/RowActions'
import { useCrud } from '@/features/common/useCrud'
import type { Column } from '@/features/common/DataTable'
import { LARGURA } from '@/features/common/grid'
import { avisar } from '@/features/common/dialogo/dialogo'
import { createVeiculo, listVeiculos, updateVeiculo } from '@/features/cadastros/api'
import { getErrorMessage } from '@/lib/api'
import { semAcento } from '@/lib/texto'
import { VeiculoFormModal } from './VeiculoFormModal'
import { placaFormatada, type Veiculo } from './types'
import type { VeiculoForm } from './veiculo-schema'

const CHAVE_VEICULOS = ['veiculos']

export function VeiculosPage() {
  const qc = useQueryClient()
  const { data } = useQuery({ queryKey: CHAVE_VEICULOS, queryFn: listVeiculos })
  // Busca pela placa (com ou sem hífen), proprietário, marca ou modelo.
  const crud = useCrud<Veiculo>([], (v, q) =>
    semAcento(`${v.placaTracao} ${placaFormatada(v.placaTracao)} ${v.placaReboque} ${v.nomeProprietario} ${v.marca} ${v.modelo}`).includes(semAcento(q)),
  )

  useEffect(() => {
    if (data) crud.reset(data)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data])

  const invalidate = () => qc.invalidateQueries({ queryKey: CHAVE_VEICULOS })
  const [saveError, setSaveError] = useState<string | null>(null)

  const save = async (form: VeiculoForm) => {
    setSaveError(null)
    try {
      if (crud.editing) {
        const upd = await updateVeiculo({ ...crud.editing, ...form, id: crud.editing.id })
        crud.update(upd.id, upd)
      } else {
        const created = await createVeiculo({ ...form, id: '' })
        crud.add(created)
      }
    } catch (err) {
      setSaveError(getErrorMessage(err))
      return
    }
    invalidate()
    crud.close()
  }

  const setStatus = async (v: Veiculo, status: 'ativo' | 'inativo') => {
    try {
      const upd = await updateVeiculo({ ...v, status })
      crud.update(upd.id, upd)
    } catch (err) {
      void avisar({ titulo: 'Não foi possível concluir', mensagem: getErrorMessage(err) })
      return
    }
    invalidate()
  }

  const columns: Column<Veiculo>[] = [
    {
      header: 'Placa',
      largura: LARGURA.media,
      fixa: true,
      valor: (v) => `${placaFormatada(v.placaTracao)} ${v.placaReboque ? placaFormatada(v.placaReboque) : ''}`,
      cell: (v) => (
        <div className={ui.rowName}>
          <span className={ui.avatarSm}>
            <Truck size={15} />
          </span>
          <div>
            <div className={ui.cellStrong}>{placaFormatada(v.placaTracao)}</div>
            {v.placaReboque && <div className={ui.cellMut}>Reboque: {placaFormatada(v.placaReboque)}</div>}
          </div>
        </div>
      ),
    },
    { header: 'Tipo', largura: LARGURA.media, valor: (v) => v.tipoVeiculo, cell: (v) => v.tipoVeiculo },
    { header: 'Carroceria', largura: LARGURA.media, valor: (v) => v.tipoCarroceria, cell: (v) => <span className={ui.cellMut}>{v.tipoCarroceria || '—'}</span> },
    {
      header: 'Marca / Modelo',
      valor: (v) => `${v.marca} ${v.modelo}`.trim(),
      cell: (v) => <span className={ui.cellMut}>{`${v.marca} ${v.modelo}`.trim() || '—'}</span>,
    },
    { header: 'Perfil', largura: LARGURA.curta, valor: (v) => v.perfil, cell: (v) => <span className={ui.cellMut}>{v.perfil || '—'}</span> },
    { header: 'Proprietário', largura: LARGURA.longa, valor: (v) => v.nomeProprietario, cell: (v) => <span className={ui.cellMut}>{v.nomeProprietario || '—'}</span> },
    { header: 'Status', largura: LARGURA.status, valor: (v) => v.status, cell: (v) => <StatusBadge status={v.status} /> },
    {
      header: 'Ações',
      fixa: true,
      largura: LARGURA.acoes,
      className: ui.colActions,
      cell: (v) => <RowActions status={v.status} onEdit={() => crud.openEdit(v)} onSetStatus={(st) => setStatus(v, st)} />,
    },
  ]

  return (
    <div>
      <PageHeader
        breadcrumb="Cadastros"
        title="Veículos"
        subtitle="Frota, agregados e veículos de terceiros habilitados para as operações."
        action={
          <button className={`${ui.btn} ${ui.btnPrimary}`} onClick={crud.openNew}>
            <Plus /> Cadastrar veículo
          </button>
        }
      />

      <CrudList
        id="veiculos"
        query={crud.query}
        onQuery={crud.setQuery}
        searchPlaceholder="Buscar por placa, proprietário, marca ou modelo..."
        columns={columns}
        rows={crud.filtered}
        getKey={(v) => v.id}
        rotulo={['veículo', 'veículos']}
        onStatusLote={async (itens, st) => {
          for (const it of itens) await setStatus(it, st)
        }}
      />

      <VeiculoFormModal
        open={crud.modalOpen}
        initial={crud.editing}
        cadastrados={crud.items}
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

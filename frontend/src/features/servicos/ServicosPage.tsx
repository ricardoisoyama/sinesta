import { useCallback, useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Briefcase } from 'lucide-react'
import ui from '@/features/common/ui.module.css'
import { PageHeader } from '@/features/common/PageHeader'
import { CrudList } from '@/features/common/CrudList'
import { StatusBadge } from '@/features/common/StatusBadge'
import { RowActions } from '@/features/common/RowActions'
import { useCrud } from '@/features/common/useCrud'
import type { Column } from '@/features/common/DataTable'
import { listServicos, createServico, updateServico, type ServicoDto } from '@/features/cadastros/api'
import { getErrorMessage } from '@/lib/api'
import { usePropostas } from '@/features/propostas/store'
import { ServicoFormModal } from './ServicoFormModal'
import type { ServicoForm } from './servico-schema'

export function ServicosPage() {
  const qc = useQueryClient()
  const { data } = useQuery({ queryKey: ['servicos'], queryFn: listServicos })

  const searchFn = useCallback((s: ServicoDto, q: string) => s.nome.toLowerCase().includes(q), [])

  const crud = useCrud<ServicoDto>([], searchFn)

  useEffect(() => {
    if (data) crud.reset(data)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data])

  // Serviço já usado em proposta não pode ser editado nem removido, só inativado.
  const { propostas } = usePropostas()
  const usados = new Set(
    propostas.flatMap((p) => p.itens.map((i) => i.servicoId).filter((id): id is string => !!id)),
  )
  const jaUsado = (id: string) => usados.has(id)

  const invalidate = () => qc.invalidateQueries({ queryKey: ['servicos'] })
  const [saveError, setSaveError] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)

  const save = async (form: ServicoForm) => {
    setSaveError(null)
    setSalvando(true)
    try {
      if (crud.editing) {
        const upd = await updateServico({ ...form, id: crud.editing.id })
        crud.update(upd.id, upd)
      } else {
        const created = await createServico({ ...form, id: '' })
        crud.add(created)
      }
    } catch (err) {
      setSaveError(getErrorMessage(err))
      return
    } finally {
      setSalvando(false)
    }
    invalidate()
    crud.close()
  }

  const setStatus = async (s: ServicoDto, status: 'ativo' | 'inativo') => {
    try {
      const upd = await updateServico({ ...s, status })
      crud.update(upd.id, upd)
    } catch (err) {
      window.alert(getErrorMessage(err))
      return
    }
    invalidate()
  }

  const columns: Column<ServicoDto>[] = [
    {
      header: 'Serviço',
      fixa: true,
      valor: (s) => s.nome,
      cell: (s) => (
        <div className={ui.rowName}>
          <span className={ui.avatarSm}>
            <Briefcase size={15} />
          </span>
          <span className={ui.cellStrong}>{s.nome}</span>
        </div>
      ),
    },
    {
      header: 'Uso',
      valor: (s) => (jaUsado(s.id) ? 'Em proposta' : 'Sem uso'),
      cell: (s) =>
        jaUsado(s.id) ? (
          <span className={ui.cellMut}>Em proposta</span>
        ) : (
          <span className={ui.cellMut}>—</span>
        ),
    },
    { header: 'Status', valor: (s) => s.status, cell: (s) => <StatusBadge status={s.status} /> },
    {
      header: 'Ações',
      fixa: true,
      className: ui.colActions,
      cell: (s) => (
        <RowActions
          status={s.status}
          onEdit={() => crud.openEdit(s)}
          onSetStatus={(st) => setStatus(s, st)}
          podeEditar={!jaUsado(s.id)}
          motivoBloqueio="Serviço já usado em proposta: só pode ser inativado"
        />
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        breadcrumb="Cadastros"
        title="Serviços"
        subtitle="Serviços oferecidos que saem na proposta (ex.: Consultoria mensal, Suporte técnico)."
        action={
          <button className={`${ui.btn} ${ui.btnPrimary}`} onClick={crud.openNew}>
            <Plus /> Novo serviço
          </button>
        }
      />

      <CrudList
        id="servicos"
        query={crud.query}
        onQuery={crud.setQuery}
        searchPlaceholder="Buscar por nome..."
        columns={columns}
        rows={crud.filtered}
        getKey={(s) => s.id}
        onStatusLote={async (itens, st) => {
          for (const it of itens) await setStatus(it, st)
        }}
      />

      <ServicoFormModal
        open={crud.modalOpen}
        initial={crud.editing}
        error={saveError}
        busy={salvando}
        onClose={() => {
          setSaveError(null)
          crud.close()
        }}
        onSave={save}
      />
    </div>
  )
}

import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { IdCard, Plus } from 'lucide-react'
import ui from '@/features/common/ui.module.css'
import { PageHeader } from '@/features/common/PageHeader'
import { CrudList } from '@/features/common/CrudList'
import { StatusBadge } from '@/features/common/StatusBadge'
import { RowActions } from '@/features/common/RowActions'
import { useCrud } from '@/features/common/useCrud'
import type { Column } from '@/features/common/DataTable'
import { LARGURA } from '@/features/common/grid'
import { avisar } from '@/features/common/dialogo/dialogo'
import { createMotorista, listMotoristas, updateMotorista } from '@/features/cadastros/api'
import { getErrorMessage } from '@/lib/api'
import { formatCpf, formatTelefone } from '@/lib/format'
import { semAcento } from '@/lib/texto'
import { MotoristaFormModal } from './MotoristaFormModal'
import { diasParaVencerCnh, situacaoCnh, type Motorista } from './types'

const CHAVE = ['motoristas']
const dataBR = (iso: string) => (iso ? iso.split('-').reverse().join('/') : '')

export function MotoristasPage() {
  const qc = useQueryClient()
  const [hoje] = useState(() => new Date().toLocaleDateString('sv-SE'))
  const { data } = useQuery({ queryKey: CHAVE, queryFn: listMotoristas })
  const crud = useCrud<Motorista>([], (m, q) => semAcento(`${m.nome} ${m.cpf} ${formatCpf(m.cpf)} ${m.numeroCnh} ${m.tipo} ${m.vinculo}`).includes(semAcento(q)))

  useEffect(() => {
    if (data) crud.reset(data)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data])

  const [saveError, setSaveError] = useState<string | null>(null)
  const invalidate = () => qc.invalidateQueries({ queryKey: CHAVE })

  const save = async (m: Motorista) => {
    setSaveError(null)
    try {
      if (crud.editing) crud.update(crud.editing.id, await updateMotorista({ ...m, id: crud.editing.id }))
      else crud.add(await createMotorista({ ...m, id: '' }))
    } catch (err) {
      setSaveError(getErrorMessage(err))
      return
    }
    void invalidate()
    crud.close()
  }

  const setStatus = async (m: Motorista, status: 'ativo' | 'inativo') => {
    try {
      crud.update(m.id, await updateMotorista({ ...m, status }))
    } catch (err) {
      void avisar({ titulo: 'Não foi possível concluir', mensagem: getErrorMessage(err) })
      return
    }
    void invalidate()
  }

  const columns: Column<Motorista>[] = [
    {
      header: 'Motorista',
      fixa: true,
      valor: (m) => `${m.nome} ${formatCpf(m.cpf)}`,
      cell: (m) => (
        <div className={ui.rowName}>
          <span className={ui.avatarSm}><IdCard size={15} /></span>
          <div>
            <div className={ui.cellStrong}>{m.nome}</div>
            <div className={ui.cellMut}>{m.cpf ? formatCpf(m.cpf) : 'Sem CPF'}</div>
          </div>
        </div>
      ),
    },
    { header: 'Tipo', largura: LARGURA.curta, valor: (m) => m.tipo, cell: (m) => <span className={ui.cellMut}>{m.tipo || '—'}</span> },
    { header: 'Vínculo', largura: LARGURA.curta, valor: (m) => m.vinculo, cell: (m) => <span className={ui.cellMut}>{m.vinculo || '—'}</span> },
    {
      header: 'CNH',
      largura: LARGURA.media,
      valor: (m) => `${m.categoriaCnh} ${dataBR(m.validadeCnh)}`,
      cell: (m) => {
        const sit = situacaoCnh(m.validadeCnh, hoje)
        const dias = diasParaVencerCnh(m.validadeCnh, hoje)
        return (
          <div>
            <div>{m.categoriaCnh ? `Categoria ${m.categoriaCnh}` : '—'}</div>
            {sit && (
              <span className={`${ui.badge} ${sit === 'vencida' ? ui.badgeErr : sit === 'a-vencer' ? ui.badgeWarn : ui.badgeOk}`}>
                {sit === 'vencida' ? `Vencida em ${dataBR(m.validadeCnh)}` : sit === 'a-vencer' ? `Vence em ${dias} dia(s)` : `Válida até ${dataBR(m.validadeCnh)}`}
              </span>
            )}
          </div>
        )
      },
    },
    { header: 'Telefone', largura: LARGURA.media, valor: (m) => m.telefone, cell: (m) => <span className={ui.cellMut}>{m.telefone ? formatTelefone(m.telefone) : '—'}</span> },
    { header: 'Cidade', largura: LARGURA.media, valor: (m) => m.cidade, cell: (m) => <span className={ui.cellMut}>{m.cidade || '—'}</span> },
    { header: 'Status', largura: LARGURA.status, valor: (m) => m.status, cell: (m) => <StatusBadge status={m.status} /> },
    {
      header: 'Ações',
      fixa: true,
      largura: LARGURA.acoes,
      className: ui.colActions,
      cell: (m) => <RowActions status={m.status} onEdit={() => crud.openEdit(m)} onSetStatus={(st) => setStatus(m, st)} />,
    },
  ]

  return (
    <div>
      <PageHeader
        breadcrumb="Cadastros"
        title="Motoristas"
        subtitle="Motoristas, ajudantes e operadores das operações, com a CNH e o vencimento dela."
        action={
          <button className={`${ui.btn} ${ui.btnPrimary}`} onClick={crud.openNew}>
            <Plus /> Cadastrar motorista
          </button>
        }
      />
      <CrudList
        id="motoristas"
        query={crud.query}
        onQuery={crud.setQuery}
        searchPlaceholder="Buscar por nome, CPF ou CNH..."
        columns={columns}
        rows={crud.filtered}
        getKey={(m) => m.id}
        onRowClick={(m) => crud.openEdit(m)}
      />
      {crud.modalOpen && (
        <MotoristaFormModal
          key={crud.editing?.id ?? 'novo'}
          open={crud.modalOpen}
          initial={crud.editing}
          error={saveError}
          hoje={hoje}
          onClose={() => {
            setSaveError(null)
            crud.close()
          }}
          onSave={save}
        />
      )}
    </div>
  )
}

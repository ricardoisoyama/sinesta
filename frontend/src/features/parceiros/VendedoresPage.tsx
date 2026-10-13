import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, UserRound, ArrowRightLeft } from 'lucide-react'
import { useAuth } from '@/features/auth/auth-context'
import { TransferirCarteiraModal } from './TransferirCarteiraModal'
import ui from '@/features/common/ui.module.css'
import { PageHeader } from '@/features/common/PageHeader'
import { CrudList } from '@/features/common/CrudList'
import { StatusBadge } from '@/features/common/StatusBadge'
import { RowActions } from '@/features/common/RowActions'
import { useCrud } from '@/features/common/useCrud'
import type { Column } from '@/features/common/DataTable'
import { formatCpfCnpj } from '@/lib/format'
import { descreverRegiao } from './regiao'
import { listVendedores, createVendedor, updateVendedor, transferirCarteira } from '@/features/cadastros/api'
import { getErrorMessage } from '@/lib/api'
import { avisar } from '@/features/common/dialogo/dialogo'
import { VendedorFormModal } from './VendedorFormModal'
import type { VendedorForm } from './parceiro-schema'
import { TIPOS_VENDEDOR, type Vendedor } from './types'

const labelTipo = (v: Vendedor) =>
  TIPOS_VENDEDOR.find((t) => t.valor === v.tipoVendedor)?.label ?? '—'

export function VendedoresPage() {
  const qc = useQueryClient()
  const { data } = useQuery({ queryKey: ['vendedores'], queryFn: listVendedores })
  const crud = useCrud<Vendedor>(
    [],
    (v, q) => v.nome.toLowerCase().includes(q) || v.email.toLowerCase().includes(q),
  )

  useEffect(() => {
    if (data) crud.reset(data)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data])

  const invalidate = () => qc.invalidateQueries({ queryKey: ['vendedores'] })
  const [saveError, setSaveError] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)

  const save = async (form: VendedorForm) => {
    setSaveError(null)
    setSalvando(true)
    try {
      if (crud.editing) {
        const upd = await updateVendedor({ ...form, id: crud.editing.id })
        crud.update(upd.id, upd)
      } else {
        const created = await createVendedor({ ...form, id: '' })
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

  // Transferência de carteira: permissão especial ligada no cadastro do funcionário.
  const { user } = useAuth()
  const podeTransferir = !!user?.permissoes?.includes('/cadastros/vendedores/transferir')
  const [transferindoDe, setTransferindoDe] = useState<Vendedor | null>(null)
  const [transfBusy, setTransfBusy] = useState(false)
  const [transfErro, setTransfErro] = useState<string | null>(null)

  const confirmarTransferencia = async (paraId: string) => {
    if (!transferindoDe) return
    setTransfErro(null)
    setTransfBusy(true)
    try {
      const r = await transferirCarteira(transferindoDe.id, paraId)
      qc.invalidateQueries({ queryKey: ['clientes'] })
      void avisar(`Carteira transferida: ${r.clientes} cliente(s) passaram para o novo vendedor.`)
      setTransferindoDe(null)
    } catch (err) {
      setTransfErro(getErrorMessage(err))
    } finally {
      setTransfBusy(false)
    }
  }

  const setStatus = async (v: Vendedor, status: 'ativo' | 'inativo') => {
    try {
      const upd = await updateVendedor({ ...v, status })
      crud.update(upd.id, upd)
    } catch (err) {
      void avisar({ titulo: 'Não foi possível concluir', mensagem: getErrorMessage(err) })
      return
    }
    invalidate()
  }

  const columns: Column<Vendedor>[] = [
    {
      header: 'Vendedor',
      fixa: true,
      valor: (v) => `${v.nome} ${v.email}`,
      cell: (v) => (
        <div className={ui.rowName}>
          <span className={ui.avatarSm}>
            <UserRound size={15} />
          </span>
          <div>
            <div className={ui.cellStrong}>{v.nome}</div>
            {v.email && <div className={ui.cellMut}>{v.email}</div>}
          </div>
        </div>
      ),
    },
    {
      header: 'Tipo',
      valor: (v) => labelTipo(v),
      cell: (v) => <span className={ui.cellMut}>{labelTipo(v)}</span>,
    },
    {
      header: 'CPF / CNPJ',
      valor: (v) => `${v.cpfCnpj} ${formatCpfCnpj(v.cpfCnpj)}`,
      cell: (v) => <span className={ui.cellMut}>{v.cpfCnpj ? formatCpfCnpj(v.cpfCnpj) : '—'}</span>,
    },
    { header: 'Telefone', valor: (v) => v.telefone, cell: (v) => <span className={ui.cellMut}>{v.telefone || '—'}</span> },
    {
      header: 'Funcionário',
      valor: (v) => (v.usuarioId ? 'vinculado' : 'sem acesso'),
      cell: (v) => <span className={ui.cellMut}>{v.usuarioId ? 'Vinculado' : 'Sem acesso ao portal'}</span>,
    },
    {
      header: 'Regiões bloqueadas',
      valor: (v) => (v.regioesBloqueadas ?? []).map(descreverRegiao).join(' '),
      cell: (v) => {
        const lista = v.regioesBloqueadas ?? []
        return <span className={ui.cellMut}>{lista.length ? lista.map((r) => r.valor).join(', ') : '—'}</span>
      },
    },
    { header: 'Status', valor: (v) => v.status, cell: (v) => <StatusBadge status={v.status} /> },
    {
      header: 'Ações',
      fixa: true,
      className: ui.colActions,
      cell: (v) => (
        <>
          {podeTransferir && (
            <button
              type="button"
              className={ui.iconBtn}
              title="Transferir carteira de clientes para outro vendedor"
              onClick={() => {
                setTransfErro(null)
                setTransferindoDe(v)
              }}
            >
              <ArrowRightLeft />
            </button>
          )}
          <RowActions status={v.status} onEdit={() => crud.openEdit(v)} onSetStatus={(st) => setStatus(v, st)} />
        </>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        breadcrumb="Cadastros"
        title="Vendedores"
        subtitle="Equipe comercial: função, vínculo com o funcionário e regiões em que cada um não vende."
        action={
          <button className={`${ui.btn} ${ui.btnPrimary}`} onClick={crud.openNew}>
            <Plus /> Novo vendedor
          </button>
        }
      />

      <CrudList
        id="vendedores"
        query={crud.query}
        onQuery={crud.setQuery}
        searchPlaceholder="Buscar por nome ou e-mail..."
        columns={columns}
        rows={crud.filtered}
        getKey={(v) => v.id}
        onStatusLote={async (itens, st) => {
          for (const it of itens) await setStatus(it, st)
        }}
      />

      <TransferirCarteiraModal
        open={!!transferindoDe}
        de={transferindoDe}
        vendedores={crud.items}
        busy={transfBusy}
        error={transfErro}
        onClose={() => setTransferindoDe(null)}
        onConfirmar={confirmarTransferencia}
      />

      <VendedorFormModal
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

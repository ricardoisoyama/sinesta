import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { ArrowRightLeft, Plus, type LucideIcon } from 'lucide-react'
import ui from '@/features/common/ui.module.css'
import { PageHeader } from '@/features/common/PageHeader'
import { CrudList } from '@/features/common/CrudList'
import { useAuth } from '@/features/auth/auth-context'
import { listVendedores, transferirClientes, type TransferenciaClientes } from '@/features/cadastros/api'
import { TransferirClientesModal } from './TransferirClientesModal'
import { StatusBadge } from '@/features/common/StatusBadge'
import { RowActions } from '@/features/common/RowActions'
import { useCrud } from '@/features/common/useCrud'
import type { Column } from '@/features/common/DataTable'
import { formatCpfCnpj } from '@/lib/format'
import {
  listClientes, createCliente, updateCliente,
  listFornecedores, createFornecedor, updateFornecedor,
} from '@/features/cadastros/api'
import { getErrorMessage } from '@/lib/api'
import { ParceiroFormModal } from './ParceiroFormModal'
import type { ParceiroForm } from './parceiro-schema'
import { contatosDoParceiro, type Parceiro } from './types'

const RECURSOS = {
  clientes: { list: listClientes, create: createCliente, update: updateCliente },
  fornecedores: { list: listFornecedores, create: createFornecedor, update: updateFornecedor },
}

interface Props {
  recurso: keyof typeof RECURSOS
  titulo: string
  subtitulo: string
  /** Rótulo do botão de novo registro (ex.: "Novo cliente"). */
  botao: string
  /** Título do modal, no singular (ex.: "Cliente"). */
  singular: string
  icon: LucideIcon
}

/** Tela de cadastro compartilhada por Clientes e Fornecedores. */
export function ParceirosPage({ recurso, titulo, subtitulo, botao, singular, icon: Icon }: Props) {
  const api = RECURSOS[recurso]
  const qc = useQueryClient()
  const { data } = useQuery({ queryKey: [recurso], queryFn: api.list })
  const crud = useCrud<Parceiro>(
    [],
    (p, q) =>
      p.nome.toLowerCase().includes(q) ||
      p.nomeFantasia.toLowerCase().includes(q) ||
      p.cpfCnpj.replace(/\D/g, '').includes(q.replace(/\D/g, '')),
  )

  useEffect(() => {
    if (data) crud.reset(data)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data])

  // Vindo da Precificação ("Cadastrar cliente"): ?novo=Nome abre o cadastro já com o nome.
  const [searchParams, setSearchParams] = useSearchParams()
  const nomeInicial = searchParams.get('novo') ?? ''
  useEffect(() => {
    if (nomeInicial) crud.openNew()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nomeInicial])

  const invalidate = () => qc.invalidateQueries({ queryKey: [recurso] })
  const [saveError, setSaveError] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)

  const save = async (form: ParceiroForm) => {
    setSaveError(null)
    setSalvando(true)
    try {
      if (crud.editing) {
        const upd = await api.update({ ...form, id: crud.editing.id })
        crud.update(upd.id, upd)
      } else {
        const created = await api.create({ ...form, id: '' })
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

  // Grupos econômicos já usados: sugestão no campo.
  const grupos = [...new Set(crud.items.map((p) => p.grupoEconomico).filter((g): g is string => !!g))].sort()

  const setStatus = async (p: Parceiro, status: 'ativo' | 'inativo') => {
    try {
      const upd = await api.update({ ...p, status })
      crud.update(upd.id, upd)
    } catch (err) {
      window.alert(getErrorMessage(err))
      return
    }
    invalidate()
  }

  // Transferência em lote (só Clientes): exige a permissão especial do funcionário.
  const { user } = useAuth()
  const ehClientes = recurso === 'clientes'
  const podeTransferir = ehClientes && !!user?.permissoes?.includes('/cadastros/vendedores/transferir')
  const { data: vendedores } = useQuery({ queryKey: ['vendedores'], queryFn: listVendedores, enabled: podeTransferir })
  const [transferindo, setTransferindo] = useState<{ ids: string[]; limpar: () => void } | null>(null)
  const [transfBusy, setTransfBusy] = useState(false)
  const [transfErro, setTransfErro] = useState<string | null>(null)

  const confirmarTransferencia = async (destino: TransferenciaClientes) => {
    if (!transferindo) return
    setTransfErro(null)
    setTransfBusy(true)
    try {
      const r = await transferirClientes(transferindo.ids, destino)
      await invalidate()
      window.alert(`${r.clientes} cliente(s) transferido(s) para o vendedor.`)
      transferindo.limpar()
      setTransferindo(null)
    } catch (err) {
      setTransfErro(getErrorMessage(err))
    } finally {
      setTransfBusy(false)
    }
  }

  const columns: Column<Parceiro>[] = [
    {
      header: 'Nome',
      fixa: true,
      valor: (p) => `${p.nome} ${p.nomeFantasia}`,
      cell: (p) => (
        <div className={ui.rowName}>
          <span className={ui.avatarSm}>
            <Icon size={15} />
          </span>
          <div>
            <div className={ui.cellStrong}>{p.nome}</div>
            {p.nomeFantasia && <div className={ui.cellMut}>{p.nomeFantasia}</div>}
          </div>
        </div>
      ),
    },
    {
      header: 'CPF / CNPJ',
      // Exterior não tem CNPJ: mostra a identificação fiscal do país (Tax ID, VAT...).
      valor: (p) => (p.externo ? `${p.taxId ?? ''} exterior` : `${p.cpfCnpj} ${formatCpfCnpj(p.cpfCnpj)}`),
      cell: (p) =>
        p.externo ? (
          <span className={ui.cellMut}>{p.taxId ? `Tax ID ${p.taxId}` : 'Exterior · sem Tax ID'}</span>
        ) : (
          <span className={ui.cellMut}>{p.cpfCnpj ? formatCpfCnpj(p.cpfCnpj) : '—'}</span>
        ),
    },
    {
      header: 'Contato',
      valor: (p) => contatosDoParceiro(p).map((c) => `${c.nome} ${c.email} ${c.telefone}`).join(' '),
      cell: (p) => {
        const lista = contatosDoParceiro(p)
        const principal = lista[0]
        return (
          <div>
            <div className={ui.cellMut}>{principal?.nome || principal?.email || '—'}</div>
            {principal?.telefone && <div className={ui.cellMut}>{principal.telefone}</div>}
            {lista.length > 1 && <div className={ui.cellMut}>+{lista.length - 1} contato(s)</div>}
          </div>
        )
      },
    },
    {
      header: 'Cidade',
      valor: (p) => (p.externo ? `${p.cidade} ${p.pais ?? ''}` : p.cidade),
      cell: (p) => <span className={ui.cellMut}>{p.externo ? [p.cidade, p.pais].filter(Boolean).join(', ') || 'Exterior' : p.cidade || '—'}</span>,
    },
    { header: 'Segmento', valor: (p) => p.segmento, cell: (p) => <span className={ui.cellMut}>{p.segmento || '—'}</span> },
    { header: 'Grupo', valor: (p) => p.grupoEconomico, cell: (p) => <span className={ui.cellMut}>{p.grupoEconomico || '—'}</span> },
    { header: 'Status', valor: (p) => p.status, cell: (p) => <StatusBadge status={p.status} /> },
    {
      header: 'Ações',
      fixa: true,
      className: ui.colActions,
      cell: (p) => (
        <RowActions status={p.status} onEdit={() => crud.openEdit(p)} onSetStatus={(st) => setStatus(p, st)} />
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        breadcrumb="Cadastros"
        title={titulo}
        subtitle={subtitulo}
        action={
          <button className={`${ui.btn} ${ui.btnPrimary}`} onClick={crud.openNew}>
            <Plus /> {botao}
          </button>
        }
      />

      <CrudList
        id={recurso}
        query={crud.query}
        onQuery={crud.setQuery}
        searchPlaceholder="Buscar por nome ou documento..."
        columns={columns}
        rows={crud.filtered}
        getKey={(p) => p.id}
        onStatusLote={async (itens, st) => {
          for (const it of itens) await setStatus(it, st)
        }}
        acoesLote={
          podeTransferir
            ? ({ ids, limpar }) => (
                <button type="button" className={ui.selBtn} onClick={() => setTransferindo({ ids, limpar })} title="Mover os clientes selecionados para um vendedor">
                  <ArrowRightLeft /> Transferir para vendedor
                </button>
              )
            : undefined
        }
      />

      <TransferirClientesModal
        open={!!transferindo}
        quantidade={transferindo?.ids.length ?? 0}
        vendedores={vendedores ?? []}
        busy={transfBusy}
        error={transfErro}
        onClose={() => {
          setTransfErro(null)
          setTransferindo(null)
        }}
        onConfirmar={confirmarTransferencia}
      />

      <ParceiroFormModal
        open={crud.modalOpen}
        titulo={singular}
        tipoParceiro={recurso === 'clientes' ? 'cliente' : 'fornecedor'}
        icon={<Icon />}
        initial={crud.editing}
        nomeInicial={nomeInicial}
        grupos={grupos}
        error={saveError}
        busy={salvando}
        onClose={() => {
          setSaveError(null)
          crud.close()
          if (nomeInicial) setSearchParams({}, { replace: true })
        }}
        onSave={save}
      />
    </div>
  )
}

import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, ShieldCheck } from 'lucide-react'
import ui from '@/features/common/ui.module.css'
import { PageHeader } from '@/features/common/PageHeader'
import { CrudList } from '@/features/common/CrudList'
import { StatusBadge } from '@/features/common/StatusBadge'
import { RowActions } from '@/features/common/RowActions'
import { useCrud } from '@/features/common/useCrud'
import type { Column } from '@/features/common/DataTable'
import { formatBRL, formatPct } from '@/lib/format'
import { getErrorMessage } from '@/lib/api'
import { avisar } from '@/features/common/dialogo/dialogo'
import {
  listRegrasAprovacao,
  createRegraAprovacao,
  updateRegraAprovacao,
} from '@/features/cadastros/api'
import { useUsuarios } from '@/features/usuarios/store'
import { listVendedores } from '@/features/cadastros/api'
import { RegraFormModal } from './RegraFormModal'
import { TIPOS_REGRA, tipoDaRegra, type RegraAprovacao } from './types'
import s from './aprovadores.module.css'

export function AprovadoresPage() {
  const qc = useQueryClient()
  const { usuarios } = useUsuarios()
  const { data } = useQuery({ queryKey: ['regras-aprovacao'], queryFn: listRegrasAprovacao })
  const crud = useCrud<RegraAprovacao>([], (r, q) => r.nome.toLowerCase().includes(q))

  useEffect(() => {
    if (data) crud.reset(data)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data])

  const invalidate = () => qc.invalidateQueries({ queryKey: ['regras-aprovacao'] })
  const [saveError, setSaveError] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)

  const save = async (regra: RegraAprovacao) => {
    setSaveError(null)
    setSalvando(true)
    try {
      if (crud.editing) {
        const upd = await updateRegraAprovacao({ ...regra, id: crud.editing.id })
        crud.update(upd.id, upd)
      } else {
        const criada = await createRegraAprovacao({ ...regra, id: '' })
        crud.add(criada)
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

  const setStatus = async (r: RegraAprovacao, status: 'ativo' | 'inativo') => {
    try {
      const upd = await updateRegraAprovacao({ ...r, status })
      crud.update(upd.id, upd)
    } catch (err) {
      void avisar({ titulo: 'Não foi possível concluir', mensagem: getErrorMessage(err) })
      return
    }
    invalidate()
  }

  const { data: vendedoresData } = useQuery({ queryKey: ['vendedores'], queryFn: listVendedores })
  const nomeDe = (id: string) => usuarios.find((u) => u.id === id)?.nome ?? 'funcionário removido'
  const nomeVendedor = (id: string) => vendedoresData?.find((v) => v.id === id)?.nome ?? 'vendedor removido'
  const rotuloTipo = (r: RegraAprovacao) =>
    TIPOS_REGRA.find((t) => t.valor === tipoDaRegra(r))?.label.replace(/ \(.*\)$/, '') ?? 'Regra'
  /** Resumo do que a regra faz, por tipo. */
  const resumo = (r: RegraAprovacao): string => {
    const tipo = tipoDaRegra(r)
    if (tipo === 'compras')
      return `${nomeDe(r.compradorId)} compra até ${formatBRL(r.limite)}${(r.excecoes ?? []).length ? ` · ${r.excecoes.length} exceção(ões)` : ''}`
    if (tipo === 'comissao')
      return `${nomeVendedor(r.vendedorId)}: ${formatPct(r.comissaoPercentual)} ${r.comissaoBase === 'margem' ? 'sobre a margem' : 'sobre o preço'}`
    if (tipo === 'movimento') {
      const faixa = r.ate > 0 ? `de ${formatBRL(r.de)} até ${formatBRL(r.ate)}` : `a partir de ${formatBRL(r.de)}`
      const vale = r.tipoMovimento === 'pagar' ? 'A pagar' : r.tipoMovimento === 'receber' ? 'A receber' : 'A pagar e a receber'
      return `${vale} ${faixa}`
    }
    const fmt = (v: number) => (r.base === 'margem' ? formatPct(v) : formatBRL(v))
    const faixa = r.ate > 0 ? `${fmt(r.de)} até ${fmt(r.ate)}` : `a partir de ${fmt(r.de)}`
    return `${r.base === 'margem' ? 'Margem' : 'Valor'} ${faixa}`
  }

  const columns: Column<RegraAprovacao>[] = [
    {
      header: 'Regra',
      fixa: true,
      valor: (r) => `${r.nome} ${rotuloTipo(r)}`,
      cell: (r) => (
        <div className={ui.rowName}>
          <span className={ui.avatarSm}>
            <ShieldCheck size={15} />
          </span>
          <div>
            <div className={ui.cellStrong}>{r.nome}</div>
            <div className={ui.cellMut}>{rotuloTipo(r)}</div>
          </div>
        </div>
      ),
    },
    { header: 'O que faz', valor: (r) => resumo(r), cell: (r) => <span className={s.faixaTag}>{resumo(r)}</span> },
    {
      header: 'Aprovadores',
      valor: (r) => r.aprovadores.map(nomeDe).join(' '),
      cell: (r) => (
        <span className={ui.cellMut}>{tipoDaRegra(r) === 'comissao' ? '—' : r.aprovadores.map(nomeDe).join(' + ') || '—'}</span>
      ),
    },
    { header: 'Status', valor: (r) => r.status, cell: (r) => <StatusBadge status={r.status} /> },
    {
      header: 'Ações',
      fixa: true,
      className: ui.colActions,
      cell: (r) => (
        <RowActions status={r.status} onEdit={() => crud.openEdit(r)} onSetStatus={(st) => setStatus(r, st)} />
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        breadcrumb="Cadastros"
        title="Aprovadores e Regras"
        subtitle="As regras do sistema num lugar só: alçada de preço das propostas, aprovação dos lançamentos financeiros, limite de compras por comprador e comissão dos vendedores."
        action={
          <button className={`${ui.btn} ${ui.btnPrimary}`} onClick={crud.openNew}>
            <Plus /> Nova regra
          </button>
        }
      />

      <CrudList
        id="regras-aprovacao"
        query={crud.query}
        onQuery={crud.setQuery}
        searchPlaceholder="Buscar por nome da regra..."
        columns={columns}
        rows={crud.filtered}
        getKey={(r) => r.id}
        onStatusLote={async (itens, st) => {
          for (const it of itens) await setStatus(it, st)
        }}
        empty="Nenhuma regra cadastrada. Sem regra de proposta, a proposta pendente pode ser liberada por qualquer um com a permissão de aprovação. Sem regra de lançamentos financeiros, nenhum lançamento pode ser aprovado."
      />

      <RegraFormModal
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

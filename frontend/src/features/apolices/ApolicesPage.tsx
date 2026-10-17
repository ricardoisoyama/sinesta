import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, ShieldCheck } from 'lucide-react'
import ui from '@/features/common/ui.module.css'
import { PageHeader } from '@/features/common/PageHeader'
import { CrudList } from '@/features/common/CrudList'
import { RowActions } from '@/features/common/RowActions'
import { useCrud } from '@/features/common/useCrud'
import type { Column } from '@/features/common/DataTable'
import { LARGURA } from '@/features/common/grid'
import { avisar } from '@/features/common/dialogo/dialogo'
import { listEmpresas, listFornecedores } from '@/features/cadastros/api'
import { getErrorMessage } from '@/lib/api'
import { semAcento } from '@/lib/texto'
import { createApolice, listApolices, updateApolice } from './api'
import { ApoliceFormModal } from './ApoliceFormModal'
import { hojeLocal, situacaoApolice, vigenciaTexto, type Apolice } from './types'

const CHAVE = ['apolices']
const TOM = { verde: ui.badgeOk, laranja: ui.badgeWarn, vermelho: ui.badgeErr, cinza: ui.badgeOff } as const

/**
 * Apólices de seguro de todas as seguradoras numa lista só: dá para ver de relance qual está
 * vigente, qual vence em breve e qual já venceu, sem saber de antemão quem é a seguradora.
 */
export function ApolicesPage() {
  const qc = useQueryClient()
  const { data } = useQuery({ queryKey: CHAVE, queryFn: listApolices })
  const { data: fornecedores } = useQuery({ queryKey: ['fornecedores'], queryFn: listFornecedores })
  const { data: empresas } = useQuery({ queryKey: ['empresas'], queryFn: listEmpresas })
  const nomeSeguradora = (id: string) => {
    const f = (fornecedores ?? []).find((x) => x.id === id)
    return f ? f.nomeFantasia || f.nome : '—'
  }
  const nomeEmpresa = (id: string) => (empresas ?? []).find((e) => e.id === id)?.nome ?? id
  const hoje = hojeLocal()

  const crud = useCrud<Apolice>([], (a, q) => semAcento(`${a.numero} ${a.tipo} ${nomeSeguradora(a.seguradoraId)}`).includes(semAcento(q)))
  useEffect(() => {
    if (data) crud.reset(data)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data])

  const [erro, setErro] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)
  const invalidar = () => qc.invalidateQueries({ queryKey: CHAVE })

  const salvar = async (a: Apolice) => {
    setErro(null)
    setSalvando(true)
    try {
      if (crud.editing) crud.update(crud.editing.id, await updateApolice({ ...a, id: crud.editing.id }))
      else crud.add(await createApolice({ ...a, id: '' }))
    } catch (err) {
      setErro(getErrorMessage(err))
      return
    } finally {
      setSalvando(false)
    }
    invalidar()
    crud.close()
  }

  const mudarStatus = async (a: Apolice, status: 'ativo' | 'inativo') => {
    try {
      crud.update(a.id, await updateApolice({ ...a, status }))
    } catch (err) {
      void avisar({ titulo: 'Não foi possível concluir', mensagem: getErrorMessage(err) })
      return
    }
    invalidar()
  }

  const columns: Column<Apolice>[] = [
    {
      header: 'Apólice',
      largura: LARGURA.media,
      fixa: true,
      valor: (a) => `${a.tipo} ${a.numero}`,
      cell: (a) => (
        <div className={ui.rowName}>
          <span className={ui.avatarSm}>
            <ShieldCheck size={15} />
          </span>
          <div>
            <div className={ui.cellStrong}>{a.tipo}</div>
            <div className={ui.cellMut}>{a.numero || 'sem número'}</div>
          </div>
        </div>
      ),
    },
    { header: 'Seguradora', valor: (a) => nomeSeguradora(a.seguradoraId), cell: (a) => nomeSeguradora(a.seguradoraId) },
    { header: 'Vigência', largura: LARGURA.media, valor: (a) => a.vigenciaFim, cell: (a) => <span className={ui.cellMut}>{vigenciaTexto(a)}</span> },
    {
      header: 'Empresas',
      largura: LARGURA.longa,
      valor: (a) => a.empresaIds.map(nomeEmpresa).join(', '),
      cell: (a) => <span className={ui.cellMut}>{a.empresaIds.length === 0 ? 'Todas' : a.empresaIds.map(nomeEmpresa).join(', ')}</span>,
    },
    { header: 'Rotas', largura: LARGURA.curta, className: ui.right, valor: (a) => a.taxas?.length ?? 0, cell: (a) => a.taxas?.length ?? 0 },
    {
      header: 'Situação',
      largura: LARGURA.media,
      valor: (a) => situacaoApolice(a, hoje).texto,
      cell: (a) => {
        const sit = situacaoApolice(a, hoje)
        return <span className={`${ui.badge} ${TOM[sit.tom]}`}>{sit.texto}</span>
      },
    },
    {
      header: 'Ações',
      fixa: true,
      largura: LARGURA.acoes,
      className: ui.colActions,
      cell: (a) => <RowActions status={a.status} onEdit={() => crud.openEdit(a)} onSetStatus={(st) => mudarStatus(a, st)} />,
    },
  ]

  return (
    <div>
      <PageHeader
        breadcrumb="Cadastros"
        title="Apólices de seguro"
        subtitle="Apólices de cada seguradora, com vigência e tabela de prêmio por UF: a vigente do tipo é a base do ad valorem no Pricing."
        action={
          <button className={`${ui.btn} ${ui.btnPrimary}`} onClick={crud.openNew}>
            <Plus /> Nova apólice
          </button>
        }
      />

      <CrudList
        id="apolices"
        query={crud.query}
        onQuery={crud.setQuery}
        searchPlaceholder="Buscar por número, tipo ou seguradora..."
        columns={columns}
        rows={crud.filtered}
        getKey={(a) => a.id}
        rotulo={['apólice', 'apólices']}
        onStatusLote={async (itens, st) => {
          for (const it of itens) await mudarStatus(it, st)
        }}
      />

      <ApoliceFormModal
        open={crud.modalOpen}
        initial={crud.editing}
        seguradoras={fornecedores ?? []}
        empresas={(empresas ?? []).map((e) => ({ id: e.id, nome: e.nome }))}
        error={erro}
        busy={salvando}
        onClose={() => {
          setErro(null)
          crud.close()
        }}
        onSave={salvar}
      />
    </div>
  )
}

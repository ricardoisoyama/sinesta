import { useCallback, useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { FileSpreadsheet, Plus, Wallet } from 'lucide-react'
import ui from '@/features/common/ui.module.css'
import { PageHeader } from '@/features/common/PageHeader'
import { CrudList } from '@/features/common/CrudList'
import { StatusBadge } from '@/features/common/StatusBadge'
import { RowActions } from '@/features/common/RowActions'
import { useCrud } from '@/features/common/useCrud'
import type { Column } from '@/features/common/DataTable'
import { formatBRL, formatPct } from '@/lib/format'
import { nomeUnidade } from '@/features/unidades/mock'
import { usePlanoContas } from '@/features/planoContas/store'
import { useUsuarios } from '@/features/usuarios/store'
import { useCustosFixosQuery, useEmpresasQuery } from '@/features/cadastros/hooks'
import {
  createCustoFixo,
  updateCustoFixo,
  listCategoriasCusto,
  listFornecedores,
} from '@/features/cadastros/api'
import { getErrorMessage } from '@/lib/api'
import { avisar } from '@/features/common/dialogo/dialogo'
import { mockCustosFixos } from './mock'
import { entraNaDf, percentualDaEmpresa, rateada, valorDaEmpresa } from './regras'
import { CustoFixoFormModal } from './CustoFixoFormModal'
import { ImportarCustosModal } from './ImportarCustosModal'
import { DATA_FIM_SEM_PRAZO, type CustoFixo } from './types'
import type { CustoFixoForm } from './custo-fixo-schema'
import s from './custos.module.css'

export function CustosFixosPage() {
  const { nome: nomePlanoConta } = usePlanoContas()
  const [unidadeFiltro, setUnidadeFiltro] = useState('todos')
  const { data: empresasData } = useEmpresasQuery()
  const unidadesAtivas = (empresasData ?? []).filter((u) => u.status === 'ativo')

  const { data: categoriasData } = useQuery({ queryKey: ['categorias-custo'], queryFn: listCategoriasCusto })
  const { data: fornecedoresData } = useQuery({ queryKey: ['fornecedores'], queryFn: listFornecedores })
  const nomeCategoria = (id: string) => categoriasData?.find((c) => c.id === id)?.nome ?? '—'
  // Quem cobra pode ser fornecedor ou funcionário (salário, pró-labore: 'func-<id do usuário>').
  const { usuarios } = useUsuarios()
  const nomeFornecedor = (id: string) =>
    id.startsWith('func-')
      ? usuarios.find((u) => `func-${u.id}` === id)?.nome ?? ''
      : fornecedoresData?.find((f) => f.id === id)?.nome ?? ''

  // Filtrando por empresa, entram as despesas dela e as rateadas com ela (com a parte dela).
  const todas = unidadeFiltro === 'todos'
  /** Valor que conta para o filtro: cheio em "Todas" (cada despesa uma vez), a parte da empresa filtrada. */
  const valorNoFiltro = (c: CustoFixo) => (todas ? c.valorMensal : valorDaEmpresa(c, unidadeFiltro))

  // A busca olha a descrição, o centro de custo e quem cobra (fornecedor ou funcionário).
  const searchFn = useCallback(
    (c: CustoFixo, q: string) =>
      (unidadeFiltro === 'todos' || percentualDaEmpresa(c, unidadeFiltro) > 0) &&
      [c.descricao, categoriasData?.find((cat) => cat.id === c.categoriaId)?.nome ?? '', nomeFornecedor(c.fornecedorId)]
        .some((t) => t.toLowerCase().includes(q)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [unidadeFiltro, categoriasData, fornecedoresData, usuarios],
  )

  const crud = useCrud<CustoFixo>(mockCustosFixos, searchFn)
  const qc = useQueryClient()
  const { data } = useCustosFixosQuery()

  useEffect(() => {
    if (data) crud.reset(data)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data])

  const invalidate = () => qc.invalidateQueries({ queryKey: ['custos-fixos'] })
  const [saveError, setSaveError] = useState<string | null>(null)
  const [importarAberto, setImportarAberto] = useState(false)

  const save = async (form: CustoFixoForm) => {
    setSaveError(null)
    try {
      if (crud.editing) {
        const upd = await updateCustoFixo({ ...form, id: crud.editing.id })
        crud.update(upd.id, upd)
      } else {
        const created = await createCustoFixo({ ...form, id: '' })
        crud.add(created)
      }
    } catch (err) {
      setSaveError(getErrorMessage(err))
      return
    }
    invalidate()
    crud.close()
  }

  const setStatus = async (c: CustoFixo, status: 'ativo' | 'inativo') => {
    try {
      const upd = await updateCustoFixo({ ...c, status })
      crud.update(upd.id, upd)
    } catch (err) {
      void avisar({ titulo: 'Não foi possível concluir', mensagem: getErrorMessage(err) })
      return
    }
    invalidate()
  }

  const nomeEmpresa = (id: string) => unidadesAtivas.find((u) => u.id === id)?.nome ?? nomeUnidade(id)
  /** "50%" ou "33,33%": casas decimais só quando existem. */
  const pctCurto = (frac: number) => formatPct(frac, Number.isInteger(Math.round(frac * 10000) / 100) ? 0 : 2)
  // Com uma empresa no combo, entram também as despesas pagas por outra e rateadas com ela:
  // a linha diz quem paga e quanto vem para a empresa filtrada.
  const pagaOutra = (c: CustoFixo) => !todas && c.unidadeId !== unidadeFiltro
  const resumoRateio = (c: CustoFixo) => {
    if (todas) return `Rateada · ${c.rateio!.length} empresas`
    const pct = pctCurto(percentualDaEmpresa(c, unidadeFiltro))
    return pagaOutra(c) ? `${pct} rateado para a ${nomeEmpresa(unidadeFiltro)}` : `Rateada · fica com ${pct}`
  }

  /**
   * Cards de totais sobre exatamente o que a lista mostra (empresa, busca, filtros por coluna,
   * inativos). Com uma empresa no combo, soma a parte dela em cada despesa (rateio).
   */
  const resumo = (visiveis: CustoFixo[]) => {
    const naDf = visiveis.filter((c) => entraNaDf(c))
    const totalMensal = naDf.reduce((acc, c) => acc + valorNoFiltro(c), 0)
    const totalSpot = visiveis.filter((c) => c.status === 'ativo' && c.tipo === 'spot').reduce((acc, c) => acc + valorNoFiltro(c), 0)
    const filtrado = visiveis.length < crud.items.filter((c) => c.status !== 'inativo').length
    const sub = todas ? (filtrado ? 'das despesas filtradas' : 'todas as empresas') : `parte da ${nomeEmpresa(unidadeFiltro)} no rateio`
    return (
      <div className={s.summary}>
        <div className={s.sumCard}>
          <div className={s.sumLabel}>Total DF / mês</div>
          <div className={`${s.sumValue} ${s.accent}`}>{formatBRL(totalMensal)}</div>
          <div className={s.sumSub}>{sub}</div>
        </div>
        <div className={s.sumCard}>
          <div className={s.sumLabel}>Total DF / ano</div>
          <div className={s.sumValue}>{formatBRL(totalMensal * 12)}</div>
          <div className={s.sumSub}>{sub}</div>
        </div>
        <div className={s.sumCard}>
          <div className={s.sumLabel}>Custos na DF</div>
          <div className={s.sumValue}>{naDf.length}</div>
          <div className={s.sumSub}>de {visiveis.length} na lista</div>
        </div>
        <div className={s.sumCard}>
          <div className={s.sumLabel}>Despesas spot</div>
          <div className={s.sumValue}>{formatBRL(totalSpot)}</div>
          <div className={s.sumSub}>fora da DF</div>
        </div>
      </div>
    )
  }

  const columns: Column<CustoFixo>[] = [
    {
      header: 'Descrição',
      fixa: true,
      valor: (c) => `${c.descricao} ${nomeFornecedor(c.fornecedorId)}`,
      cell: (c) => (
        <div className={ui.rowName}>
          <span className={ui.avatarSm}>
            <Wallet size={15} />
          </span>
          <div>
            <div className={ui.cellStrong}>{c.descricao}</div>
            {nomeFornecedor(c.fornecedorId) && (
              <div className={ui.cellMut}>{nomeFornecedor(c.fornecedorId)}</div>
            )}
          </div>
        </div>
      ),
    },
    {
      header: 'Empresa que paga',
      valor: (c) => nomeEmpresa(c.unidadeId) + (rateada(c) ? ` (${resumoRateio(c)})` : ''),
      cell: (c) => (
        <div className={s.empresaCel}>
          {pagaOutra(c) ? (
            <span className={s.unitTagOutra}>Paga pela {nomeEmpresa(c.unidadeId)}</span>
          ) : (
            <span className={s.unitTag}>{nomeEmpresa(c.unidadeId)}</span>
          )}
          {rateada(c) && (
            <span
              className={s.rateioTag}
              title={c.rateio!.map((r) => `${nomeEmpresa(r.empresaId)}: ${formatPct(r.percentual)}`).join('\n')}
            >
              {resumoRateio(c)}
            </span>
          )}
        </div>
      ),
    },
    { header: 'Centro de custo', valor: (c) => nomeCategoria(c.categoriaId), cell: (c) => <span className={s.catTag}>{nomeCategoria(c.categoriaId)}</span> },
    {
      header: 'Tipo',
      valor: (c) => (c.tipo === 'spot' ? 'Spot' : 'Recorrente'),
      cell: (c) => (
        <div>
          <span className={`${s.tipoTag} ${c.tipo === 'spot' ? s.tipoSpot : ''}`}>
            {c.tipo === 'spot' ? 'Spot' : 'Recorrente'}
          </span>
          {c.tipo === 'recorrente' && (c.dataInicio || c.dataFim) && (
            <div className={ui.cellMut}>
              {c.dataInicio ? c.dataInicio.split('-').reverse().join('/') : 'sem início'} até{' '}
              {!c.dataFim ? 'sem término' : c.dataFim.split('-').reverse().join('/')}
              {c.dataFim === DATA_FIM_SEM_PRAZO && ' (sem prazo final)'}
            </div>
          )}
          {c.status === 'ativo' && !entraNaDf(c) && <div className={s.foraDf}>fora da DF</div>}
        </div>
      ),
    },
    {
      header: 'Plano de contas',
      valor: (c) => (c.planoContaId ? nomePlanoConta(c.planoContaId) : ''),
      cell: (c) => <span className={ui.cellMut}>{c.planoContaId ? nomePlanoConta(c.planoContaId) : '—'}</span>,
    },
    {
      header: 'Vencimento',
      valor: (c) => (c.diaVencimento ? `dia ${c.diaVencimento}` : ''),
      cell: (c) => <span className={ui.cellMut}>{c.diaVencimento ? `dia ${c.diaVencimento}` : '—'}</span>,
    },
    {
      header: todas ? 'Valor mensal' : 'Valor desta empresa',
      className: ui.right,
      valor: (c) => formatBRL(valorNoFiltro(c)),
      cell: (c) => (
        <div>
          <span className={ui.cellStrong}>{formatBRL(valorNoFiltro(c))}</span>
          {!todas && rateada(c) && (
            <div className={ui.cellMut}>
              {formatPct(percentualDaEmpresa(c, unidadeFiltro))} de {formatBRL(c.valorMensal)}
            </div>
          )}
        </div>
      ),
    },
    { header: 'Status', valor: (c) => c.status, cell: (c) => <StatusBadge status={c.status} /> },
    {
      header: 'Ações',
      fixa: true,
      className: ui.colActions,
      cell: (c) => (
        <RowActions
          status={c.status}
          onEdit={() => crud.openEdit(c)}
          onSetStatus={(st) => setStatus(c, st)}
        />
      ),
    },
  ]

  const filtroUnidade = (
    <select
      className={ui.filterSelect}
      value={unidadeFiltro}
      onChange={(e) => setUnidadeFiltro(e.target.value)}
    >
      <option value="todos">Todas as empresas</option>
      {unidadesAtivas.map((u) => (
        <option key={u.id} value={u.id}>
          {u.nome}
        </option>
      ))}
    </select>
  )

  return (
    <div>
      <PageHeader
        breadcrumb="Financeiro"
        title="Despesas Fixas (DF)"
        subtitle="Despesas por empresa. As recorrentes formam a despesa fixa (DF) do fator."
        action={
          <>
            <button className={`${ui.btn} ${ui.btnGhost}`} onClick={() => setImportarAberto(true)}>
              <FileSpreadsheet /> Importar planilha
            </button>
            <button className={`${ui.btn} ${ui.btnPrimary}`} onClick={crud.openNew}>
              <Plus /> Nova despesa fixa
            </button>
          </>
        }
      />

      <CrudList
        resumo={resumo}
        id="custos-fixos"
        query={crud.query}
        onQuery={crud.setQuery}
        searchPlaceholder="Buscar por descrição, fornecedor ou centro de custo..."
        columns={columns}
        rows={crud.filtered}
        getKey={(c) => c.id}
        filters={filtroUnidade}
        onStatusLote={async (itens, st) => {
          for (const it of itens) await setStatus(it, st)
        }}
      />

      <CustoFixoFormModal
        open={crud.modalOpen}
        initial={crud.editing}
        error={saveError}
        onClose={() => {
          setSaveError(null)
          crud.close()
        }}
        onSave={save}
      />

      <ImportarCustosModal open={importarAberto} onClose={() => setImportarAberto(false)} />
    </div>
  )
}

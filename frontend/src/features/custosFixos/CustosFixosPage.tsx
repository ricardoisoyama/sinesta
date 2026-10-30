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
import { LARGURA } from '@/features/common/grid'
import { formatBRL, formatPct } from '@/lib/format'
import { buscaPeloNumero } from '@/lib/texto'
import { nomeUnidade } from '@/features/unidades/mock'
import { usePlanoContas } from '@/features/planoContas/store'
import { useUsuarios } from '@/features/usuarios/store'
import { useCustosFixosQuery, useEmpresasQuery } from '@/features/cadastros/hooks'
import {
  createCustoFixo,
  updateCustoFixo,
  gerarLancamentosDaDespesa,
  lancamentosDaDespesa,
  listCategoriasCusto,
  listFornecedores,
} from '@/features/cadastros/api'
import { getErrorMessage } from '@/lib/api'
import { avisar, confirmar } from '@/features/common/dialogo/dialogo'
import { mockCustosFixos } from './mock'
import { entraNaDf, percentualDaEmpresa, rateada, valorDaEmpresa } from './regras'
import { CustoFixoFormModal } from './CustoFixoFormModal'
import { ImportarCustosModal } from './ImportarCustosModal'
import type { CustoFixo } from './types'
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

  // A busca olha o número, a descrição, o centro de custo e quem cobra (fornecedor ou funcionário).
  const searchFn = useCallback(
    (c: CustoFixo, q: string) =>
      (unidadeFiltro === 'todos' || percentualDaEmpresa(c, unidadeFiltro) > 0) &&
      (buscaPeloNumero(q, c.numero) ||
      [c.descricao, categoriasData?.find((cat) => cat.id === c.categoriaId)?.nome ?? '', nomeFornecedor(c.fornecedorId)]
        .some((t) => t.toLowerCase().includes(q))),
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

  /** O que nos lançamentos depende da despesa: mudou algum, pergunta se atualiza os em aberto. */
  const mexeNosLancamentos = (a: CustoFixo, b: CustoFixoForm) =>
    a.valorMensal !== b.valorMensal || (a.diaVencimento ?? 0) !== b.diaVencimento || (a.carteiraId ?? '') !== b.carteiraId ||
    (a.planoContaId ?? '') !== b.planoContaId || a.categoriaId !== b.categoriaId || a.fornecedorId !== b.fornecedorId ||
    a.descricao !== b.descricao || a.dataInicio !== b.dataInicio || a.dataFim !== b.dataFim

  /** Depois de gravar: cria os meses que faltam e, se a pessoa quiser, atualiza os em aberto. Conta o que fez. */
  const alinharLancamentos = async (salvo: CustoFixo, antes: CustoFixo | null, form: CustoFixoForm) => {
    if (salvo.tipo !== 'recorrente') return
    let atualizar = false
    if (antes && mexeNosLancamentos(antes, form)) {
      const { emAberto } = await lancamentosDaDespesa(salvo.id)
      if (emAberto > 0)
        atualizar = await confirmar({
          titulo: 'Atualizar os lançamentos em aberto?',
          mensagem: `Esta despesa tem ${emAberto} lançamento(s) a pagar em aberto nas Entradas e Saídas. Atualizar os que vencem de hoje em diante com os dados novos? Os já pagos não mudam; os que mudarem de valor voltam para aprovação.`,
          confirmar: 'Atualizar',
          cancelar: 'Manter como estão',
        })
    }
    const r = await gerarLancamentosDaDespesa(salvo.id, atualizar)
    const feito = [
      r.criados && `${r.criados} lançamento(s) a pagar criado(s) (pendentes de aprovação)`,
      r.atualizados && `${r.atualizados} atualizado(s)`,
      r.cancelados && `${r.cancelados} cancelado(s)`,
    ].filter(Boolean)
    const jaLancados = r.jaLancados?.length
      ? `\n\nNão criados porque já estavam lançados à mão (o mesmo pagamento não entra duas vezes):\n${r.jaLancados.map((j) => `• ${j}`).join('\n')}`
      : ''
    if (feito.length || jaLancados)
      void avisar({ titulo: 'Lançamentos da despesa', mensagem: `${feito.length ? `${feito.join(' · ')}. Veja em Financeiro › Entradas e Saídas.` : 'Nenhum lançamento novo.'}${jaLancados}` })
    else if (r.motivo && !antes) void avisar({ titulo: 'Despesa salva', mensagem: r.motivo })
  }

  const save = async (form: CustoFixoForm) => {
    setSaveError(null)
    const antes = crud.editing ? (crud.items.find((c) => c.id === crud.editing!.id) ?? null) : null
    let salvo: CustoFixo
    try {
      if (crud.editing) {
        salvo = await updateCustoFixo({ ...form, id: crud.editing.id })
        crud.update(salvo.id, salvo)
      } else {
        salvo = await createCustoFixo({ ...form, id: '' })
        crud.add(salvo)
      }
    } catch (err) {
      setSaveError(getErrorMessage(err))
      return
    }
    invalidate()
    crud.close()
    try {
      await alinharLancamentos(salvo, antes, form)
    } catch (err) {
      void avisar({ titulo: 'A despesa foi salva, mas os lançamentos não', mensagem: getErrorMessage(err) })
    }
  }

  const setStatus = async (c: CustoFixo, status: 'ativo' | 'inativo') => {
    try {
      const upd = await updateCustoFixo({ ...c, status })
      crud.update(upd.id, upd)
      // Inativar cancela os lançamentos em aberto que ainda não venceram; reativar cria os que faltam.
      if (upd.tipo === 'recorrente') {
        const r = await gerarLancamentosDaDespesa(upd.id, false)
        if (r.cancelados || r.criados)
          void avisar({ titulo: 'Lançamentos da despesa', mensagem: r.cancelados ? `${r.cancelados} lançamento(s) em aberto cancelado(s).` : `${r.criados} lançamento(s) a pagar criado(s).` })
      }
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
      header: 'Nº',
      fixa: true,
      largura: LARGURA.numero,
      valor: (c) => c.numero ?? 0,
      cell: (c) => <span className={s.numero}>{c.numero || '—'}</span>,
    },
    {
      header: 'Descrição',
      fixa: true,
      valor: (c) => `${c.descricao} ${nomeFornecedor(c.fornecedorId)}`,
      cell: (c) => (
        <div className={ui.rowName} title={[c.descricao, nomeFornecedor(c.fornecedorId)].filter(Boolean).join(' · ')}>
          <span className={ui.avatarSm}>
            <Wallet size={15} />
          </span>
          <div className={s.descricaoCel}>
            <span className={`${ui.cellStrong} ${ui.umaLinha}`}>{c.descricao}</span>
            {nomeFornecedor(c.fornecedorId) && (
              <span className={`${ui.cellMut} ${ui.umaLinha}`}>{nomeFornecedor(c.fornecedorId)}</span>
            )}
          </div>
        </div>
      ),
    },
    {
      header: 'Empresa que paga',
      largura: LARGURA.longa,
      valor: (c) => nomeEmpresa(c.unidadeId) + (rateada(c) ? ` (${resumoRateio(c)})` : ''),
      cell: (c) => (
        <div className={s.empresaCel} title={nomeEmpresa(c.unidadeId) + (rateada(c) ? ` · ${resumoRateio(c)}` : '')}>
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
    {
      header: 'Centro de custo',
      largura: LARGURA.etiqueta,
      valor: (c) => nomeCategoria(c.categoriaId),
      cell: (c) => <span className={s.catTag} title={nomeCategoria(c.categoriaId)}>{nomeCategoria(c.categoriaId)}</span>,
    },
    {
      header: 'Tipo',
      largura: LARGURA.status + 30,
      valor: (c) => (c.tipo === 'spot' ? 'Spot' : 'Recorrente'),
      // A vigência (início e término) fica no cadastro; aqui só o tipo e o aviso de fora da DF.
      cell: (c) => (
        <div>
          <span className={`${s.tipoTag} ${c.tipo === 'spot' ? s.tipoSpot : ''}`}>
            {c.tipo === 'spot' ? 'Spot' : 'Recorrente'}
          </span>
          {c.status === 'ativo' && !entraNaDf(c) && <div className={s.foraDf}>fora da DF</div>}
        </div>
      ),
    },
    {
      header: 'Plano de contas',
      largura: LARGURA.longa,
      valor: (c) => (c.planoContaId ? nomePlanoConta(c.planoContaId) : ''),
      cell: (c) => (
        <span className={`${ui.cellMut} ${ui.umaLinha}`} title={c.planoContaId ? nomePlanoConta(c.planoContaId) : undefined}>
          {c.planoContaId ? nomePlanoConta(c.planoContaId) : '—'}
        </span>
      ),
    },
    {
      header: 'Vencimento',
      largura: LARGURA.curta,
      valor: (c) => (c.diaVencimento ? `dia ${c.diaVencimento}` : ''),
      cell: (c) => <span className={ui.cellMut}>{c.diaVencimento ? `dia ${c.diaVencimento}` : '—'}</span>,
    },
    {
      header: todas ? 'Valor mensal' : 'Valor desta empresa',
      className: ui.right,
      largura: LARGURA.valor,
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
    { header: 'Status', largura: LARGURA.status, valor: (c) => c.status, cell: (c) => <StatusBadge status={c.status} /> },
    {
      header: 'Ações',
      fixa: true,
      largura: LARGURA.acoes,
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
        searchPlaceholder="Buscar por nº, descrição, fornecedor ou centro de custo..."
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

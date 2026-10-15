import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Search, ChevronLeft, ChevronRight, Filter, Columns3, EyeOff, Download, Ban, CheckCircle2, X } from 'lucide-react'
import ui from './ui.module.css'
import { DataTable, type Column } from './DataTable'
import { colunaId, filtrarPorColunas, gravarOcultas, LARGURA, lerOcultas, listaTemStatus, semInativos } from './grid'
import { exportarXlsx } from './exportar'
import { getErrorMessage } from '@/lib/api'
import { avisar, confirmar } from '@/features/common/dialogo/dialogo'

const COL_SELECAO = '__selecao'
const COL_RASTRO = 'Rastro'

/** Campos de rastro que o servidor grava em todo cadastro (quem/quando). */
interface Rastro {
  criadoEm?: string
  criadoPor?: string
  alteradoEm?: string
  alteradoPor?: string
  inativadoEm?: string
  inativadoPor?: string
}
const temRastro = (rows: unknown[]) =>
  rows.some((r) => typeof r === 'object' && r !== null && ('alteradoEm' in r || 'criadoEm' in r))
const quando = (iso?: string) => {
  if (!iso) return ''
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })
}

/** Coluna automática "Rastro": última alteração na célula; criação e inativação no tooltip. */
function colunaRastro<T>(): Column<T> {
  return {
    id: COL_RASTRO,
    header: 'Rastro',
    valor: (row) => {
      const r = row as Rastro
      return `${r.alteradoPor ?? ''} ${r.criadoPor ?? ''} ${r.inativadoPor ?? ''}`
    },
    cell: (row) => {
      const r = row as Rastro
      if (!r.alteradoEm && !r.criadoEm) return <span className={ui.cellMut}>—</span>
      const linhas = [
        r.criadoEm ? `Criado em ${quando(r.criadoEm)} por ${r.criadoPor || '—'}` : '',
        r.alteradoEm ? `Alterado em ${quando(r.alteradoEm)} por ${r.alteradoPor || '—'}` : '',
        r.inativadoEm ? `Inativado em ${quando(r.inativadoEm)} por ${r.inativadoPor || '—'}` : '',
      ].filter(Boolean)
      return (
        <span className={ui.cellMut} title={linhas.join('\n')} style={{ whiteSpace: 'nowrap' }}>
          {r.inativadoEm ? `Inativado ${quando(r.inativadoEm)}` : `${quando(r.alteradoEm || r.criadoEm)}`}
          {(r.inativadoEm ? r.inativadoPor : r.alteradoPor || r.criadoPor) ? ` · ${r.inativadoEm ? r.inativadoPor : r.alteradoPor || r.criadoPor}` : ''}
        </span>
      )
    },
  }
}

/** Contexto entregue às ações em lote da tela (ex.: transferir carteira). */
export interface LoteContexto<T> {
  ids: string[]
  itens: T[]
  /** Desmarca tudo (chamar depois da ação). */
  limpar: () => void
}

interface CrudListProps<T> {
  /** Identifica o grid para lembrar as colunas escolhidas (ex.: "clientes") e nomear a planilha exportada. */
  id?: string
  query: string
  onQuery: (v: string) => void
  searchPlaceholder: string
  columns: Column<T>[]
  /** Todas as linhas já filtradas pela busca; a paginação é feita aqui. */
  rows: T[]
  getKey: (row: T) => string
  empty?: string
  /** Filtros extras renderizados na toolbar (ex.: combo de unidade). */
  filters?: ReactNode
  pageSize?: number
  /** Rótulo do contador (singular/plural). Padrão: registro(s). */
  rotulo?: [string, string]
  /** Clique na linha (ex.: abrir o detalhe). */
  onRowClick?: (row: T) => void
  /** Inativar/reativar em lote (aparece na barra de seleção quando informado). */
  onStatusLote?: (itens: T[], status: 'ativo' | 'inativo') => Promise<void>
  /** Ações em lote específicas da tela, renderizadas na barra de seleção. */
  acoesLote?: (ctx: LoteContexto<T>) => ReactNode
  /**
   * Resumo acima do grid (cards de totais) calculado sobre as linhas visíveis: depois da
   * busca, dos filtros por coluna e de mostrar/esconder inativos. Assim os totais batem
   * com o que está na lista.
   */
  resumo?: (visiveis: T[]) => ReactNode
}

/**
 * Lista padrão dos cadastros: busca, filtro por coluna, escolha de colunas,
 * inativos escondidos por padrão, paginação, seleção múltipla (atravessa páginas e
 * filtros) com exportar/inativar/reativar em lote. Vale para todas as telas com grid.
 */
export function CrudList<T>({
  id,
  query,
  onQuery,
  searchPlaceholder,
  columns,
  rows,
  getKey,
  empty,
  filters,
  pageSize = 8,
  rotulo = ['registro', 'registros'],
  onRowClick,
  onStatusLote,
  acoesLote,
  resumo,
}: CrudListProps<T>) {
  const [page, setPage] = useState(1)
  const [mostrarFiltros, setMostrarFiltros] = useState(false)
  const [filtros, setFiltros] = useState<Record<string, string>>({})
  const [mostrarInativos, setMostrarInativos] = useState(false)
  const [ocultas, setOcultas] = useState<Set<string>>(() => lerOcultas(id))
  // Seleção por chave: sobrevive a paginação, busca e filtros.
  const [selecao, setSelecao] = useState<Set<string>>(() => new Set())
  const [loteBusy, setLoteBusy] = useState(false)
  const ultimoClique = useRef<string | null>(null)

  const temStatus = listaTemStatus(rows)
  // Coluna "Rastro" entra sozinha quando o servidor manda quem/quando (antes de "Ações", se houver).
  const colunasBase = temRastro(rows)
    ? (() => {
        const idx = columns.findIndex((c) => c.header === 'Ações')
        // Rastro é secundário: fica no fim (antes das ações), na parte que rola.
        const rastro = { ...colunaRastro<T>(), largura: LARGURA.rastro }
        return idx >= 0 ? [...columns.slice(0, idx), rastro, ...columns.slice(idx)] : [...columns, rastro]
      })()
    : columns
  const visiveis = colunasBase.filter((c, i) => !ocultas.has(colunaId(c, i)))

  let lista = temStatus && !mostrarInativos ? semInativos(rows) : rows
  lista = filtrarPorColunas(lista, visiveis, filtros)
  const inativosEscondidos = temStatus && !mostrarInativos ? rows.length - semInativos(rows).length : 0

  const count = lista.length
  const totalPages = Math.max(1, Math.ceil(count / pageSize))
  const current = Math.min(page, totalPages)
  const paged = lista.slice((current - 1) * pageSize, current * pageSize)

  // Selecionados = tudo que foi marcado e ainda existe na lista completa (não só a página).
  const selecionados = rows.filter((r) => selecao.has(getKey(r)))
  const chavesVisiveis = lista.map(getKey)
  const visiveisMarcadas = chavesVisiveis.filter((k) => selecao.has(k)).length
  const todasVisiveis = chavesVisiveis.length > 0 && visiveisMarcadas === chavesVisiveis.length
  const algumasVisiveis = visiveisMarcadas > 0 && !todasVisiveis

  const limparSelecao = () => setSelecao(new Set())

  // Esc limpa a seleção.
  useEffect(() => {
    if (selecionados.length === 0) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') limparSelecao()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selecionados.length])

  const alternarTodas = () => {
    setSelecao((prev) => {
      const next = new Set(prev)
      if (todasVisiveis) chavesVisiveis.forEach((k) => next.delete(k))
      else chavesVisiveis.forEach((k) => next.add(k))
      return next
    })
  }

  const alternarLinha = (row: T, shift: boolean) => {
    const k = getKey(row)
    setSelecao((prev) => {
      const next = new Set(prev)
      const marcar = !prev.has(k)
      // Shift + clique: marca/desmarca o intervalo entre o último clique e este (na ordem da lista).
      const a = chavesVisiveis.indexOf(k)
      const b = ultimoClique.current ? chavesVisiveis.indexOf(ultimoClique.current) : -1
      if (shift && a >= 0 && b >= 0) {
        for (let i = Math.min(a, b); i <= Math.max(a, b); i++) {
          if (marcar) next.add(chavesVisiveis[i])
          else next.delete(chavesVisiveis[i])
        }
      } else if (marcar) next.add(k)
      else next.delete(k)
      return next
    })
    ultimoClique.current = k
  }

  const exportar = async (itens: T[]) => {
    try {
      await exportarXlsx(id ?? 'lista', visiveis, itens)
    } catch (err) {
      void avisar({ titulo: 'Não foi possível concluir', mensagem: getErrorMessage(err) })
    }
  }

  const statusLote = async (status: 'ativo' | 'inativo') => {
    if (!onStatusLote) return
    const alvo = selecionados.filter((r) => (r as { status?: string }).status !== status)
    if (alvo.length === 0) return
    const verbo = status === 'inativo' ? 'Inativar' : 'Reativar'
    const ok = await confirmar({
      titulo: `${verbo} ${rotulo[1]}`,
      mensagem: `${verbo} ${alvo.length} ${alvo.length === 1 ? rotulo[0] : rotulo[1]}?`,
      confirmar: verbo,
      perigo: status === 'inativo',
    })
    if (!ok) return
    setLoteBusy(true)
    try {
      await onStatusLote(alvo, status)
      limparSelecao()
    } finally {
      setLoteBusy(false)
    }
  }

  const colunaSelecao: Column<T> = {
    id: COL_SELECAO,
    fixa: true,
    // Todo grid de cadastro segue o padrão de larguras travadas (ver LARGURA).
    largura: LARGURA.selecao,
    className: ui.selCol,
    header: (
      <input
        type="checkbox"
        className={ui.selCk}
        aria-label="Selecionar todos os registros filtrados"
        title={todasVisiveis ? 'Desmarcar todos' : `Selecionar todos (${count})`}
        checked={todasVisiveis}
        ref={(el) => {
          if (el) el.indeterminate = algumasVisiveis
        }}
        onChange={alternarTodas}
      />
    ),
    cell: (row) => (
      <input
        type="checkbox"
        className={ui.selCk}
        aria-label="Selecionar"
        checked={selecao.has(getKey(row))}
        onClick={(e) => {
          e.stopPropagation()
          alternarLinha(row, e.shiftKey)
        }}
        onChange={() => undefined}
      />
    ),
  }

  const setFiltro = (colId: string, valor: string) => {
    setFiltros((f) => ({ ...f, [colId]: valor }))
    setPage(1)
  }
  const limparFiltros = () => {
    setFiltros({})
    setPage(1)
  }
  const alternarColuna = (colId: string) => {
    setOcultas((prev) => {
      const next = new Set(prev)
      if (next.has(colId)) next.delete(colId)
      else next.add(colId)
      gravarOcultas(id, next)
      return next
    })
  }
  const filtrosAtivos = Object.values(filtros).filter((v) => v.trim()).length
  const n = selecionados.length
  const podeInativar = !!onStatusLote && selecionados.some((r) => (r as { status?: string }).status === 'ativo')
  const podeReativar = !!onStatusLote && selecionados.some((r) => (r as { status?: string }).status === 'inativo')

  return (
    <>
      {resumo?.(lista)}
      <div className={ui.card}>
      {n > 0 ? (
        <div className={ui.selBar} role="region" aria-label="Ações em lote">
          <b>
            {n} {n === 1 ? 'selecionado' : 'selecionados'}
          </b>
          {n !== visiveisMarcadas && <span className={ui.selNota}>({n - visiveisMarcadas} fora do filtro atual)</span>}
          <button type="button" className={ui.selBtn} onClick={() => exportar(selecionados)} title="Exportar os selecionados para planilha">
            <Download /> Exportar
          </button>
          {podeInativar && (
            <button type="button" className={`${ui.selBtn} ${ui.selBtnWarn}`} disabled={loteBusy} onClick={() => statusLote('inativo')}>
              <Ban /> Inativar
            </button>
          )}
          {podeReativar && (
            <button type="button" className={ui.selBtn} disabled={loteBusy} onClick={() => statusLote('ativo')}>
              <CheckCircle2 /> Reativar
            </button>
          )}
          {acoesLote?.({ ids: selecionados.map(getKey), itens: selecionados, limpar: limparSelecao })}
          <button type="button" className={ui.selLimpar} onClick={limparSelecao} title="Limpar seleção (Esc)">
            <X /> Limpar seleção
          </button>
        </div>
      ) : (
        <div className={ui.toolbar}>
          <div className={ui.search}>
            <Search />
            <input
              value={query}
              onChange={(e) => {
                onQuery(e.target.value)
                setPage(1)
              }}
              placeholder={searchPlaceholder}
            />
          </div>
          {filters}

          <button
            type="button"
            className={`${ui.chip} ${mostrarFiltros ? ui.chipOn : ''}`}
            onClick={() => setMostrarFiltros((v) => !v)}
            title="Filtrar por coluna"
          >
            <Filter /> Filtros{filtrosAtivos > 0 && ` (${filtrosAtivos})`}
          </button>

          <details className={ui.colunasDrop}>
            <summary className={ui.chip} title="Escolher as colunas do grid">
              <Columns3 /> Colunas
            </summary>
            <div className={ui.colunasMenu}>
              {colunasBase.map((c, i) => {
                const colId = colunaId(c, i)
                const fixa = c.fixa || typeof c.header !== 'string'
                return (
                  <label key={colId} className={ui.checkItem}>
                    <input
                      type="checkbox"
                      checked={!ocultas.has(colId)}
                      disabled={fixa}
                      onChange={() => alternarColuna(colId)}
                    />
                    {typeof c.header === 'string' ? c.header : colId}
                  </label>
                )
              })}
            </div>
          </details>

          {temStatus && (
            <label className={`${ui.chip} ${mostrarInativos ? ui.chipOn : ''}`} title="Inativos ficam escondidos por padrão">
              <input
                type="checkbox"
                className={ui.chipCheck}
                checked={mostrarInativos}
                onChange={(e) => {
                  setMostrarInativos(e.target.checked)
                  setPage(1)
                }}
              />
              <EyeOff /> Mostrar inativos{inativosEscondidos > 0 && ` (${inativosEscondidos})`}
            </label>
          )}

          <button type="button" className={ui.chip} onClick={() => exportar(lista)} title="Exportar a lista filtrada para planilha (.xlsx)" disabled={count === 0}>
            <Download /> Exportar
          </button>

          <div style={{ flex: 1 }} />
          <span className={ui.count}>
            {count} {count === 1 ? rotulo[0] : rotulo[1]}
          </span>
        </div>
      )}

      {mostrarFiltros && filtrosAtivos > 0 && (
        <div className={ui.filtrosBar}>
          <span>{filtrosAtivos} filtro(s) por coluna aplicado(s).</span>
          <button type="button" onClick={limparFiltros}>Limpar filtros</button>
        </div>
      )}

      <DataTable
        columns={[colunaSelecao, ...visiveis]}
        rows={paged}
        getKey={getKey}
        empty={empty}
        mostrarFiltros={mostrarFiltros}
        filtros={filtros}
        onFiltro={setFiltro}
        onRowClick={onRowClick}
        rowClassName={(r) => (selecao.has(getKey(r)) ? ui.rowSel : undefined)}
      />

      <div className={ui.pager}>
        <span>Mostrando {paged.length} de {count}</span>
        <div className={ui.pages}>
          <button disabled={current <= 1} onClick={() => setPage(current - 1)}><ChevronLeft size={15} /></button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button key={p} className={p === current ? ui.active : ''} onClick={() => setPage(p)}>{p}</button>
          ))}
          <button disabled={current >= totalPages} onClick={() => setPage(current + 1)}><ChevronRight size={15} /></button>
        </div>
      </div>
      </div>
    </>
  )
}

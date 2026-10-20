import { useEffect, useState, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, ArrowDownLeft, ArrowLeftRight, ArrowUpRight, Ban, CheckCircle2, Clock, Landmark, Pencil, Plus, RotateCcw, ShieldCheck, Wallet } from 'lucide-react'
import { getErrorMessage } from '@/lib/api'
import { avisar, confirmar } from '@/features/common/dialogo/dialogo'
import { useAuth } from '@/features/auth/auth-context'
import { useUsuarios } from '@/features/usuarios/store'
import { listRegrasAprovacao } from '@/features/cadastros/api'
import { useEmpresasQuery } from '@/features/cadastros/hooks'
import { empresaPadrao } from '@/features/unidades/types'
import { AprovacaoModal } from './AprovacaoModal'
import { AgendarPagamentoModal } from './AgendarPagamentoModal'
import { ROTULO_PAGAMENTO, usePagamentos, vigente, type PagamentoBancario } from './pagamentos'
import ui from '@/features/common/ui.module.css'
import { PageHeader } from '@/features/common/PageHeader'
import { CrudList } from '@/features/common/CrudList'
import { Hint } from '@/features/common/Hint'
import type { Column } from '@/features/common/DataTable'
import { LARGURA } from '@/features/common/grid'
import { formatBRL } from '@/lib/format'
import { buscaPeloNumero, semAcento } from '@/lib/texto'
import { diasParaVencer, hojeISO, liquidoDe, primeiroDiaDoMes, resumo, somarDias, statusDe, ultimoDiaDoMes } from './calculos'
import { useFinanceiro } from './store'
import { MovimentoFormModal } from './MovimentoFormModal'
import { BaixaModal } from './BaixaModal'
import { APROVACAO_LABEL, STATUS_MOVIMENTO, type Movimento, type StatusMovimento, type TipoMovimento } from './types'
import s from './financeiro.module.css'

type Aba = 'todos' | TipoMovimento | 'transferencia'
type Janela = 'vencidos' | 'mes' | '30dias' | 'periodo' | 'tudo'
type FiltroAprov = 'todas' | 'pendente' | 'minha' | 'aprovado' | 'reprovado'
const JANELAS: { valor: Janela; label: string }[] = [
  { valor: 'vencidos', label: 'Vencidos' },
  { valor: 'mes', label: 'Este mês' },
  { valor: '30dias', label: 'Próximos 30 dias' },
  { valor: 'periodo', label: 'Período...' },
  { valor: 'tudo', label: 'Tudo' },
]
const ICONE_STATUS: Record<StatusMovimento, typeof Clock> = { aberto: Clock, atrasado: AlertTriangle, liquidado: CheckCircle2, cancelado: Ban }

const dataBR = (iso: string) => (iso ? iso.split('-').reverse().join('/') : '—')

/**
 * Entradas e Saídas: contas a receber e a pagar numa lista só, com situação calculada
 * (em aberto, atrasado, liquidado), baixa individual ou em lote e lançamento parcelado.
 */
export function EntradasSaidasPage() {
  const { carteiras, movimentos: todosMovimentos, adicionar, atualizar, transferir, liquidar, estornar, cancelar, aprovar, reprovar, recarregar } = useFinanceiro()
  // Empresa: cada CNPJ tem os seus lançamentos. Abre na empresa padrão; "Todas" consolida o grupo.
  const { data: empresasData } = useEmpresasQuery()
  const empresas = (empresasData ?? []).filter((e) => e.status === 'ativo')
  const [empresaEscolhida, setEmpresaEscolhida] = useState<string | null>(null)
  const empresaId = empresaEscolhida ?? (empresas.length > 1 ? (empresaPadrao(empresas)?.id ?? '') : '')
  const empresaDe = (m: Movimento) => m.empresaId || carteiras.find((c) => c.id === m.carteiraId)?.empresaId || ''
  const nomeEmpresa = (id: string) => empresas.find((e) => e.id === id)?.nome ?? '—'
  const movimentos = empresaId ? todosMovimentos.filter((m) => empresaDe(m) === empresaId) : todosMovimentos
  const { user } = useAuth()
  const { usuarios } = useUsuarios()
  const meuId = usuarios.find((u) => u.email === user?.email)?.id ?? ''
  const nomeDe = (id: string) => usuarios.find((u) => u.id === id)?.nome ?? ''
  // Aprovar exige a permissão no perfil e estar entre os aprovadores da regra.
  const podeAprovar = !!user?.permissoes?.includes('/financeiro/aprovar')
  // Piloto de pagamentos pelo banco: só a equipe ELROND (permissão administrativa).
  const podePagarBanco = !!user?.permissoes?.includes('/financeiro/pagamento-banco')
  const { data: pagamentosData, refetch: recarregarPagamentos } = usePagamentos(podePagarBanco)
  // Pix que o banco efetivou baixa o lançamento no servidor: relê a lista para a situação acompanhar.
  const pagoSemBaixa = (pagamentosData ?? []).some((p) => p.situacao === 'pago' && todosMovimentos.some((m) => m.id === p.movimentoId && !m.pagoEm))
  useEffect(() => {
    if (pagoSemBaixa) void recarregar()
  }, [pagoSemBaixa]) // eslint-disable-line react-hooks/exhaustive-deps
  // O último envio ao banco deste lançamento (mostra a situação; recusado/cancelado deixa mandar de novo).
  const pagamentoDe = (m: Movimento): PagamentoBancario | undefined =>
    (pagamentosData ?? []).filter((p) => p.movimentoId === m.id).sort((a, b) => b.criadoEm.localeCompare(a.criadoEm))[0]
  const [agendando, setAgendando] = useState<{ ids: string[]; limpar?: () => void } | null>(null)
  const { data: regrasData } = useQuery({ queryKey: ['regras-aprovacao'], queryFn: listRegrasAprovacao })
  const regraDe = (m: Movimento) => (regrasData ?? []).find((r) => r.id === m.regraId && r.status !== 'inativo')
  const [filtroAprov, setFiltroAprov] = useState<FiltroAprov>('todas')
  const [aprovando, setAprovando] = useState<Movimento | null>(null)
  /** Executa no servidor e mostra o motivo quando ele recusa. Devolve true se deu certo. */
  const exec = async (acao: () => Promise<unknown>): Promise<boolean> => {
    try {
      await acao()
      return true
    } catch (err) {
      void avisar({ titulo: 'Não foi possível concluir', mensagem: getErrorMessage(err) })
      return false
    }
  }
  const aguardandoMim = (m: Movimento) =>
    (m.aprovacao ?? 'pendente') === 'pendente' && !!regraDe(m)?.aprovadores.includes(meuId) && !(m.aprovacoes ?? []).some((a) => a.usuarioId === meuId)
  const qtdMinhas = movimentos.filter((m) => !m.cancelado && aguardandoMim(m)).length
  /** Aprova (assina) os lançamentos; parcelas e pernas da transferência andam juntas, então uma por grupo. */
  const aprovarLista = async (itens: Movimento[]): Promise<boolean> => {
    const porGrupo = [...new Map(itens.map((m) => [m.grupoId || m.id, m])).values()]
    const total = porGrupo.reduce((a, m) => a + (m.origem === 'transferencia' && m.tipo === 'receber' ? 0 : m.valor), 0)
    const ok = await confirmar({
      titulo: porGrupo.length === 1 ? 'Aprovar lançamento' : `Aprovar ${porGrupo.length} lançamentos`,
      mensagem: porGrupo.length === 1
        ? `Aprovar nº ${porGrupo[0].numero} · ${porGrupo[0].parceiroNome} · ${formatBRL(porGrupo[0].valor)}${porGrupo[0].totalParcelas > 1 ? ' (vale para todas as parcelas)' : ''}?`
        : `Aprovar ${porGrupo.length} lançamentos, ${formatBRL(total)} no total? Parcelas e transferências vão juntas.`,
      confirmar: 'Aprovar',
      cancelar: 'Voltar',
    })
    if (!ok) return false
    return exec(async () => { for (const m of porGrupo) await aprovar(m.id) })
  }
  const hoje = hojeISO()
  const [aba, setAba] = useState<Aba>('todos')
  const [janela, setJanela] = useState<Janela>('mes')
  const [mostrarLiquidados, setMostrarLiquidados] = useState(false)
  // Período livre (vencimento de/até): começa no mês corrente.
  const [periodo, setPeriodo] = useState(() => ({ de: primeiroDiaDoMes(hojeISO()), ate: ultimoDiaDoMes(hojeISO()) }))
  const [busca, setBusca] = useState('')
  const [editando, setEditando] = useState<Movimento | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [baixando, setBaixando] = useState<{ itens: Movimento[]; limpar?: () => void } | null>(null)

  const r = resumo(movimentos, hoje)
  const carteira = (id: string) => carteiras.find((c) => c.id === id)?.nome ?? '—'

  // Sem useMemo de propósito: o React Compiler memoiza sozinho e a lista é pequena.
  const linhas = (() => {
    const q = semAcento(busca.trim())
    const ini = primeiroDiaDoMes(hoje)
    const fim = ultimoDiaDoMes(hoje)
    const lim30 = somarDias(hoje, 30)
    // Buscou pelo número: mostra o lançamento mesmo fora dos filtros da tela.
    const peloNumero = movimentos.filter((m) => buscaPeloNumero(busca, m.numero))
    if (peloNumero.length > 0) return peloNumero
    return movimentos
      // A transferência entre contas aparece também em A pagar (saída) e A receber (entrada), como nos cards.
      .filter((m) => aba === 'todos' || (aba === 'transferencia' ? m.origem === 'transferencia' : m.tipo === aba))
      .filter((m) => {
        const st = statusDe(m, hoje)
        if (!mostrarLiquidados && (st === 'liquidado' || st === 'cancelado')) return false
        if (janela === 'vencidos') return st === 'atrasado'
        if (janela === 'mes') return m.vencimento >= ini && m.vencimento <= fim
        if (janela === '30dias') return m.vencimento >= hoje && m.vencimento <= lim30
        if (janela === 'periodo') return (!periodo.de || m.vencimento >= periodo.de) && (!periodo.ate || m.vencimento <= periodo.ate)
        return true
      })
      .filter((m) => filtroAprov === 'todas' || (filtroAprov === 'minha' ? aguardandoMim(m) : (m.aprovacao ?? 'pendente') === filtroAprov))
      .filter((m) => !q || semAcento(`${m.parceiroNome} ${m.descricao} ${m.documento}`).includes(q))
      .sort((a, b) => a.vencimento.localeCompare(b.vencimento))
  })()

  const totalLista = linhas.reduce((a, m) => a + (m.tipo === 'receber' ? 1 : -1) * liquidoDe(m), 0)

  const columns: Column<Movimento>[] = [
    {
      header: 'Nº',
      fixa: true,
      largura: LARGURA.numero,
      valor: (m) => m.numero ?? 0,
      cell: (m) => <span className={s.numero}>{m.numero || '—'}</span>,
    },
    {
      header: 'Vencimento',
      fixa: true,
      largura: LARGURA.data,
      valor: (m) => dataBR(m.vencimento),
      cell: (m) => {
        const st = statusDe(m, hoje)
        const dias = diasParaVencer(m, hoje)
        return (
          <div className={s.venc}>
            <span className={ui.cellStrong}>{dataBR(m.vencimento)}</span>
            {st === 'atrasado' && <small className={s.atraso}>{-dias} dia{dias === -1 ? '' : 's'} de atraso</small>}
            {st === 'aberto' && <small>{dias === 0 ? 'vence hoje' : dias === 1 ? 'amanhã' : `em ${dias} dias`}</small>}
            {st === 'liquidado' && <small>pago em {dataBR(m.pagoEm)}</small>}
          </div>
        )
      },
    },
    {
      header: 'Lançamento',
      fixa: true,
      valor: (m) => `${m.parceiroNome} ${m.descricao} ${m.documento}`,
      cell: (m) => (
        <div className={s.descr}>
          <span className={ui.cellStrong}>
            <i className={`${s.tipoDot} ${s[m.tipo]}`} />
            {m.parceiroNome}
            {m.totalParcelas > 1 && <span className={s.parcelaTag}>{m.parcela}/{m.totalParcelas}</span>}
          </span>
          <small>{m.descricao}{m.documento ? ` · ${m.documento}` : ''}</small>
          {m.origem === 'transferencia' && (
            <small className={s.transfTag}><ArrowLeftRight size={11} /> Transferência entre contas · {m.tipo === 'pagar' ? 'saída' : 'entrada'}</small>
          )}
          {(() => {
            const p = pagamentoDe(m)
            return p ? (
              <small className={`${s.pagTag} ${p.situacao === 'pago' ? s.pagTagOk : ['recusado', 'cancelado', 'falha'].includes(p.situacao) ? s.pagTagErro : ''}`} title={p.mensagem || undefined}>
                <Landmark size={11} /> {ROTULO_PAGAMENTO[p.situacao]}{p.situacao === 'pago' && p.emailSituacao ? ` · e-mail ${p.emailSituacao.startsWith('enviado') ? 'enviado' : 'não enviado'}` : ''}
              </small>
            ) : null
          })()}
        </div>
      ),
    },
    {
      header: 'Situação',
      largura: LARGURA.situacao,
      valor: (m) => STATUS_MOVIMENTO[statusDe(m, hoje)],
      cell: (m) => {
        const st = statusDe(m, hoje)
        const Ic = ICONE_STATUS[st]
        return (
          <span className={`${s.status} ${s[st]}`}>
            <Ic /> {STATUS_MOVIMENTO[st]}
          </span>
        )
      },
    },
    {
      header: 'Aprovação',
      largura: LARGURA.etiqueta,
      valor: (m) => APROVACAO_LABEL[m.aprovacao ?? 'pendente'],
      cell: (m) => {
        const ap = m.aprovacao ?? 'pendente'
        const regra = regraDe(m)
        const faltam = regra ? regra.aprovadores.filter((id) => !(m.aprovacoes ?? []).some((a) => a.usuarioId === id)).map(nomeDe) : []
        return (
          <button type="button" className={s.aprovBtn} onClick={(e) => { e.stopPropagation(); setAprovando(m) }} title="Ver aprovadores">
            <span className={`${s.aprov} ${s[`aprov_${ap}`]}`}>{APROVACAO_LABEL[ap]}</span>
            {ap === 'pendente' && (
              <span className={s.aprovSub}>{!regra ? 'sem regra para este valor' : aguardandoMim(m) ? 'aguardando você' : `aguardando ${faltam.join(', ')}`}</span>
            )}
          </button>
        )
      },
    },
    {
      header: 'Valor',
      className: ui.right,
      largura: LARGURA.valor,
      valor: (m) => liquidoDe(m),
      cell: (m) => (
        <span className={`${s.valor} ${m.cancelado ? s.cancelado : s[m.tipo]}`}>
          {m.tipo === 'receber' ? '+' : '−'} {formatBRL(liquidoDe(m))}
        </span>
      ),
    },
    { header: 'Carteira', largura: LARGURA.media, valor: (m) => carteira(m.carteiraId), cell: (m) => <span className={ui.cellMut}>{carteira(m.carteiraId)}</span> },
    // Com "Todas as empresas", cada linha diz de qual CNPJ é.
    ...(!empresaId && empresas.length > 1
      ? [{ header: 'Empresa', largura: LARGURA.media, valor: (m: Movimento) => nomeEmpresa(empresaDe(m)), cell: (m: Movimento) => <span className={ui.cellMut}>{nomeEmpresa(empresaDe(m))}</span> }]
      : []),
    { header: 'Forma', largura: LARGURA.curta, valor: (m) => m.formaPagamento, cell: (m) => <span className={ui.cellMut}>{m.formaPagamento || '—'}</span> },
    {
      header: 'Ações',
      fixa: true,
      largura: podeAprovar ? 132 : LARGURA.acoes,
      className: ui.colActions,
      cell: (m) => {
        const st = statusDe(m, hoje)
        const aprovado = (m.aprovacao ?? 'pendente') === 'aprovado'
        return (
          <>
            {podeAprovar && aguardandoMim(m) && st !== 'cancelado' && (
              <button className={`${ui.iconBtn} ${s.aprovarBtn}`} title="Aprovar (assina o lançamento e as parcelas dele)" onClick={(e) => { e.stopPropagation(); void aprovarLista([m]) }}>
                <ShieldCheck />
              </button>
            )}
            {(st === 'aberto' || st === 'atrasado') && (
              <button className={ui.iconBtn} title={aprovado ? 'Liquidar' : 'Só lançamento aprovado pode ser baixado'} disabled={!aprovado} onClick={(e) => { e.stopPropagation(); setBaixando({ itens: [m] }) }}>
                <CheckCircle2 />
              </button>
            )}
            {st === 'liquidado' && (
              <button
                className={ui.iconBtn}
                title="Estornar (volta para em aberto)"
                onClick={async (e) => {
                  e.stopPropagation()
                  const ok = await confirmar({ titulo: 'Estornar baixa', mensagem: 'Estornar a baixa deste lançamento?', confirmar: 'Estornar', perigo: true })
                  if (ok) exec(() => estornar(m.id))
                }}
              >
                <RotateCcw />
              </button>
            )}
            {st !== 'cancelado' && (
              <button className={ui.iconBtn} title="Editar" onClick={(e) => { e.stopPropagation(); setEditando(m); setFormOpen(true) }}>
                <Pencil />
              </button>
            )}
          </>
        )
      },
    },
  ]

  const kpi = (cls: string, on: boolean, label: ReactNode, valor: string, sub: string, onClick: () => void) => (
    <button type="button" className={`${s.kpi} ${on ? s.kpiOn : ''}`} onClick={onClick}>
      <div className={s.kpiLabel}>{label}</div>
      <div className={`${s.kpiVal} ${cls}`}>{valor}</div>
      <div className={s.kpiSub}>{sub}</div>
    </button>
  )

  return (
    <div>
      <PageHeader
        breadcrumb="Financeiro"
        title="Entradas e Saídas"
        subtitle="O que há para receber e pagar, com baixa individual ou em lote. A situação é calculada pelo vencimento."
        action={
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {empresas.length > 1 && (
              <select className={s.empresaSel} value={empresaId} onChange={(e) => setEmpresaEscolhida(e.target.value)} aria-label="Empresa">
                <option value="">Todas as empresas</option>
                {empresas.map((e) => (
                  <option key={e.id} value={e.id}>{e.nome}</option>
                ))}
              </select>
            )}
            <Hint text={'Todo lançamento nasce pendente de aprovação e só pode ser baixado depois de aprovado. Quem aprova e em que faixa de valor fica em Parametrizações › Aprovadores e Regras (tipo "Lançamentos financeiros").'} />
            <button className={`${ui.btn} ${ui.btnPrimary}`} onClick={() => { setEditando(null); setFormOpen(true) }}>
              <Plus /> Novo lançamento
            </button>
          </div>
        }
      />

      <div className={s.kpis}>
        {kpi(s.entrada, aba === 'receber' && janela === 'tudo', <><ArrowDownLeft /> A receber</>, formatBRL(r.aReceber), 'em aberto, todas as datas', () => { setAba('receber'); setJanela('tudo') })}
        {kpi(s.saida, aba === 'pagar' && janela === 'tudo', <><ArrowUpRight /> A pagar</>, formatBRL(r.aPagar), 'em aberto, todas as datas', () => { setAba('pagar'); setJanela('tudo') })}
        {kpi(r.qtdVencidos ? s.alerta : '', janela === 'vencidos', <><AlertTriangle /> Vencidos</>, formatBRL(r.vencidos), `${r.qtdVencidos} lançamento${r.qtdVencidos === 1 ? '' : 's'} atrasado${r.qtdVencidos === 1 ? '' : 's'}`, () => { setAba('todos'); setJanela('vencidos') })}
        {kpi(r.previsto30 >= 0 ? s.entrada : s.saida, aba === 'todos' && janela === '30dias', <><Wallet /> Próximos 30 dias</>, `${r.previsto30 >= 0 ? '+' : '−'} ${formatBRL(Math.abs(r.previsto30))}`, 'entradas menos saídas previstas', () => { setAba('todos'); setJanela('30dias') })}
      </div>

      <CrudList
        id="financeiro-entradas-saidas"
        query={busca}
        onQuery={setBusca}
        searchPlaceholder="Buscar por nº, nome, descrição ou documento..."
        columns={columns}
        rows={linhas}
        getKey={(m) => m.id}
        rotulo={['lançamento', 'lançamentos']}
        pageSize={12}
        onAtualizar={() => Promise.all([recarregar(), podePagarBanco ? recarregarPagamentos() : null])}
        // Clicar na linha abre o lançamento (com os documentos anexados).
        onRowClick={(m) => {
          if (m.cancelado) return
          setEditando(m)
          setFormOpen(true)
        }}
        empty="Nenhum lançamento neste recorte."
        filters={
          <>
            <div className={s.segmento}>
              <button className={aba === 'todos' ? s.on : ''} onClick={() => setAba('todos')}>Todos</button>
              <button className={aba === 'receber' ? `${s.on} ${s.onReceber}` : ''} onClick={() => setAba('receber')}>A receber</button>
              <button className={aba === 'pagar' ? `${s.on} ${s.onPagar}` : ''} onClick={() => setAba('pagar')}>A pagar</button>
              <button className={aba === 'transferencia' ? `${s.on} ${s.onTransferencia}` : ''} onClick={() => setAba('transferencia')}>Transferências</button>
              {/* Vencidos liga e desliga sobre a aba escolhida (ex.: só os a pagar vencidos). */}
              <button className={janela === 'vencidos' ? `${s.on} ${s.onVencido}` : ''} onClick={() => setJanela(janela === 'vencidos' ? 'mes' : 'vencidos')}>
                Vencidos
              </button>
            </div>
            <select className={ui.filterSelect} value={janela} onChange={(e) => setJanela(e.target.value as Janela)} aria-label="Período (vencimento)">
              {JANELAS.map((j) => (
                <option key={j.valor} value={j.valor}>{j.label}</option>
              ))}
            </select>
            {janela === 'periodo' && (
              <span className={s.periodo}>
                <input type="date" value={periodo.de} max={periodo.ate || undefined} onChange={(e) => setPeriodo({ ...periodo, de: e.target.value })} aria-label="Vencimento de" />
                a
                <input type="date" value={periodo.ate} min={periodo.de || undefined} onChange={(e) => setPeriodo({ ...periodo, ate: e.target.value })} aria-label="Vencimento até" />
              </span>
            )}
            <label className={`${ui.chip} ${mostrarLiquidados ? ui.chipOn : ''}`} title="Liquidados e cancelados ficam escondidos por padrão">
              <input type="checkbox" className={ui.chipCheck} checked={mostrarLiquidados} onChange={(e) => setMostrarLiquidados(e.target.checked)} />
              <CheckCircle2 /> Mostrar liquidados
            </label>
            <select className={ui.filterSelect} value={filtroAprov} onChange={(e) => setFiltroAprov(e.target.value as FiltroAprov)} title="Filtrar pela aprovação">
              <option value="todas">Aprovação: todas</option>
              <option value="minha">Aguardando minha aprovação{qtdMinhas ? ` (${qtdMinhas})` : ''}</option>
              <option value="pendente">Pendentes</option>
              <option value="aprovado">Aprovados</option>
              <option value="reprovado">Reprovados</option>
            </select>
            <span className={ui.count} title="Entradas menos saídas do que está na lista">
              saldo da lista: <b className={totalLista >= 0 ? s.entrada : s.saida}>{totalLista >= 0 ? '+' : '−'} {formatBRL(Math.abs(totalLista))}</b>
            </span>
          </>
        }
        acoesLote={({ itens, limpar }) => {
          const abertos = itens.filter((m) => !m.pagoEm && !m.cancelado)
          const baixaveis = abertos.filter((m) => m.aprovacao === 'aprovado')
          const pagaveis = baixaveis.filter((m) => m.tipo === 'pagar' && !(pagamentoDe(m) && vigente(pagamentoDe(m)!)))
          const aprovaveis = abertos.filter(aguardandoMim)
          return (
            <>
              {podeAprovar && (
                <button
                  type="button"
                  className={ui.selBtn}
                  disabled={aprovaveis.length === 0}
                  onClick={async () => { if (await aprovarLista(aprovaveis)) limpar() }}
                  title={aprovaveis.length < abertos.length ? 'Entram só os que aguardam a sua assinatura' : 'Aprovar os selecionados'}
                >
                  <ShieldCheck /> Aprovar ({aprovaveis.length})
                </button>
              )}
              {podePagarBanco && (
                <button
                  type="button"
                  className={ui.selBtn}
                  disabled={pagaveis.length === 0}
                  onClick={() => setAgendando({ ids: pagaveis.map((m) => m.id), limpar })}
                  title={pagaveis.length < itens.length ? 'Vão ao banco só os lançamentos a pagar, aprovados e sem Pix em andamento' : 'Mandar ao banco como Pix'}
                >
                  <Landmark /> Agendar pagamento ({pagaveis.length})
                </button>
              )}
              <button type="button" className={ui.selBtn} disabled={baixaveis.length === 0} onClick={() => setBaixando({ itens: baixaveis, limpar })} title={baixaveis.length < abertos.length ? 'Só os aprovados entram na baixa' : 'Liquidar todos os selecionados em aberto'}>
                <CheckCircle2 /> Baixar em lote ({baixaveis.length})
              </button>
              <button
                type="button"
                className={`${ui.selBtn} ${ui.selBtnWarn}`}
                disabled={abertos.length === 0}
                onClick={async () => {
                  const ok = await confirmar({
                    titulo: 'Cancelar lançamentos',
                    mensagem: `Cancelar ${abertos.length} lançamento(s)? Eles ficam no histórico como cancelados.`,
                    confirmar: 'Cancelar lançamentos',
                    cancelar: 'Voltar',
                    perigo: true,
                  })
                  if (ok && (await exec(() => cancelar(abertos.map((m) => m.id))))) limpar()
                }}
              >
                <Ban /> Cancelar
              </button>
            </>
          )
        }}
      />

      <MovimentoFormModal
        open={formOpen}
        initial={editando}
        carteiras={carteiras}
        onClose={() => setFormOpen(false)}
        onSave={async (mov, parcelas, periodicidade) => {
          let gravados: Movimento[] = []
          const ok = await exec(async () => {
            if (editando) gravados = [await atualizar(mov)]
            else gravados = await adicionar(mov, parcelas, periodicidade)
          })
          if (ok) setFormOpen(false)
          return ok ? gravados : null
        }}
        onTransferir={async (dados) => {
          let pernas: Movimento[] = []
          const ok = await exec(async () => { pernas = await transferir(dados) })
          if (ok) setFormOpen(false)
          return ok ? pernas : null
        }}
      />
      <BaixaModal
        open={!!baixando}
        movimentos={baixando?.itens ?? []}
        carteiras={carteiras}
        onClose={() => setBaixando(null)}
        onConfirmar={async (b) => {
          if (baixando && !(await exec(() => liquidar(baixando.itens.map((m) => m.id), b)))) return
          baixando?.limpar?.()
          setBaixando(null)
        }}
      />
      {agendando && (
        <AgendarPagamentoModal
          movimentoIds={agendando.ids}
          onClose={() => {
            agendando.limpar?.()
            setAgendando(null)
          }}
          onFeito={() => void recarregarPagamentos()}
        />
      )}
      <AprovacaoModal
        movimento={aprovando ? (movimentos.find((m) => m.id === aprovando.id) ?? aprovando) : null}
        regra={aprovando ? regraDe(movimentos.find((m) => m.id === aprovando.id) ?? aprovando) : undefined}
        nomeDe={nomeDe}
        meuId={meuId}
        podeAprovar={podeAprovar}
        onClose={() => setAprovando(null)}
        onAprovar={async (m) => { await exec(() => aprovar(m.id)) }}
        onReprovar={async (m, motivo) => { if (await exec(() => reprovar(m.id, motivo))) setAprovando(null) }}
      />
    </div>
  )
}

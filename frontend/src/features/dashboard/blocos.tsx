/* eslint-disable react-refresh/only-export-components -- o catálogo (BLOCOS) e os blocos ficam juntos */
import type { ReactNode } from 'react'
import { vencido } from '@/features/financeiro/diasUteis'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowRight,
  BarChart3,
  Calculator,
  CalendarDays,
  ChartColumnDecreasing,
  ClipboardCheck,
  FileText,
  Gauge,
  LayoutGrid,
  PieChart as PieIcon,
  Route,
  Scale,
  Target,
  TrendingUp,
  Wallet,
} from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import c from '@/features/common/charts.module.css'
import { apiFetch } from '@/lib/api'
import { formatBRL, formatPct } from '@/lib/format'
import { nomeUnidade } from '@/features/unidades/mock'
import { usePropostas } from '@/features/propostas/store'
import { useMetas } from '@/features/metas/store'
import { useFatorEmpresa } from '@/features/pricing/usePreco'
import { receitaEquilibrio } from '@/features/pricing/engine'
import { mesesDaMeta, mesesMeta } from '@/features/metas/mock'
import { metaDoAno, realizadoPorMes } from '@/features/metas/realizado'
import { useFinanceiro } from '@/features/financeiro/store'
import { hojeISO, liquidoDe, somarDias } from '@/features/financeiro/calculos'
import { usePendentes } from '@/features/faturamento/pendentes'
import { useCompromissos } from '@/features/agenda/api'
import type { Tamanho } from './layout'
import s from './dashboard.module.css'

/** O que todo bloco recebe: a empresa escolhida no topo do dashboard. */
export interface ContextoBloco {
  empresaId: string
}

export interface DefinicaoBloco {
  id: string
  titulo: string
  descricao: string
  icone: typeof Gauge
  /** Tela que a pessoa precisa ter para ver o bloco (sem = todo mundo que vê o dashboard). */
  permissao?: string
  tamanhos: Tamanho[]
  render: (ctx: ContextoBloco) => ReactNode
}

const COLORS = ['#1a4d1e', '#e8702f', '#2e7d44', '#b5651d', '#3a7d5d', '#d98a3d']
const fator4 = (n: number) =>
  n.toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 })
const kBRL = (v: number) => `R$ ${Math.round(v / 1000)}k`
const STATUS_INFO: Record<string, { label: string; color: string; bg: string }> = {
  rascunho: { label: 'Rascunho', color: '#6b7b72', bg: '#f0eee7' },
  enviada: { label: 'Enviada', color: '#b5651d', bg: '#fdf0e6' },
  aprovada: { label: 'Aprovada', color: '#2e7d44', bg: '#e8f5ec' },
  recusada: { label: 'Recusada', color: '#c0392b', bg: '#fdecea' },
}

// ── KPIs ──

function KpiFator({ empresaId }: ContextoBloco) {
  const calc = useFatorEmpresa(empresaId)
  return (
    <div className={c.kpiCard}>
      <div className={c.kpiLabel}>Fator atual</div>
      <div className={`${c.kpiVal} ${c.accent}`}>{calc ? fator4(calc.fator) : '—'}</div>
      <div className={c.kpiSub}>markup {calc ? formatPct(calc.markup) : '—'}</div>
    </div>
  )
}

function KpiMargem({ empresaId }: ContextoBloco) {
  const { propostas } = usePropostas()
  const itens = propostas.flatMap((p) => p.itens).filter((i) => i.empresaId === empresaId)
  const ml = itens.length ? itens.reduce((a, i) => a + i.ml, 0) / itens.length : 0
  return (
    <div className={c.kpiCard}>
      <div className={c.kpiLabel}>Margem média (ML)</div>
      <div className={c.kpiVal}>{formatPct(ml)}</div>
      <div className={c.kpiSub}>{nomeUnidade(empresaId)}</div>
    </div>
  )
}

function KpiPropostas() {
  const { propostas } = usePropostas()
  return (
    <div className={c.kpiCard}>
      <div className={c.kpiLabel}>Propostas</div>
      <div className={c.kpiVal}>{propostas.length}</div>
      <div className={c.kpiSub}>
        {propostas.filter((p) => p.status === 'aprovada').length} aprovada(s)
      </div>
    </div>
  )
}

function KpiEquilibrio({ empresaId }: ContextoBloco) {
  const calc = useFatorEmpresa(empresaId)
  return (
    <div className={c.kpiCard}>
      <div className={c.kpiLabel}>Receita de equilíbrio</div>
      <div className={c.kpiVal}>
        {formatBRL(receitaEquilibrio(calc?.totalDF ?? 0, calc?.dvSem ?? 0))}
      </div>
      <div className={c.kpiSub}>por mês</div>
    </div>
  )
}

function useMetaDoAno(empresaId: string) {
  const { propostas } = usePropostas()
  const { metas } = useMetas()
  const ano = new Date().getFullYear()
  const meta = metaDoAno(metas, empresaId, ano)
  const meses = meta ? mesesDaMeta(meta) : Array<number>(12).fill(0)
  const realizado = realizadoPorMes(propostas, ano, empresaId)
  return { ano, meta, meses, realizado }
}

function KpiMeta({ empresaId }: ContextoBloco) {
  const { ano, meta, meses, realizado } = useMetaDoAno(empresaId)
  const total = meses.reduce((a, v) => a + v, 0)
  const feito = realizado.reduce((a, v) => a + v, 0)
  return (
    <div className={c.kpiCard}>
      <div className={c.kpiLabel}>Meta do ano</div>
      <div className={c.kpiVal}>{formatPct(total > 0 ? feito / total : 0)}</div>
      <div className={c.kpiSub}>
        {meta ? `atingido · ${meta.nome}` : `sem meta de ${ano} para a empresa`}
      </div>
    </div>
  )
}

// ── Gráficos e listas ──

function Cartao({
  icone: Icone,
  titulo,
  children,
  link,
}: {
  icone: typeof Gauge
  titulo: string
  children: ReactNode
  link?: { para: string; texto: string }
}) {
  return (
    <div className={`${c.chartCard} ${s.cartao}`}>
      <div className={c.chartTitle}>
        <Icone /> {titulo}
      </div>
      <div className={s.corpo}>{children}</div>
      {link && (
        <Link to={link.para} className={s.seeAll}>
          {link.texto} <ArrowRight />
        </Link>
      )}
    </div>
  )
}

function MargemEmpresa() {
  const { propostas } = usePropostas()
  const grupos = new Map<string, number>()
  for (const i of propostas.flatMap((p) => p.itens))
    grupos.set(i.empresaId, (grupos.get(i.empresaId) ?? 0) + Math.max(0, i.precoFinal * i.ml))
  const dados = [...grupos.entries()].map(([id, value]) => ({ name: nomeUnidade(id), value }))
  return (
    <Cartao icone={PieIcon} titulo="Margem por empresa">
      {dados.length === 0 ? (
        <div className={c.note}>Sem propostas ainda.</div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={dados}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={78}
              label={({ percent }) => `${((percent ?? 0) * 100).toFixed(0)}%`}
            >
              {dados.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(v) => formatBRL(Number(v))}
              contentStyle={{ borderRadius: 10, border: '1px solid #e6e3db', fontSize: 13 }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
          </PieChart>
        </ResponsiveContainer>
      )}
    </Cartao>
  )
}

function MetaRealizado({ empresaId }: ContextoBloco) {
  const { meses, realizado } = useMetaDoAno(empresaId)
  const dados = mesesMeta.map((mes, i) => ({ mes, meta: meses[i], realizado: realizado[i] }))
  return (
    <Cartao icone={BarChart3} titulo="Meta × Realizado">
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={dados} margin={{ top: 14, right: 16, bottom: 6, left: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#ede9e0" vertical={false} />
          <XAxis dataKey="mes" tick={{ fontSize: 10, fill: '#6b7b72' }} interval={0} />
          <YAxis tickFormatter={kBRL} tick={{ fontSize: 11, fill: '#6b7b72' }} width={48} />
          <Tooltip
            formatter={(v) => formatBRL(Number(v))}
            cursor={{ fill: 'rgba(26,77,30,0.05)' }}
            contentStyle={{ borderRadius: 10, border: '1px solid #e6e3db', fontSize: 13 }}
          />
          <Legend
            verticalAlign="top"
            align="center"
            height={26}
            wrapperStyle={{ fontSize: 11, paddingBottom: 4 }}
          />
          <Bar dataKey="meta" name="Meta" fill="#1a4d1e" radius={[3, 3, 0, 0]} />
          <Bar dataKey="realizado" name="Realizado" fill="#e8702f" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </Cartao>
  )
}

function PropostasRecentes() {
  const { propostas } = usePropostas()
  const recentes = propostas.slice(0, 5)
  return (
    <Cartao
      icone={Route}
      titulo="Propostas recentes"
      link={{ para: '/propostas', texto: 'Ver propostas' }}
    >
      {recentes.map((p) => {
        const st = STATUS_INFO[p.status] ?? STATUS_INFO.rascunho
        return (
          <div key={p.id} className={s.recentRow}>
            <span className={s.recentNum} title={p.numero}>
              {p.numero.match(/\d+$/)?.[0] ?? p.numero}
            </span>
            <div className={s.recentMain}>
              <div className={s.recentName}>{p.cliente}</div>
              <div className={s.recentMut}>
                {p.data} · {p.itens.length} {p.itens.length === 1 ? 'item' : 'itens'}
              </div>
            </div>
            <div className={s.recentRight}>
              <div className={s.recentPv}>{formatBRL(p.total)}</div>
              <span className={s.etiqueta} style={{ color: st.color, background: st.bg }}>
                {st.label}
              </span>
            </div>
          </div>
        )
      })}
      {recentes.length === 0 && <div className={c.note}>Nenhuma proposta ainda.</div>}
    </Cartao>
  )
}

function Atalhos() {
  return (
    <div className={s.quick}>
      <Link to="/simulador" className={s.quickBtn}>
        <Calculator /> Abrir o Pricing
      </Link>
      <Link to="/propostas" className={s.quickBtn}>
        <Route /> Propostas
      </Link>
      <Link to="/agenda" className={s.quickBtn}>
        <CalendarDays /> Agenda
      </Link>
      <Link to="/analises/break-even" className={s.quickBtn}>
        <BarChart3 /> Ver relatórios
      </Link>
    </div>
  )
}

/** A receber e a pagar dos próximos 7 dias, vencidos e o saldo previsto em 30 dias. */
function FinanceiroSemana({ empresaId }: ContextoBloco) {
  const { movimentos } = useFinanceiro()
  const hoje = hojeISO()
  const semana = somarDias(hoje, 7)
  const abertos = movimentos.filter(
    (m) => !m.cancelado && !m.pagoEm && (!empresaId || m.empresaId === empresaId),
  )
  const soma = (f: (m: (typeof abertos)[number]) => boolean) =>
    abertos.filter(f).reduce((a, m) => a + liquidoDe(m), 0)
  const linhas = [
    {
      rotulo: 'A receber em 7 dias',
      valor: soma((m) => m.tipo === 'receber' && m.vencimento >= hoje && m.vencimento <= semana),
      tom: s.bom,
    },
    {
      rotulo: 'A pagar em 7 dias',
      valor: soma((m) => m.tipo === 'pagar' && m.vencimento >= hoje && m.vencimento <= semana),
      tom: s.atencao,
    },
    {
      rotulo: 'A receber vencido',
      valor: soma((m) => m.tipo === 'receber' && vencido(m.vencimento, hoje) && !m.pixSituacao),
      tom: s.ruim,
    },
    {
      rotulo: 'A pagar vencido',
      valor: soma((m) => m.tipo === 'pagar' && vencido(m.vencimento, hoje) && !m.pixSituacao),
      tom: s.ruim,
    },
  ]
  const previsto = abertos
    .filter((m) => m.vencimento <= somarDias(hoje, 30))
    .reduce((a, m) => a + (m.tipo === 'receber' ? 1 : -1) * liquidoDe(m), 0)
  return (
    <Cartao
      icone={Wallet}
      titulo="Financeiro da semana"
      link={{ para: '/financeiro/entradas-saidas', texto: 'Entradas e Saídas' }}
    >
      <div className={s.numeros}>
        {linhas.map((l) => (
          <div key={l.rotulo}>
            <span>{l.rotulo}</span>
            <b className={l.valor > 0 ? l.tom : undefined}>{formatBRL(l.valor)}</b>
          </div>
        ))}
      </div>
      <div className={s.previsto}>
        Saldo previsto em 30 dias (entradas − saídas em aberto):{' '}
        <b className={previsto < 0 ? s.ruim : s.bom}>{formatBRL(previsto)}</b>
      </div>
    </Cartao>
  )
}

/** Lançamentos esperando aprovação (quem aprova vê os seus). */
function Aprovacoes({ empresaId }: ContextoBloco) {
  const { movimentos } = useFinanceiro()
  const pendentes = movimentos.filter(
    (m) => !m.cancelado && m.aprovacao === 'pendente' && (!empresaId || m.empresaId === empresaId),
  )
  // Um grupo (parcelas, transferência) aprova junto: conta uma vez.
  const grupos = [...new Map(pendentes.map((m) => [m.grupoId || m.id, m])).values()].sort((a, b) =>
    a.vencimento.localeCompare(b.vencimento),
  )
  return (
    <Cartao
      icone={ClipboardCheck}
      titulo={`Para aprovar (${grupos.length})`}
      link={{ para: '/financeiro/entradas-saidas', texto: 'Aprovar em Entradas e Saídas' }}
    >
      {grupos.slice(0, 5).map((m) => (
        <div key={m.id} className={s.linha}>
          <span className={s.linhaTexto}>
            <b>{m.parceiroNome}</b>
            <small>{m.descricao}</small>
          </span>
          <span className={m.tipo === 'pagar' ? s.atencao : s.bom}>{formatBRL(m.valor)}</span>
        </div>
      ))}
      {grupos.length === 0 && <div className={c.note}>Nada esperando aprovação.</div>}
    </Cartao>
  )
}

/** CT-es e minutas da SIIMP ainda sem fatura no mês. */
function FretesSemFatura({ empresaId }: ContextoBloco) {
  const mes = hojeISO().slice(0, 7)
  const [a, m] = mes.split('-').map(Number)
  const { data } = usePendentes(
    `${mes}-01`,
    `${mes}-${String(new Date(a, m, 0).getDate()).padStart(2, '0')}`,
  )
  const pend = (data ?? []).filter(
    (d) => d.situacao === 'pendente' && (!empresaId || d.empresaId === empresaId),
  )
  const clientes = new Set(pend.map((d) => d.clienteId || d.tomadorNome)).size
  return (
    <Cartao
      icone={FileText}
      titulo="Fretes sem fatura"
      link={{ para: '/financeiro/faturamento?visao=siimp', texto: 'Faturar na Central' }}
    >
      <div className={s.destaque}>
        <b>{formatBRL(pend.reduce((t, d) => t + d.valor, 0))}</b>
        <span>
          {pend.length} documento(s) de {clientes} cliente(s) neste mês
        </span>
      </div>
    </Cartao>
  )
}

interface ItemAbc {
  nome: string
  valor: number
  percentual: number
  classe: string
}
/** Os 5 maiores clientes dos últimos 12 meses (curva ABC). */
function TopClientes({ empresaId }: ContextoBloco) {
  const hoje = new Date()
  const de = new Date(hoje.getFullYear(), hoje.getMonth() - 11, 1).toISOString().slice(0, 10)
  const params = new URLSearchParams({
    dimensao: 'clientes',
    de,
    ate: hoje.toISOString().slice(0, 10),
  })
  if (empresaId) params.set('empresaId', empresaId)
  const { data } = useQuery({
    queryKey: ['curva-abc', 'top', params.toString()],
    queryFn: () => apiFetch<{ lista: ItemAbc[] }>(`/analises/curva-abc?${params.toString()}`),
  })
  const top = (data?.lista ?? []).slice(0, 5)
  return (
    <Cartao
      icone={ChartColumnDecreasing}
      titulo="Maiores clientes (12 meses)"
      link={{ para: '/analises/curva-abc', texto: 'Ver a curva ABC' }}
    >
      {top.map((i) => (
        <div key={i.nome} className={s.linha}>
          <span className={s.linhaTexto}>
            <b>{i.nome}</b>
            <small>
              classe {i.classe} · {formatPct(i.percentual)} do faturamento
            </small>
          </span>
          <span>{formatBRL(i.valor)}</span>
        </div>
      ))}
      {top.length === 0 && <div className={c.note}>Sem faturamento nos últimos 12 meses.</div>}
    </Cartao>
  )
}

function AgendaHoje() {
  const { compromissos } = useCompromissos()
  const hoje = hojeISO()
  const doDia = compromissos
    .filter((x) => x.inicio.slice(0, 10) === hoje)
    .sort((a, b) => a.inicio.localeCompare(b.inicio))
  return (
    <Cartao
      icone={CalendarDays}
      titulo={`Agenda de hoje (${doDia.length})`}
      link={{ para: '/agenda', texto: 'Abrir a agenda' }}
    >
      {doDia.slice(0, 6).map((x) => (
        <div key={x.id} className={s.linha}>
          <span className={s.linhaTexto}>
            <b>{x.titulo}</b>
            <small>{x.clienteNome || x.local || x.responsavelNome}</small>
          </span>
          <span className={s.hora}>{x.diaInteiro ? 'dia todo' : x.inicio.slice(11, 16)}</span>
        </div>
      ))}
      {doDia.length === 0 && <div className={c.note}>Nenhum compromisso hoje.</div>}
    </Cartao>
  )
}

/** Catálogo: tudo o que pode entrar no dashboard. */
export const BLOCOS: DefinicaoBloco[] = [
  {
    id: 'kpi-fator',
    titulo: 'Fator atual',
    descricao: 'O fator e o markup da empresa escolhida.',
    icone: Gauge,
    permissao: '/simulador',
    tamanhos: ['p'],
    render: (ctx) => <KpiFator {...ctx} />,
  },
  {
    id: 'kpi-margem',
    titulo: 'Margem média',
    descricao: 'A margem líquida média dos itens das propostas.',
    icone: TrendingUp,
    permissao: '/propostas',
    tamanhos: ['p'],
    render: (ctx) => <KpiMargem {...ctx} />,
  },
  {
    id: 'kpi-propostas',
    titulo: 'Propostas',
    descricao: 'Quantas propostas existem e quantas foram aprovadas.',
    icone: Route,
    permissao: '/propostas',
    tamanhos: ['p'],
    render: () => <KpiPropostas />,
  },
  {
    id: 'kpi-equilibrio',
    titulo: 'Receita de equilíbrio',
    descricao: 'Quanto a empresa precisa faturar por mês para pagar as despesas.',
    icone: Scale,
    permissao: '/analises/break-even',
    tamanhos: ['p'],
    render: (ctx) => <KpiEquilibrio {...ctx} />,
  },
  {
    id: 'kpi-meta',
    titulo: 'Meta do ano',
    descricao: 'Quanto da meta do ano já foi atingido.',
    icone: Target,
    permissao: '/analises/metas',
    tamanhos: ['p'],
    render: (ctx) => <KpiMeta {...ctx} />,
  },
  {
    id: 'financeiro-semana',
    titulo: 'Financeiro da semana',
    descricao: 'A receber e a pagar nos próximos 7 dias, vencidos e o saldo previsto em 30 dias.',
    icone: Wallet,
    permissao: '/financeiro/entradas-saidas',
    tamanhos: ['m', 'g'],
    render: (ctx) => <FinanceiroSemana {...ctx} />,
  },
  {
    id: 'aprovacoes',
    titulo: 'Para aprovar',
    descricao: 'Lançamentos esperando aprovação.',
    icone: ClipboardCheck,
    permissao: '/financeiro/aprovar',
    tamanhos: ['m', 'g'],
    render: (ctx) => <Aprovacoes {...ctx} />,
  },
  {
    id: 'fretes-sem-fatura',
    titulo: 'Fretes sem fatura',
    descricao: 'CT-es e minutas da SIIMP ainda sem fatura no mês.',
    icone: FileText,
    permissao: '/financeiro/faturamento',
    tamanhos: ['p', 'm'],
    render: (ctx) => <FretesSemFatura {...ctx} />,
  },
  {
    id: 'margem-empresa',
    titulo: 'Margem por empresa',
    descricao: 'Pizza da margem das propostas por empresa.',
    icone: PieIcon,
    permissao: '/propostas',
    tamanhos: ['m', 'g'],
    render: () => <MargemEmpresa />,
  },
  {
    id: 'meta-realizado',
    titulo: 'Meta × Realizado',
    descricao: 'A meta e o realizado de cada mês do ano.',
    icone: BarChart3,
    permissao: '/analises/metas',
    tamanhos: ['m', 'g'],
    render: (ctx) => <MetaRealizado {...ctx} />,
  },
  {
    id: 'propostas-recentes',
    titulo: 'Propostas recentes',
    descricao: 'As últimas 5 propostas, com valor e situação.',
    icone: Route,
    permissao: '/propostas',
    tamanhos: ['m', 'g'],
    render: () => <PropostasRecentes />,
  },
  {
    id: 'top-clientes',
    titulo: 'Maiores clientes',
    descricao: 'Os 5 clientes que mais faturaram em 12 meses (curva ABC).',
    icone: ChartColumnDecreasing,
    permissao: '/analises/curva-abc',
    tamanhos: ['m', 'g'],
    render: (ctx) => <TopClientes {...ctx} />,
  },
  {
    id: 'agenda-hoje',
    titulo: 'Agenda de hoje',
    descricao: 'Os compromissos de hoje.',
    icone: CalendarDays,
    permissao: '/agenda',
    tamanhos: ['m', 'g'],
    render: () => <AgendaHoje />,
  },
  {
    id: 'atalhos',
    titulo: 'Atalhos',
    descricao: 'Botões para o Pricing, as propostas, a agenda e os relatórios.',
    icone: LayoutGrid,
    tamanhos: ['m', 'g'],
    render: () => <Atalhos />,
  },
]

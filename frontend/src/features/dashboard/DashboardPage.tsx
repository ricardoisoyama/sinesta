import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Calculator, CalendarDays, Route, BarChart3, PieChart as PieIcon, ArrowRight } from 'lucide-react'
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import ui from '@/features/common/ui.module.css'
import { formatBRL, formatPct } from '@/lib/format'
import { nomeUnidade } from '@/features/unidades/mock'
import { useCustosFixosQuery, useEmpresasQuery } from '@/features/cadastros/hooks'
import { empresaPadrao } from '@/features/unidades/types'
import { usePropostas } from '@/features/propostas/store'
import { useMetas } from '@/features/metas/store'
import { useFatorEmpresa } from '@/features/pricing/usePreco'
import { receitaEquilibrio } from '@/features/pricing/engine'
import { mesesDaMeta, mesesMeta } from '@/features/metas/mock'
import { metaDoAno, realizadoPorMes } from '@/features/metas/realizado'
import c from '@/features/common/charts.module.css'
import s from './dashboard.module.css'

const COLORS = ['#1a4d1e', '#e8702f', '#2e7d44', '#b5651d', '#3a7d5d', '#d98a3d']
const fator4 = (n: number) => n.toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 })
const kBRL = (v: number) => `R$ ${Math.round(v / 1000)}k`

const STATUS_INFO: Record<string, { label: string; color: string; bg: string }> = {
  rascunho: { label: 'Rascunho', color: '#6b7b72', bg: '#f0eee7' },
  enviada: { label: 'Enviada', color: '#b5651d', bg: '#fdf0e6' },
  aprovada: { label: 'Aprovada', color: '#2e7d44', bg: '#e8f5ec' },
  recusada: { label: 'Recusada', color: '#c0392b', bg: '#fdecea' },
}

export function DashboardPage() {
  const { data: empresasData } = useEmpresasQuery()
  useCustosFixosQuery()
  const unidades = (empresasData ?? []).filter((u) => u.status === 'ativo')
  const [unidadeId, setUnidadeId] = useState('')
  const { propostas } = usePropostas()
  const { metas } = useMetas()

  useEffect(() => {
    if (unidades.length && !unidades.some((u) => u.id === unidadeId)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setUnidadeId((empresaPadrao(unidades) ?? unidades[0]).id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unidades.map((u) => u.id).join(','), unidadeId])

  const calc = useFatorEmpresa(unidadeId)
  const df = calc?.totalDF ?? 0
  const dvSem = calc?.dvSem ?? 0
  const equilibrio = receitaEquilibrio(df, dvSem)

  // Itens de todas as propostas (a base "comercial" do sistema).
  const itens = propostas.flatMap((p) => p.itens)
  const itensEmpresa = itens.filter((i) => i.empresaId === unidadeId)
  const mlMedia = itensEmpresa.length ? itensEmpresa.reduce((a, i) => a + i.ml, 0) / itensEmpresa.length : 0

  // Meta da empresa escolhida no ano corrente: a mesma que compõe o fator (única ou principal).
  const ano = new Date().getFullYear()
  const meta = metaDoAno(metas, unidadeId, ano)
  const metaMeses = meta ? mesesDaMeta(meta) : Array<number>(12).fill(0)
  const metaAno = metaMeses.reduce((a, v) => a + v, 0)
  // Realizado = propostas aprovadas no ano, só os itens desta empresa (mesma regra da tela de Metas).
  const realizadoMensal = realizadoPorMes(propostas, ano, unidadeId)
  const realizadoAcum = realizadoMensal.reduce((a, v) => a + v, 0)
  const pctMeta = metaAno > 0 ? realizadoAcum / metaAno : 0

  // Pizza: participação na margem (MCT) por empresa.
  const grupos = new Map<string, number>()
  for (const i of itens) grupos.set(i.empresaId, (grupos.get(i.empresaId) ?? 0) + Math.max(0, i.precoFinal * i.ml))
  const pieData = [...grupos.entries()].map(([id, value]) => ({ name: nomeUnidade(id), value }))

  // Barras: meta × realizado por mês.
  const barData = mesesMeta.map((mes, i) => ({
    mes,
    meta: metaMeses[i],
    realizado: realizadoMensal[i],
  }))

  const recentes = propostas.slice(0, 5)

  return (
    <div>
      <div className={s.head}>
        <div className={ui.pageTitle}>Dashboard</div>
        <select className={ui.filterSelect} value={unidadeId} onChange={(e) => setUnidadeId(e.target.value)}>
          {unidades.map((u) => (
            <option key={u.id} value={u.id}>
              {u.nome}
            </option>
          ))}
        </select>
      </div>

      <div className={s.kpis5}>
        <div className={c.kpiCard}>
          <div className={c.kpiLabel}>Fator atual</div>
          <div className={`${c.kpiVal} ${c.accent}`}>{calc ? fator4(calc.fator) : '—'}</div>
          <div className={c.kpiSub}>markup {calc ? formatPct(calc.markup) : '—'}</div>
        </div>
        <div className={c.kpiCard}>
          <div className={c.kpiLabel}>Margem média (ML)</div>
          <div className={c.kpiVal}>{formatPct(mlMedia)}</div>
          <div className={c.kpiSub}>{nomeUnidade(unidadeId)}</div>
        </div>
        <div className={c.kpiCard}>
          <div className={c.kpiLabel}>Propostas</div>
          <div className={c.kpiVal}>{propostas.length}</div>
          <div className={c.kpiSub}>{itens.length} itens no total</div>
        </div>
        <div className={c.kpiCard}>
          <div className={c.kpiLabel}>Receita de equilíbrio</div>
          <div className={c.kpiVal}>{formatBRL(equilibrio)}</div>
          <div className={c.kpiSub}>por mês</div>
        </div>
        <div className={c.kpiCard}>
          <div className={c.kpiLabel}>Meta do ano</div>
          <div className={c.kpiVal}>{formatPct(pctMeta)}</div>
          <div className={c.kpiSub}>{meta ? `atingido · ${meta.nome}` : `sem meta de ${ano} para a empresa`}</div>
        </div>
      </div>

      <div className={c.duo}>
        <div className={c.chartCard}>
          <div className={c.chartTitle}>
            <PieIcon /> Margem por empresa
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={78}
                label={({ percent }) => `${((percent ?? 0) * 100).toFixed(0)}%`}
              >
                {pieData.map((_, i) => (
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
        </div>

        <div className={c.chartCard}>
          <div className={c.chartTitle}>
            <BarChart3 /> Meta × Realizado
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={barData} margin={{ top: 14, right: 16, bottom: 6, left: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ede9e0" vertical={false} />
              <XAxis dataKey="mes" tick={{ fontSize: 10, fill: '#6b7b72' }} interval={0} />
              <YAxis tickFormatter={kBRL} tick={{ fontSize: 11, fill: '#6b7b72' }} width={48} />
              <Tooltip
                formatter={(v) => formatBRL(Number(v))}
                cursor={{ fill: 'rgba(26,77,30,0.05)' }}
                contentStyle={{ borderRadius: 10, border: '1px solid #e6e3db', fontSize: 13 }}
              />
              <Legend verticalAlign="top" align="center" height={26} wrapperStyle={{ fontSize: 11, paddingBottom: 4 }} />
              <Bar dataKey="meta" name="Meta" fill="#1a4d1e" radius={[3, 3, 0, 0]} />
              <Bar dataKey="realizado" name="Realizado" fill="#e8702f" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className={c.chartCard} style={{ marginTop: 14 }}>
        <div className={c.chartTitle}>
          <Route /> Propostas recentes
        </div>
        {recentes.map((p) => {
          const st = STATUS_INFO[p.status] ?? STATUS_INFO.rascunho
          return (
            <div key={p.id} className={s.recentRow}>
              <span className={s.recentNum}>{p.numero.replace('PROP-', '')}</span>
              <div className={s.recentMain}>
                <div className={s.recentName}>{p.cliente}</div>
                <div className={s.recentMut}>
                  {p.data} · {p.itens.length} {p.itens.length === 1 ? 'item' : 'itens'}
                </div>
              </div>
              <div className={s.recentRight}>
                <div className={s.recentPv}>{formatBRL(p.total)}</div>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    padding: '2px 9px',
                    borderRadius: 20,
                    color: st.color,
                    background: st.bg,
                  }}
                >
                  {st.label}
                </span>
              </div>
            </div>
          )
        })}
        {recentes.length === 0 && <div className={c.note}>Nenhuma proposta ainda.</div>}
        <Link to="/propostas" className={s.seeAll}>
          Ver propostas <ArrowRight />
        </Link>
      </div>

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
    </div>
  )
}

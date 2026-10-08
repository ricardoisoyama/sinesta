import { useState } from 'react'
import { PieChart as PieIcon, BarChart3 } from 'lucide-react'
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
import { PageHeader } from '@/features/common/PageHeader'
import { formatBRL, formatPct } from '@/lib/format'
import { nomeUnidade } from '@/features/unidades/mock'
import { totalCustoFixoAtivo } from '@/features/custosFixos/mock'
import { useCustosFixosQuery, useEmpresasQuery } from '@/features/cadastros/hooks'
import { usePropostas } from '@/features/propostas/store'
import { mesesMeta } from '@/features/metas/mock'
import { mesAno } from '@/features/metas/realizado'
import ui from '@/features/common/ui.module.css'
import s from '@/features/common/charts.module.css'

/** Mês (0-11) do ano corrente, ou o ano inteiro. */
type Periodo = number | 'ano'

const COLORS = ['#1a4d1e', '#e8702f', '#2e7d44', '#b5651d', '#3a7d5d', '#d98a3d']
const num = (v: number) => v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export function MixPage() {
  useEmpresasQuery()
  useCustosFixosQuery()
  const { propostas } = usePropostas()
  const hoje = new Date()
  const ano = hoje.getFullYear()
  const [periodo, setPeriodo] = useState<Periodo>(hoje.getMonth())
  // O necessário é DF do período ÷ margem média; o realizado conta só as aprovadas do mesmo período
  // (mesma data que as Metas usam). Antes o realizado somava todas as aprovadas, de qualquer data.
  const mesesNoPeriodo = periodo === 'ano' ? 12 : 1
  const noPeriodo = (data: string) => {
    const d = mesAno(data)
    return !!d && d.ano === ano && (periodo === 'ano' || d.mes === periodo)
  }
  const aprovadas = propostas.filter((p) => p.status === 'aprovada' && noPeriodo(p.data))
  const itensAprov = aprovadas.flatMap((p) => p.itens)

  // agrupa os itens aprovados por empresa
  const grupos = new Map<string, { empresaId: string; quantidade: number; mct: number }>()
  for (const it of itensAprov) {
    const g = grupos.get(it.empresaId) ?? { empresaId: it.empresaId, quantidade: 0, mct: 0 }
    g.quantidade += 1
    g.mct += it.precoFinal * it.ml
    grupos.set(it.empresaId, g)
  }
  const mctTotal = [...grupos.values()].reduce((a, g) => a + g.mct, 0)

  const enriched = [...grupos.values()]
    .map((g) => {
      const participacao = mctTotal > 0 ? g.mct / mctTotal : 0
      const mcuMedio = g.quantidade > 0 ? g.mct / g.quantidade : 0
      const df = totalCustoFixoAtivo(g.empresaId) * mesesNoPeriodo
      const volumeNecessario = mcuMedio > 0 ? df / mcuMedio : 0
      return { ...g, participacao, mcuMedio, volumeNecessario, nome: nomeUnidade(g.empresaId) }
    })
    .sort((a, b) => b.mct - a.mct)

  const totalNec = enriched.reduce((a, g) => a + g.volumeNecessario, 0)
  const pieData = enriched.map((g) => ({ name: g.nome, value: g.participacao }))
  const barData = enriched.map((g) => ({ nome: g.nome, necessario: g.volumeNecessario, realizado: g.quantidade }))

  return (
    <div>
      <PageHeader
        breadcrumb="Relatórios"
        title="Mix / Equilíbrio"
        subtitle="Margem das propostas aprovadas no período e quantos serviços/produtos para o equilíbrio."
        action={
          <select className={ui.filterSelect} value={String(periodo)} onChange={(e) => setPeriodo(e.target.value === 'ano' ? 'ano' : Number(e.target.value))} aria-label="Período">
            {mesesMeta.map((m, i) => (
              <option key={m} value={i}>{m}/{ano}</option>
            ))}
            <option value="ano">Ano de {ano}</option>
          </select>
        }
      />

      <div className={s.kpis}>
        <div className={s.kpiCard}>
          <div className={s.kpiLabel}>Margem (propostas aprovadas)</div>
          <div className={s.kpiVal}>{formatBRL(mctTotal)}</div>
          <div className={s.kpiSub}>contribuição total</div>
        </div>
        <div className={s.kpiCard}>
          <div className={s.kpiLabel}>Propostas aprovadas</div>
          <div className={s.kpiVal}>{aprovadas.length}</div>
          <div className={s.kpiSub}>consideradas no mix</div>
        </div>
        <div className={s.kpiCard}>
          <div className={s.kpiLabel}>Itens aprovados</div>
          <div className={s.kpiVal}>{itensAprov.length}</div>
          <div className={s.kpiSub}>serviços/produtos</div>
        </div>
        <div className={s.kpiCard}>
          <div className={s.kpiLabel}>Serviços/produtos p/ equilíbrio</div>
          <div className={s.kpiVal}>{num(totalNec)}</div>
          <div className={s.kpiSub}>somando as empresas</div>
        </div>
      </div>

      {itensAprov.length === 0 ? (
        <div className={s.chartCard}>
          <div className={s.note}>
            Nenhuma proposta aprovada neste período. As propostas aprovadas no menu <b>Proposta</b> alimentam o Mix pela data delas (a mesma regra das Metas).
          </div>
        </div>
      ) : (
        <div className={s.duo}>
          <div className={s.chartCard}>
            <div className={s.chartTitle}>
              <PieIcon /> Participação na margem por empresa
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={88}
                  label={({ percent }) => `${((percent ?? 0) * 100).toFixed(0)}%`}
                >
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v) => formatPct(Number(v))}
                  contentStyle={{ borderRadius: 10, border: '1px solid #e6e3db', fontSize: 13 }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className={s.chartCard}>
            <div className={s.chartTitle}>
              <BarChart3 /> Serviços/produtos: necessário × realizado
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={barData} margin={{ top: 14, right: 16, bottom: 6, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ede9e0" vertical={false} />
                <XAxis dataKey="nome" tick={{ fontSize: 11, fill: '#6b7b72' }} />
                <YAxis tick={{ fontSize: 12, fill: '#6b7b72' }} width={36} />
                <Tooltip
                  formatter={(v) => num(Number(v))}
                  cursor={{ fill: 'rgba(26,77,30,0.05)' }}
                  contentStyle={{ borderRadius: 10, border: '1px solid #e6e3db', fontSize: 13 }}
                />
                <Legend verticalAlign="top" align="center" height={28} wrapperStyle={{ fontSize: 12, paddingBottom: 6 }} />
                <Bar dataKey="necessario" name="Necessário" fill="#1a4d1e" radius={[3, 3, 0, 0]} />
                <Bar dataKey="realizado" name="Realizado" fill="#e8702f" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className={s.note} style={{ marginTop: 12 }}>
        Considera os itens das <b>propostas aprovadas no período escolhido</b>, agrupados por empresa. A pizza mostra a participação de
        cada empresa na margem; as barras comparam quantos serviços/produtos cada uma <b>precisa</b> (DF ÷ margem
        média, com a DF do período: um mês ou o ano) com o que foi <b>realizado</b> (itens aprovados no período).
      </div>
    </div>
  )
}

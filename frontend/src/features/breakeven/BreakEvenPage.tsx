import { useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarRange, Scale } from 'lucide-react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceDot,
  ReferenceLine,
} from 'recharts'
import ui from '@/features/common/ui.module.css'
import { PageHeader } from '@/features/common/PageHeader'
import { formatBRL, formatPct } from '@/lib/format'
import { nomeUnidade } from '@/features/unidades/mock'
import { useCustosFixosQuery, useEmpresasQuery } from '@/features/cadastros/hooks'
import { empresaPadrao } from '@/features/unidades/types'
import { useFatorEmpresa } from '@/features/pricing/usePreco'
import { receitaEquilibrio, receitaAlvo } from '@/features/pricing/engine'
import { useMetas } from '@/features/metas/store'
import { mesesDaMeta, mesesMeta } from '@/features/metas/mock'
import { metaDoAno } from '@/features/metas/realizado'
import s from '@/features/common/charts.module.css'

const kBRL = (v: number) => `R$ ${Math.round(v / 1000)}k`

/** Eixo com 4 divisões de valor redondo (1, 2, 2,5 ou 5 × 10ⁿ) que cabem o maior valor. */
function escalaRedonda(maior: number): { max: number; ticks: number[] } {
  const bruto = (maior * 1.08) / 4
  const pot = 10 ** Math.floor(Math.log10(bruto))
  const passo = [1, 2, 2.5, 5, 10].map((m) => m * pot).find((p) => p >= bruto) ?? bruto
  return { max: passo * 4, ticks: [0, 1, 2, 3, 4].map((i) => i * passo) }
}

// Uma cor por elemento, a mesma no card e no gráfico.
const COR = {
  receita: '#1a4d1e',
  custoTotal: '#e8702f',
  df: '#9aa39b',
  equilibrio: '#143d18',
  alvo: '#2e7d44',
  // Faixas do mês: meta abaixo do equilíbrio, entre o equilíbrio e o alvo, acima do alvo.
  prejuizo: '#c0392b',
  justo: '#d98a3d',
  folga: '#2e7d44',
}

/**
 * Break-even: é MENSAL e não depende da meta. Receita de equilíbrio = DF do mês ÷ (1 − DV);
 * receita para o lucro alvo = DF ÷ (1 − DV − lucro). A meta de cada mês entra só para comparar:
 * mostra em que meses a meta cobre o equilíbrio e o lucro alvo.
 */
export function BreakEvenPage() {
  const { data: empresasData } = useEmpresasQuery()
  useCustosFixosQuery()
  const { metas } = useMetas()
  const unidades = (empresasData ?? []).filter((u) => u.status === 'ativo')
  const [escolhida, setEscolhida] = useState('')
  // Sem efeito: enquanto a escolha não existir na lista, vale a empresa padrão (ou a primeira).
  const unidadeId = unidades.some((u) => u.id === escolhida) ? escolhida : (empresaPadrao(unidades)?.id ?? '')

  const calc = useFatorEmpresa(unidadeId)
  const df = calc?.totalDF ?? 0
  const dvSem = calc?.dvSem ?? 0
  const dvCom = calc?.dvCom ?? 0
  const lucro = dvCom - dvSem

  const equilibrio = receitaEquilibrio(df, dvSem)
  const alvo = receitaAlvo(df, dvCom)

  const maxReceita = Math.max(alvo * 1.6, 1000)
  const data = Array.from({ length: 11 }, (_, i) => {
    const x = (maxReceita / 10) * i
    return { x, receita: x, custoTotal: df + dvSem * x, custoFixo: df }
  })

  // ── mês a mês com a meta ──
  const hoje = new Date()
  const ano = hoje.getFullYear()
  const mesAtual = hoje.getMonth()
  const meta = metaDoAno(metas, unidadeId, ano)
  const valoresMeta = meta ? mesesDaMeta(meta) : []
  const faixa = (v: number) => (v < equilibrio ? 'prejuizo' : v < alvo ? 'justo' : 'folga')
  const meses = valoresMeta.map((v, i) => ({ mes: mesesMeta[i], meta: v, faixa: v > 0 ? faixa(v) : 'sem' }))
  const abaixo = meses.filter((m) => m.faixa === 'prejuizo').length
  const metaMes = valoresMeta[mesAtual] ?? 0
  const seguranca = metaMes > 0 ? (metaMes - equilibrio) / metaMes : 0
  const escala = escalaRedonda(Math.max(alvo, ...valoresMeta, 1))

  const comboUnidade = (
    <select className={ui.filterSelect} value={unidadeId} onChange={(e) => setEscolhida(e.target.value)}>
      {unidades.map((u) => (
        <option key={u.id} value={u.id}>
          {u.nome}
        </option>
      ))}
    </select>
  )

  return (
    <div>
      <PageHeader
        breadcrumb="Relatórios"
        title="Break-even"
        subtitle="Ponto de equilíbrio mensal por empresa e como a meta de cada mês fica em relação a ele."
        action={comboUnidade}
      />

      <div className={s.kpis}>
        <div className={s.kpiCard}>
          <div className={s.kpiLabel}><i className={s.swPonto} style={{ background: COR.equilibrio }} /> Receita de equilíbrio</div>
          <div className={s.kpiVal}>{formatBRL(equilibrio)}</div>
          <div className={s.kpiSub}>por mês · resultado = 0</div>
        </div>
        <div className={s.kpiCard}>
          <div className={s.kpiLabel}><i className={s.swPonto} style={{ background: COR.alvo }} /> Receita p/ lucro alvo</div>
          <div className={s.kpiVal}>{formatBRL(alvo)}</div>
          <div className={s.kpiSub}>por mês · com lucro de {formatPct(lucro)}</div>
        </div>
        <div className={s.kpiCard}>
          <div className={s.kpiLabel}><i className={s.swTraco} style={{ borderColor: COR.df }} /> Despesas Fixas (DF) / mês</div>
          <div className={s.kpiVal}>{formatBRL(df)}</div>
          <div className={s.kpiSub}>{nomeUnidade(unidadeId)}</div>
        </div>
        <div className={s.kpiCard}>
          <div className={s.kpiLabel}><i className={s.swLinha} style={{ background: COR.custoTotal }} /> Custo variável (DV s/ ML)</div>
          <div className={s.kpiVal}>{formatPct(dvSem)}</div>
          <div className={s.kpiSub}>da receita · inclina o custo total</div>
        </div>
      </div>

      <div className={s.chartCard}>
        <div className={s.chartTitle}>
          <Scale /> Ponto de equilíbrio da {nomeUnidade(unidadeId)} (por mês)
        </div>
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={data} margin={{ top: 14, right: 20, bottom: 34, left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#ede9e0" />
            <XAxis
              dataKey="x"
              type="number"
              domain={[0, maxReceita]}
              tickFormatter={kBRL}
              tick={{ fontSize: 12, fill: '#6b7b72' }}
              label={{ value: 'Receita mensal', position: 'bottom', offset: 16, fontSize: 12, fill: '#9aa39b' }}
            />
            <YAxis tickFormatter={kBRL} tick={{ fontSize: 12, fill: '#6b7b72' }} width={60} />
            <Tooltip
              formatter={(v) => formatBRL(Number(v))}
              labelFormatter={(l) => `Receita: ${formatBRL(Number(l))}`}
              contentStyle={{ borderRadius: 10, border: '1px solid #e6e3db', fontSize: 13 }}
            />
            <Legend verticalAlign="top" align="center" height={28} wrapperStyle={{ fontSize: 12, paddingBottom: 6 }} />
            <Line type="monotone" dataKey="receita" name="Receita" stroke={COR.receita} strokeWidth={2.5} dot={false} />
            <Line type="monotone" dataKey="custoTotal" name="Custo total" stroke={COR.custoTotal} strokeWidth={2.5} dot={false} />
            <Line type="monotone" dataKey="custoFixo" name="Despesa fixa (DF)" stroke={COR.df} strokeWidth={1.5} strokeDasharray="5 4" dot={false} />
            <ReferenceDot
              x={equilibrio}
              y={equilibrio}
              r={6}
              fill={COR.equilibrio}
              stroke="#fff"
              strokeWidth={2}
              label={{ value: 'Equilíbrio', position: 'top', fontSize: 12, fill: COR.equilibrio, fontWeight: 700 }}
            />
            {lucro > 0 && (
              <ReferenceDot
                x={alvo}
                y={alvo}
                r={6}
                fill={COR.alvo}
                stroke="#fff"
                strokeWidth={2}
                label={{ value: 'Lucro alvo', position: 'left', fontSize: 12, fill: COR.alvo, fontWeight: 700 }}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
        <div className={s.note}>
          O ponto onde a <b>Receita</b> cruza o <b>Custo total</b> (despesas fixas + variáveis) é o equilíbrio:{' '}
          <b>{formatBRL(equilibrio)}/mês</b>. Abaixo disso há prejuízo; acima, lucro. Em <b>{formatBRL(alvo)}/mês</b> o resultado
          chega ao lucro alvo da empresa. A linha tracejada é a despesa fixa (DF), que não varia com a receita. O equilíbrio não
          depende da meta: muda quando mudam as despesas fixas, os impostos ou a DV da empresa.
        </div>
      </div>

      <div className={s.chartCard} style={{ marginTop: 14 }}>
        <div className={s.chartTitle}>
          <CalendarRange /> Meta de {ano} mês a mês × equilíbrio
        </div>
        {!meta ? (
          <div className={s.note}>
            A {nomeUnidade(unidadeId)} não tem meta de {ano} (ou tem várias sem a principal marcada). Cadastre em{' '}
            <Link to="/analises/metas">Comercial › Metas</Link> para comparar cada mês com o equilíbrio.
          </div>
        ) : (
          <>
            <div className={s.resumoMes}>
              <span>
                <b>{mesesMeta[mesAtual]}:</b> meta {formatBRL(metaMes)}
                {metaMes > 0 && (
                  <>
                    {' '}· margem de segurança{' '}
                    <b style={{ color: seguranca < 0 ? COR.prejuizo : COR.alvo }}>{formatPct(seguranca)}</b>
                  </>
                )}
              </span>
              <span>
                {abaixo === 0 ? 'Todos os meses com meta cobrem o equilíbrio.' : `${abaixo} ${abaixo === 1 ? 'mês' : 'meses'} com meta abaixo do equilíbrio.`}
              </span>
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={meses} margin={{ top: 18, right: 16, bottom: 6, left: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ede9e0" vertical={false} />
                <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#6b7b72' }} interval={0} />
                <YAxis tickFormatter={kBRL} tick={{ fontSize: 11, fill: '#6b7b72' }} width={52} domain={[0, escala.max]} ticks={escala.ticks} />
                <Tooltip
                  formatter={(v) => formatBRL(Number(v))}
                  cursor={{ fill: 'rgba(26,77,30,0.05)' }}
                  contentStyle={{ borderRadius: 10, border: '1px solid #e6e3db', fontSize: 13 }}
                />
                <Bar dataKey="meta" name="Meta do mês" radius={[3, 3, 0, 0]}>
                  {meses.map((m, i) => (
                    // Barras claras (o mês atual mais forte) para as linhas de referência aparecerem por cima.
                    <Cell key={i} fill={m.faixa === 'sem' ? '#e6e3db' : COR[m.faixa as 'prejuizo' | 'justo' | 'folga']} fillOpacity={i === mesAtual ? 0.85 : 0.4} />
                  ))}
                </Bar>
                {/* Sem rótulo dentro do gráfico (ficava em cima das barras): os nomes estão na legenda abaixo. */}
                <ReferenceLine y={equilibrio} stroke={COR.equilibrio} strokeWidth={2} ifOverflow="extendDomain" />
                {lucro > 0 && <ReferenceLine y={alvo} stroke={COR.alvo} strokeWidth={2} strokeDasharray="6 4" ifOverflow="extendDomain" />}
              </BarChart>
            </ResponsiveContainer>
            <div className={s.legendaFaixas}>
              <span><i className={s.swLinha} style={{ background: COR.equilibrio }} /> equilíbrio ({formatBRL(equilibrio)})</span>
              {lucro > 0 && <span><i className={s.swTraco} style={{ borderColor: COR.alvo }} /> lucro alvo ({formatBRL(alvo)})</span>}
            </div>
            <div className={s.legendaFaixas}>
              <span><i className={s.swBarra} style={{ background: COR.prejuizo }} /> abaixo do equilíbrio (prejuízo previsto)</span>
              <span><i className={s.swBarra} style={{ background: COR.justo }} /> cobre o equilíbrio, não o lucro alvo</span>
              <span><i className={s.swBarra} style={{ background: COR.folga }} /> atinge o lucro alvo</span>
            </div>
            <div className={s.note}>
              Meta usada: <b>{meta.nome}</b> (a mesma que compõe o fator). Margem de segurança = quanto a meta do mês está acima do
              equilíbrio, em % da meta.
            </div>
          </>
        )}
      </div>
    </div>
  )
}

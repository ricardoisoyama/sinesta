import { useState } from 'react'
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ArrowDownRight, ArrowUpRight, GitCompareArrows, Minus } from 'lucide-react'
import ui from '@/features/common/ui.module.css'
import { formatBRL, formatPct } from '@/lib/format'
import { impactoDasHipoteses, indicadores, ponteDoLucro, ROTULO_HIPOTESE, type Hipotese, type LinhaMes } from './motor'
import s from './projecao.module.css'

/** Um cenário na comparação (a base é o primeiro, sem hipóteses). */
export interface Serie {
  id: string
  nome: string
  hipoteses: Hipotese[]
  linhas: LinhaMes[]
}

// Base = referência neutra (tracejada); cenários nas três primeiras cores categóricas (validadas para daltonismo).
const COR_BASE = '#8a918b'
const CORES = ['#2a78d6', '#eb6834', '#1baf7a']
const MAX = 3

type Metrica = 'acumulado' | 'lucro' | 'receita' | 'df' | 'fator'
const METRICAS: { id: Metrica; rotulo: string }[] = [
  { id: 'acumulado', rotulo: 'Lucro acumulado' },
  { id: 'lucro', rotulo: 'Lucro do mês' },
  { id: 'receita', rotulo: 'Receita' },
  { id: 'df', rotulo: 'Despesas fixas' },
  { id: 'fator', rotulo: 'Fator do preço' },
]
const kBRL = (v: number) => `${v < 0 ? '−' : ''}R$ ${Math.round(Math.abs(v) / 1000)}k`
const fatorTxt = (f: number) => (f > 0 ? f.toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 }) : '—')
const sinal = (v: number) => (v > 0 ? '+' : v < 0 ? '−' : '')
/** Diferença entre dois percentuais: pontos percentuais, não percentual do percentual. */
const pontos = (n: number) => `${(n * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} p.p.`

/**
 * Comparação de cenários: a base (os cadastros) e até três cenários no mesmo gráfico, a ponte do
 * lucro (quanto veio da receita e quanto das despesas), o impacto de cada hipótese e os
 * indicadores lado a lado com a diferença sobre a base.
 */
export function Comparacao({ series, contribuicao, rodar, escopo }: { series: Serie[]; contribuicao: number; rodar: (h: Hipotese[]) => LinhaMes[]; escopo: string }) {
  const [base, ...cenarios] = series
  const [escolhidos, setEscolhidos] = useState<string[] | null>(null)
  const [metrica, setMetrica] = useState<Metrica>('acumulado')
  // Começa com os primeiros cenários; quem saiu da lista (excluído) sai da escolha.
  const ids = (escolhidos ?? cenarios.slice(0, MAX).map((c) => c.id)).filter((id) => cenarios.some((c) => c.id === id))
  const visiveis = cenarios.filter((c) => ids.includes(c.id))
  // A cor segue o cenário (a posição dele na lista), nunca a ordem em que foi escolhido; com mais de
  // três, quem colidir com outro visível fica com a primeira cor livre.
  const cores = new Map<string, string>()
  for (const c of visiveis) {
    const propria = CORES[cenarios.indexOf(c) % CORES.length]
    cores.set(c.id, [...cores.values()].includes(propria) ? CORES.find((x) => ![...cores.values()].includes(x))! : propria)
  }
  const corDe = (id: string) => cores.get(id) ?? CORES[cenarios.findIndex((c) => c.id === id) % CORES.length]
  const alternar = (id: string) => setEscolhidos(ids.includes(id) ? ids.filter((x) => x !== id) : ids.length < MAX ? [...ids, id] : ids)

  if (!base) return null
  const valor = (l: LinhaMes, i: number, linhas: LinhaMes[]) =>
    metrica === 'acumulado' ? linhas.slice(0, i + 1).reduce((a, x) => a + x.lucro, 0) : metrica === 'fator' ? l.fator : l[metrica]
  const dados = base.linhas.map((l, i) => ({
    rotulo: l.rotulo,
    base: valor(l, i, base.linhas),
    ...Object.fromEntries(visiveis.map((c) => [c.id, valor(c.linhas[i], i, c.linhas)])),
  }))
  const fmt = (v: number) => (metrica === 'fator' ? fatorTxt(v) : formatBRL(v))
  const ind = new Map([base, ...visiveis].map((c) => [c.id, indicadores(c.linhas, contribuicao)]))
  const ib = ind.get(base.id)!

  type Linha = { rotulo: string; v: (x: ReturnType<typeof indicadores>) => number; txt: (n: number) => string; menorMelhor?: boolean; dica?: string; pontos?: boolean }
  const LINHAS: Linha[] = [
    { rotulo: 'Receita (meta)', v: (x) => x.receita, txt: formatBRL },
    { rotulo: 'Despesas fixas', v: (x) => x.df, txt: formatBRL, menorMelhor: true },
    { rotulo: 'Lucro', v: (x) => x.lucro, txt: formatBRL },
    { rotulo: 'Margem sobre a receita', v: (x) => x.margem, txt: (n) => formatPct(n, 1), pontos: true },
    { rotulo: 'Meses no vermelho', v: (x) => x.mesesNoVermelho, txt: String, menorMelhor: true },
    { rotulo: 'Pior mês', v: (x) => x.piorMes?.lucro ?? 0, txt: formatBRL },
    { rotulo: 'Equilíbrio médio por mês', v: (x) => x.equilibrioMedio, txt: formatBRL, menorMelhor: true, dica: 'Quanto precisa faturar no mês para pagar as despesas fixas.' },
    { rotulo: 'Fator médio do preço', v: (x) => x.fatorMedio, txt: fatorTxt, menorMelhor: true, dica: 'Fator maior = preço novo mais alto para manter o lucro.' },
    { rotulo: 'Pode cair até zerar o lucro', v: (x) => x.quedaAteZerar, txt: (n) => formatPct(n, 1), pontos: true, dica: 'Quanto o faturamento pode cair antes de o período dar prejuízo.' },
  ]

  return (
    <div className={s.cartao}>
      <div className={s.cmpTopo}>
        <div className={s.cartaoTitulo}><GitCompareArrows size={15} /> Comparar cenários · {escopo}</div>
        <div className={s.cmpEscolha} role="group" aria-label="Cenários na comparação">
          <span className={s.cmpChip} aria-disabled="true"><i className={s.cmpTraco} /> Base</span>
          {cenarios.map((c) => {
            const on = ids.includes(c.id)
            return (
              <button key={c.id} type="button" className={`${s.cmpChip} ${on ? s.cmpChipOn : ''}`} aria-pressed={on} onClick={() => alternar(c.id)} disabled={!on && ids.length >= MAX} title={!on && ids.length >= MAX ? `Até ${MAX} cenários por vez` : undefined}>
                <i style={{ background: on ? corDe(c.id) : 'transparent', borderColor: corDe(c.id) }} /> {c.nome}
              </button>
            )
          })}
        </div>
      </div>
      {cenarios.length === 0 ? (
        <p className={s.textoBase}>Crie um cenário (contratar, perder um cliente, reajustar) para compará-lo com a base.</p>
      ) : (
        <>
          <div className={s.cmpMetricas} role="radiogroup" aria-label="O que comparar">
            {METRICAS.map((m) => (
              <button key={m.id} type="button" role="radio" aria-checked={metrica === m.id} className={metrica === m.id ? s.cmpMetricaOn : ''} onClick={() => setMetrica(m.id)}>{m.rotulo}</button>
            ))}
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={dados} margin={{ top: 10, right: 18, bottom: 4, left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ede9e0" vertical={false} />
              <XAxis dataKey="rotulo" tick={{ fontSize: 12, fill: '#6b7b72' }} />
              <YAxis tickFormatter={metrica === 'fator' ? (v: number) => v.toFixed(2) : kBRL} tick={{ fontSize: 12, fill: '#6b7b72' }} width={64} domain={metrica === 'fator' ? ['auto', 'auto'] : undefined} />
              <Tooltip formatter={(v) => fmt(Number(v))} contentStyle={{ borderRadius: 10, border: '1px solid #e6e3db', fontSize: 13 }} />
              <Legend verticalAlign="top" height={28} wrapperStyle={{ fontSize: 12, paddingBottom: 6 }} />
              <Line isAnimationActive={false} dataKey="base" name="Base" stroke={COR_BASE} strokeDasharray="5 4" strokeWidth={2} dot={false} />
              {visiveis.map((c) => (
                <Line key={c.id} isAnimationActive={false} dataKey={c.id} name={c.nome} stroke={corDe(c.id)} strokeWidth={2} dot={{ r: 3, fill: corDe(c.id), stroke: '#fff', strokeWidth: 1.5 }} activeDot={{ r: 5 }} />
              ))}
            </LineChart>
          </ResponsiveContainer>

          {visiveis.length > 0 && (
            <div className={s.ponteGrade}>
              {visiveis.map((c) => {
                const ponte = ponteDoLucro(base.linhas, c.linhas, contribuicao)
                const impactos = impactoDasHipoteses(rodar, c.hipoteses)
                const maior = Math.max(1, ...impactos.map((x) => Math.abs(x.lucro)), Math.abs(ponte.receita), Math.abs(ponte.despesas))
                const ic = ind.get(c.id)!
                return (
                  <div key={c.id} className={s.ponte}>
                    <div className={s.ponteTitulo}><i style={{ background: corDe(c.id) }} /> {c.nome}</div>
                    <div className={s.ponteLucro}>
                      <span>Lucro 12 meses</span>
                      <b>{formatBRL(ib.lucro)} → {formatBRL(ic.lucro)}</b>
                      <Delta v={ic.lucro - ib.lucro} txt={formatBRL} />
                    </div>
                    <div className={s.ponteSub}>De onde vem a diferença</div>
                    <Barra rotulo="Receita" dica="O que a receita a mais (ou a menos) deixa de lucro, depois de DV e impostos" valor={ponte.receita} maior={maior} />
                    <Barra rotulo="Despesas fixas" dica="Economia (+) ou gasto a mais (−) com despesas fixas" valor={ponte.despesas} maior={maior} />
                    {impactos.length > 0 && (
                      <>
                        <div className={s.ponteSub}>Impacto de cada hipótese no lucro</div>
                        {impactos.map((x) => <Barra key={x.hipotese.id} rotulo={`${x.hipotese.nome} · ${ROTULO_HIPOTESE[x.hipotese.tipo].toLowerCase()}`} valor={x.lucro} maior={maior} />)}
                      </>
                    )}
                    {impactos.length === 0 && <p className={s.textoBase}>Sem hipóteses ligadas: igual à base.</p>}
                  </div>
                )
              })}
            </div>
          )}

          <div className={ui.tableScroll}>
            <table className={`${ui.table} ${s.tabela} ${s.cmpTabela}`}>
              <thead>
                <tr>
                  <th>12 meses</th>
                  <th className={ui.right}><i className={s.cmpTracoTh} /> Base</th>
                  {visiveis.map((c) => <th key={c.id} className={ui.right}><i className={s.cmpPonto} style={{ background: corDe(c.id) }} /> {c.nome}</th>)}
                </tr>
              </thead>
              <tbody>
                {LINHAS.map((l) => (
                  <tr key={l.rotulo}>
                    <td className={ui.cellStrong} title={l.dica}>{l.rotulo}</td>
                    <td className={ui.right}>{l.txt(l.v(ib))}{l.rotulo === 'Pior mês' && ib.piorMes ? <small className={s.cmpMes}> {ib.piorMes.rotulo}</small> : null}</td>
                    {visiveis.map((c) => {
                      const x = ind.get(c.id)!
                      return (
                        <td key={c.id} className={ui.right}>
                          {l.txt(l.v(x))}{l.rotulo === 'Pior mês' && x.piorMes ? <small className={s.cmpMes}> {x.piorMes.rotulo}</small> : null}
                          <Delta v={l.v(x) - l.v(ib)} txt={l.pontos ? pontos : l.txt} menorMelhor={l.menorMelhor} />
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}

/** Diferença sobre a base: sinal, seta e texto (nunca só a cor). */
function Delta({ v, txt, menorMelhor }: { v: number; txt: (n: number) => string; menorMelhor?: boolean }) {
  if (Math.abs(v) < 1e-6) return <span className={s.delta}><Minus size={11} /> igual</span>
  const bom = menorMelhor ? v < 0 : v > 0
  const Seta = v > 0 ? ArrowUpRight : ArrowDownRight
  return <span className={`${s.delta} ${bom ? s.deltaBom : s.deltaRuim}`}><Seta size={11} /> {sinal(v)}{txt(Math.abs(v))}</span>
}

/** Barra horizontal a partir do centro: à direita soma lucro, à esquerda tira. */
function Barra({ rotulo, dica, valor, maior }: { rotulo: string; dica?: string; valor: number; maior: number }) {
  const pct = Math.min(50, (Math.abs(valor) / maior) * 50)
  return (
    <div className={s.barra}>
      <span className={s.barraRotulo} title={dica ?? rotulo}>{rotulo}</span>
      <span className={s.barraTrilho} aria-hidden>
        <i className={valor >= 0 ? s.barraMais : s.barraMenos} style={valor >= 0 ? { left: '50%', width: `${pct}%` } : { right: '50%', width: `${pct}%` }} />
      </span>
      <b className={valor >= 0 ? s.bom : s.ruim}>{sinal(valor)}{formatBRL(Math.abs(valor))}</b>
    </div>
  )
}

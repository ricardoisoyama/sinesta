import { useState } from 'react'
import { useQueries } from '@tanstack/react-query'
import { Bar, CartesianGrid, Cell, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { AlertTriangle, BadgeCheck, CalendarClock, Copy, Gauge, Layers, LineChart, Plus, Scale, Trash2, TrendingDown, TrendingUp, Wallet } from 'lucide-react'
import ui from '@/features/common/ui.module.css'
import { PageHeader } from '@/features/common/PageHeader'
import { AvisoPrototipo } from '@/features/common/AvisoPrototipo'
import { avisar } from '@/features/common/dialogo/dialogo'
import { formatBRL, formatPct } from '@/lib/format'
import { useCustosFixosQuery, useEmpresasQuery } from '@/features/cadastros/hooks'
import { useMetas } from '@/features/metas/store'
import { calcularFator, type FatorResultado } from '@/features/pricing/api'
import { percentualDaEmpresa } from '@/features/custosFixos/regras'
import { custoNoMes, dfDoMes, projetar, proximosMeses, receitaDoMes, resumir, ROTULO_HIPOTESE, type Hipotese, type LinhaMes, type Mes, type TipoHipotese } from './motor'
import s from './projecao.module.css'

interface Cenario {
  id: string
  nome: string
  hipoteses: Hipotese[]
}

const CHAVE = 'elrond.projecao.cenarios.v1'
/** Id novo (fora dos componentes: Date.now não é puro). */
const novoId = (p: string) => `${p}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
const kBRL = (v: number) => `${v < 0 ? '−' : ''}R$ ${Math.round(Math.abs(v) / 1000)}k`
const fatorTxt = (f: number) => (f > 0 ? f.toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 }) : '—')
const PORCENTO: TipoHipotese[] = ['reajuste-custos', 'variacao-meta']

/** Cenários de exemplo, montados em volta do mês corrente (só na primeira vez neste navegador). */
function exemplos(meses: Mes[]): Cenario[] {
  const jan = `${meses[0].ano + 1}-01`
  return [
    { id: 'supervisor', nome: 'Contratar supervisor', hipoteses: [{ id: 'h1', tipo: 'novo-custo', nome: 'Supervisor operacional (salário + encargos)', valor: 7800, inicio: meses[1].chave, ativa: true }] },
    {
      id: 'otimista',
      nome: 'Otimista',
      hipoteses: [
        { id: 'h2', tipo: 'nova-receita', nome: 'Cliente novo: condomínio (terceirização)', valor: 25000, inicio: meses[2].chave, ativa: true },
        { id: 'h3', tipo: 'variacao-meta', nome: 'Meta 10% acima', valor: 0.1, inicio: meses[3].chave, ativa: true },
      ],
    },
    {
      id: 'pessimista',
      nome: 'Pessimista',
      hipoteses: [
        { id: 'h4', tipo: 'variacao-meta', nome: 'Perder 15% do faturamento', valor: -0.15, inicio: meses[1].chave, ativa: true },
        { id: 'h5', tipo: 'reajuste-custos', nome: 'Dissídio e reajustes de janeiro', valor: 0.06, inicio: jan, ativa: true },
      ],
    },
  ]
}

function lerCenarios(meses: Mes[]): Cenario[] {
  try {
    const bruto = localStorage.getItem(CHAVE)
    if (bruto) return JSON.parse(bruto) as Cenario[]
  } catch {
    // armazenamento indisponível: usa os exemplos
  }
  return exemplos(meses)
}

/**
 * Projeção (protótipo): 12 meses para frente com a META como receita e a DF dos cadastros (reais).
 * Hipóteses só existem no cenário; os cadastros não mudam. "Efetivar" (fase 3) cria o registro real.
 */
export function ProjecaoPage() {
  const [meses] = useState(() => proximosMeses(new Date()))
  const { data: empresasData } = useEmpresasQuery()
  const { data: custosData } = useCustosFixosQuery()
  const { metas } = useMetas()
  const empresas = (empresasData ?? []).filter((e) => e.status === 'ativo')
  const custos = custosData ?? []
  const fatores = useQueries({
    queries: empresas.map((e) => ({
      queryKey: ['fator', JSON.stringify({ empresaId: e.id })],
      queryFn: () => calcularFator({ empresaId: e.id }),
      staleTime: 60_000,
    })),
  })
  const fatorDe = (id: string): FatorResultado | undefined => fatores.find((q) => q.data?.empresaId === id)?.data

  const [escopo, setEscopo] = useState<string>('grupo')
  const [cenarios, setCenariosEstado] = useState<Cenario[]>(() => lerCenarios(meses))
  const [ativo, setAtivo] = useState<string>(() => cenarios[0]?.id ?? 'base')
  const [sensibilidade, setSensibilidade] = useState(0)
  const salvarCenarios = (lista: Cenario[]) => {
    setCenariosEstado(lista)
    try {
      localStorage.setItem(CHAVE, JSON.stringify(lista))
    } catch {
      // sem armazenamento: vale só nesta visita
    }
  }

  const ids = escopo === 'grupo' ? empresas.map((e) => e.id) : [escopo]
  const nomeEscopo = escopo === 'grupo' ? 'Grupo (todas as empresas)' : empresas.find((e) => e.id === escopo)?.nome ?? ''

  // Parâmetros do preço: ponderados pela receita de cada empresa no horizonte.
  const pesos = ids.map((id) => ({ id, peso: meses.reduce((a, m) => a + (receitaDoMes(metas, id, m)?.valor ?? 0), 0), f: fatorDe(id) }))
  const pesoTotal = pesos.reduce((a, p) => a + p.peso, 0)
  const media = (fn: (f: FatorResultado) => number) => (pesoTotal > 0 ? pesos.reduce((a, p) => a + (p.f ? fn(p.f) * p.peso : 0), 0) / pesoTotal : 0)
  const parametros = { contribuicao: media((f) => f.dfPct + f.lucro), dvSemLucro: media((f) => f.dvSemLucro), lucro: media((f) => f.lucro) }
  const semFator = pesos.filter((p) => !p.f?.pronto).map((p) => ({ nome: empresas.find((e) => e.id === p.id)?.nome ?? p.id, aviso: p.f?.aviso }))

  const receita = (m: Mes) => {
    const v = ids.map((id) => receitaDoMes(metas, id, m))
    if (v.every((x) => x === null)) return null
    return { valor: v.reduce((a, x) => a + (x?.valor ?? 0), 0), repetida: v.some((x) => x?.repetida) }
  }
  const df = (m: Mes) => dfDoMes(custos, ids, m)
  const valorDoCusto = (custoId: string, m: Mes) => {
    const c = custos.find((x) => x.id === custoId)
    return c && custoNoMes(c, m) ? c.valorMensal * Math.min(1, ids.reduce((a, id) => a + percentualDaEmpresa(c, id), 0)) : 0
  }
  const rodar = (hipoteses: Hipotese[], sens = 0) => projetar({ meses, receita, df, valorDoCusto, parametros, hipoteses, sensibilidade: sens })

  const cenario = cenarios.find((c) => c.id === ativo)
  const linhasBase = rodar([])
  const linhas = rodar(cenario?.hipoteses ?? [], sensibilidade)
  const rBase = resumir(linhasBase, parametros.contribuicao)
  const r = resumir(linhas, parametros.contribuicao)
  const carregando = !empresasData || !custosData || fatores.some((q) => q.isLoading)

  const soma = (lista: LinhaMes[], ate: number) => lista.slice(0, ate + 1).reduce((a, l) => a + l.lucro, 0)
  const dados = linhas.map((l, i) => ({ ...l, receitaBase: linhasBase[i].receita, acumulado: soma(linhas, i), acumuladoBase: soma(linhasBase, i) }))

  const alterarHipoteses = (fn: (h: Hipotese[]) => Hipotese[]) => {
    if (!cenario) return
    salvarCenarios(cenarios.map((c) => (c.id === cenario.id ? { ...c, hipoteses: fn(c.hipoteses) } : c)))
  }
  const novoCenario = (copiar?: Cenario) => {
    const id = novoId('c')
    salvarCenarios([...cenarios, { id, nome: copiar ? `${copiar.nome} (cópia)` : `Cenário ${cenarios.length + 1}`, hipoteses: copiar ? copiar.hipoteses.map((h) => ({ ...h, id: `${h.id}-${id}` })) : [] }])
    setAtivo(id)
  }

  // Alertas do horizonte: despesas que começam ou acabam, meses sem meta, meses no vermelho.
  const fimHorizonte = meses[meses.length - 1].chave
  const doEscopo = custos.filter((c) => c.status === 'ativo' && c.tipo !== 'spot' && ids.some((id) => percentualDaEmpresa(c, id) > 0))
  const comecam = doEscopo.filter((c) => c.dataInicio && c.dataInicio.slice(0, 7) > meses[0].chave && c.dataInicio.slice(0, 7) <= fimHorizonte)
  const terminam = doEscopo.filter((c) => c.dataFim && c.dataFim < '9999' && c.dataFim.slice(0, 7) >= meses[0].chave && c.dataFim.slice(0, 7) <= fimHorizonte)
  const semMeta = linhas.filter((l) => l.semMeta)
  const repetidas = linhas.filter((l) => l.metaRepetida)
  const vermelho = linhas.filter((l) => l.lucro < 0)
  const rotuloMes = (iso: string) => meses.find((m) => m.chave === iso.slice(0, 7))?.rotulo ?? iso.slice(0, 7)

  // Fator: o do primeiro mês em que o cenário muda alguma coisa (senão, o do mês corrente).
  const iFator = Math.max(0, linhas.findIndex((l, i) => Math.abs(l.fator - linhasBase[i].fator) > 1e-6))
  const fatorHoje = linhas[iFator]?.fator ?? 0
  const fatorBaseHoje = linhasBase[iFator]?.fator ?? 0
  const rSemSens = resumir(rodar(cenario?.hipoteses ?? []), parametros.contribuicao)
  const delta = (a: number, b: number) => (b ? (a - b) / Math.abs(b) : 0)

  return (
    <div>
      <PageHeader
        breadcrumb="Relatórios"
        title="Projeção"
        subtitle="Os próximos 12 meses com a meta como receita e as despesas fixas dos cadastros. As hipóteses vivem só no cenário: nada nos cadastros muda."
        action={
          <select className={ui.filterSelect} value={escopo} onChange={(e) => setEscopo(e.target.value)} aria-label="Empresa ou grupo">
            <option value="grupo">Grupo (todas as empresas)</option>
            {empresas.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
          </select>
        }
      />
      <AvisoPrototipo>a base vem dos seus cadastros reais (despesas fixas, metas e o fator de cada empresa); os cenários ficam guardados só neste navegador.</AvisoPrototipo>

      {semFator.length > 0 && !carregando && (
        <div className={s.avisoFator}>
          <AlertTriangle size={15} />
          <span>
            O Pricing ainda não fecha o fator de {semFator.map((x) => x.nome).join(', ')}
            {semFator[0].aviso ? ` (${semFator[0].aviso})` : ''}. A projeção usa o que já existe; os números dessas empresas podem estar incompletos.
          </span>
        </div>
      )}

      {/* cenários */}
      <div className={s.cenarios} role="tablist" aria-label="Cenários">
        <button type="button" role="tab" aria-selected={ativo === 'base'} className={`${s.cenario} ${ativo === 'base' ? s.cenarioOn : ''}`} onClick={() => setAtivo('base')}>
          <Layers size={14} /> Base <small>cadastros</small>
        </button>
        {cenarios.map((c) => (
          <button key={c.id} type="button" role="tab" aria-selected={ativo === c.id} className={`${s.cenario} ${ativo === c.id ? s.cenarioOn : ''}`} onClick={() => setAtivo(c.id)}>
            {c.nome} <small>{c.hipoteses.filter((h) => h.ativa).length} hipótese(s)</small>
          </button>
        ))}
        <button type="button" className={s.cenarioNovo} onClick={() => novoCenario()}><Plus size={14} /> Novo cenário</button>
      </div>

      {/* números do período */}
      <div className={s.kpis}>
        <Kpi icone={TrendingUp} rotulo="Receita (meta) · 12 meses" valor={formatBRL(r.receita)} delta={cenario ? delta(r.receita, rBase.receita) : null} />
        <Kpi icone={Wallet} rotulo="Despesas fixas · 12 meses" valor={formatBRL(r.df)} delta={cenario ? delta(r.df, rBase.df) : null} inverso />
        <Kpi icone={Scale} rotulo="Lucro projetado · 12 meses" valor={formatBRL(r.lucro)} delta={cenario ? delta(r.lucro, rBase.lucro) : null} destaque={r.lucro < 0 ? 'ruim' : 'bom'} />
        <Kpi icone={CalendarClock} rotulo="Meses no vermelho" valor={String(r.mesesNoVermelho)} sub={r.mesesNoVermelho ? vermelho.map((l) => l.rotulo).join(', ') : 'nenhum mês abaixo do equilíbrio'} destaque={r.mesesNoVermelho ? 'ruim' : undefined} />
        <Kpi
          icone={Gauge}
          rotulo={`Fator dos preços novos · ${linhas[iFator]?.rotulo ?? ''}`}
          valor={fatorTxt(fatorHoje)}
          sub={cenario ? `base ${fatorTxt(fatorBaseHoje)} · ${fatorHoje > fatorBaseHoje ? '+' : ''}${formatPct(delta(fatorHoje, fatorBaseHoje), 1)} no preço` : `DF ${formatPct(linhas[iFator]?.dfPct ?? 0, 1)} da receita do mês`}
        />
      </div>

      <div className={s.grade}>
        <div className={s.coluna}>
          <div className={s.cartao}>
            <div className={s.cartaoTitulo}><LineChart size={15} /> Receita × ponto de equilíbrio · {nomeEscopo}</div>
            <ResponsiveContainer width="100%" height={270}>
              <ComposedChart data={dados} margin={{ top: 10, right: 16, bottom: 4, left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ede9e0" vertical={false} />
                <XAxis dataKey="rotulo" tick={{ fontSize: 12, fill: '#6b7b72' }} />
                <YAxis tickFormatter={kBRL} tick={{ fontSize: 12, fill: '#6b7b72' }} width={64} />
                <Tooltip formatter={(v) => formatBRL(Number(v))} cursor={{ fill: 'rgba(26,77,30,0.05)' }} contentStyle={{ borderRadius: 10, border: '1px solid #e6e3db', fontSize: 13 }} />
                <Legend verticalAlign="top" height={28} wrapperStyle={{ fontSize: 12, paddingBottom: 6 }} />
                <Bar isAnimationActive={false} dataKey="receita" name={cenario ? `Receita · ${cenario.nome}` : 'Receita (meta)'} fill="#1a4d1e" radius={[3, 3, 0, 0]} maxBarSize={34} />
                {cenario && <Line isAnimationActive={false} dataKey="receitaBase" name="Receita · base" stroke="#9aa39b" strokeDasharray="4 4" dot={false} strokeWidth={2} />}
                <Line isAnimationActive={false} dataKey="equilibrio" name="Ponto de equilíbrio" stroke="#e8702f" strokeWidth={2.5} dot={{ r: 3, fill: '#e8702f' }} />
              </ComposedChart>
            </ResponsiveContainer>
            <div className={s.nota}>Abaixo da linha laranja o mês não paga as despesas fixas. Equilíbrio = DF do mês ÷ {formatPct(parametros.contribuicao, 1)} (a parte do preço que cobre DF e lucro).</div>
          </div>

          <div className={s.cartao}>
            <div className={s.cartaoTitulo}><Scale size={15} /> Lucro do mês e acumulado</div>
            <ResponsiveContainer width="100%" height={240}>
              <ComposedChart data={dados} margin={{ top: 10, right: 16, bottom: 4, left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ede9e0" vertical={false} />
                <XAxis dataKey="rotulo" tick={{ fontSize: 12, fill: '#6b7b72' }} />
                <YAxis tickFormatter={kBRL} tick={{ fontSize: 12, fill: '#6b7b72' }} width={64} />
                <Tooltip formatter={(v) => formatBRL(Number(v))} cursor={{ fill: 'rgba(26,77,30,0.05)' }} contentStyle={{ borderRadius: 10, border: '1px solid #e6e3db', fontSize: 13 }} />
                <Legend verticalAlign="top" height={28} wrapperStyle={{ fontSize: 12, paddingBottom: 6 }} />
                <Bar isAnimationActive={false} dataKey="lucro" name="Lucro do mês" fill="#2e7d44" radius={[3, 3, 0, 0]} maxBarSize={34}>
                  {dados.map((d) => <Cell key={d.chave} fill={d.lucro >= 0 ? '#2e7d44' : '#c0392b'} />)}
                </Bar>
                <Line isAnimationActive={false} dataKey="acumulado" name="Acumulado" stroke="#143d18" strokeWidth={2.5} dot={false} />
                {cenario && <Line isAnimationActive={false} dataKey="acumuladoBase" name="Acumulado · base" stroke="#9aa39b" strokeDasharray="4 4" dot={false} strokeWidth={2} />}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className={s.coluna}>
          <PainelHipoteses
            cenario={cenario}
            meses={meses}
            custos={doEscopo.map((c) => ({ id: c.id, nome: c.descricao, valor: c.valorMensal }))}
            onAlterar={alterarHipoteses}
            onRenomear={(nome) => cenario && salvarCenarios(cenarios.map((c) => (c.id === cenario.id ? { ...c, nome } : c)))}
            onDuplicar={() => cenario && novoCenario(cenario)}
            onExcluir={() => {
              if (!cenario) return
              salvarCenarios(cenarios.filter((c) => c.id !== cenario.id))
              setAtivo('base')
            }}
          />

          <div className={s.cartao}>
            <div className={s.cartaoTitulo}><Gauge size={15} /> Sensibilidade do faturamento</div>
            <input className={s.slider} type="range" min={-30} max={30} step={1} value={Math.round(sensibilidade * 100)} onChange={(e) => setSensibilidade(Number(e.target.value) / 100)} aria-label="Variação do faturamento" />
            <div className={s.sliderEscala}><span>−30%</span><b>{sensibilidade > 0 ? '+' : ''}{Math.round(sensibilidade * 100)}%</b><span>+30%</span></div>
            <div className={s.sensResposta}>
              Com o faturamento {sensibilidade === 0 ? 'como está' : `${sensibilidade > 0 ? '+' : ''}${Math.round(sensibilidade * 100)}%`}, o lucro em 12 meses é <b className={r.lucro < 0 ? s.ruim : s.bom}>{formatBRL(r.lucro)}</b>.
              {' '}
              {rSemSens.lucro >= 0 ? (
                <>O faturamento pode cair até <b>{formatPct(rSemSens.quedaAteZerar, 1)}</b> antes de o período dar prejuízo.</>
              ) : (
                <>Neste cenário o período já dá prejuízo: o faturamento precisa subir <b>{formatPct(rSemSens.altaParaZerar, 1)}</b> para empatar.</>
              )}
            </div>
          </div>

          <div className={s.cartao}>
            <div className={s.cartaoTitulo}><AlertTriangle size={15} /> No horizonte</div>
            <ul className={s.alertas}>
              {comecam.map((c) => <li key={`i${c.id}`}><TrendingUp size={13} /> <span><b>{c.descricao}</b> começa em {rotuloMes(c.dataInicio)} ({formatBRL(c.valorMensal)}/mês)</span></li>)}
              {terminam.map((c) => <li key={`f${c.id}`}><TrendingDown size={13} /> <span><b>{c.descricao}</b> termina em {rotuloMes(c.dataFim)}</span></li>)}
              {repetidas.length > 0 && <li><CalendarClock size={13} /> <span>Sem meta para {repetidas[0].ano}: {repetidas.map((l) => l.rotulo).join(', ')} repetem a meta do mesmo mês de {repetidas[0].ano - 1}. Cadastre a meta do ano em Metas.</span></li>}
              {semMeta.length > 0 && <li className={s.alertaRuim}><AlertTriangle size={13} /> <span>Sem meta cadastrada para {semMeta.map((l) => l.rotulo).join(', ')}: a receita desses meses fica zerada.</span></li>}
              {vermelho.length > 0 && <li className={s.alertaRuim}><AlertTriangle size={13} /> <span>{vermelho.length} mês(es) abaixo do ponto de equilíbrio neste cenário.</span></li>}
              {!comecam.length && !terminam.length && !semMeta.length && !vermelho.length && !repetidas.length &&<li><BadgeCheck size={13} /> <span>Nada fora do normal nos próximos 12 meses.</span></li>}
            </ul>
          </div>
        </div>
      </div>

      {/* comparação */}
      <div className={s.cartao}>
        <div className={s.cartaoTitulo}><Layers size={15} /> Cenários lado a lado · {nomeEscopo}</div>
        <div className={ui.tableScroll}>
          <table className={`${ui.table} ${s.tabela}`}>
            <thead>
              <tr>
                <th>Cenário</th>
                <th className={ui.right}>Receita 12m</th>
                <th className={ui.right}>Despesas fixas 12m</th>
                <th className={ui.right}>Lucro 12m</th>
                <th className={ui.right}>Meses no vermelho</th>
                <th className={ui.right}>Fator {linhas[0]?.rotulo}</th>
              </tr>
            </thead>
            <tbody>
              {[{ id: 'base', nome: 'Base (cadastros)', hipoteses: [] as Hipotese[] }, ...cenarios].map((c) => {
                const l = rodar(c.hipoteses)
                const x = resumir(l, parametros.contribuicao)
                return (
                  <tr key={c.id} className={c.id === ativo ? s.linhaAtiva : undefined} onClick={() => setAtivo(c.id)}>
                    <td className={ui.cellStrong}>{c.nome}</td>
                    <td className={ui.right}>{formatBRL(x.receita)}</td>
                    <td className={ui.right}>{formatBRL(x.df)}</td>
                    <td className={`${ui.right} ${x.lucro < 0 ? s.ruim : s.bom}`}>{formatBRL(x.lucro)}</td>
                    <td className={ui.right}>{x.mesesNoVermelho}</td>
                    <td className={ui.right}>{fatorTxt(l[0]?.fator ?? 0)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <details className={`${s.cartao} ${s.mesAMes}`}>
        <summary>Ver mês a mês</summary>
        <TabelaMeses linhas={linhas} />
      </details>
    </div>
  )
}

function Kpi({ icone: Icone, rotulo, valor, sub, delta, inverso, destaque }: { icone: typeof Gauge; rotulo: string; valor: string; sub?: string; delta?: number | null; inverso?: boolean; destaque?: 'bom' | 'ruim' }) {
  const bom = delta !== null && delta !== undefined && (inverso ? delta < 0 : delta > 0)
  return (
    <div className={s.kpi}>
      <div className={s.kpiRotulo}><Icone size={14} /> {rotulo}</div>
      <div className={`${s.kpiValor} ${destaque === 'ruim' ? s.ruim : destaque === 'bom' ? s.bomForte : ''}`}>{valor}</div>
      {delta !== null && delta !== undefined && Math.abs(delta) > 0.0005 ? (
        <div className={`${s.kpiSub} ${bom ? s.bom : s.ruim}`}>{delta > 0 ? '+' : ''}{formatPct(delta, 1)} sobre a base</div>
      ) : (
        <div className={s.kpiSub}>{sub ?? (delta !== null && delta !== undefined ? 'igual à base' : ' ')}</div>
      )}
    </div>
  )
}

interface PainelProps {
  cenario: Cenario | undefined
  meses: Mes[]
  custos: { id: string; nome: string; valor: number }[]
  onAlterar: (fn: (h: Hipotese[]) => Hipotese[]) => void
  onRenomear: (nome: string) => void
  onDuplicar: () => void
  onExcluir: () => void
}

function PainelHipoteses({ cenario, meses, custos, onAlterar, onRenomear, onDuplicar, onExcluir }: PainelProps) {
  const vazio = { tipo: 'novo-custo' as TipoHipotese, nome: '', valor: 0, inicio: meses[1]?.chave ?? meses[0].chave, fim: '', custoId: '' }
  const [form, setForm] = useState(vazio)
  const [abrindo, setAbrindo] = useState(false)
  const rotulo = (chave: string) => meses.find((m) => m.chave === chave)?.rotulo ?? chave

  if (!cenario)
    return (
      <div className={s.cartao}>
        <div className={s.cartaoTitulo}><Layers size={15} /> Base</div>
        <p className={s.textoBase}>A base é o que está nos cadastros: a meta de cada mês e as despesas fixas com a vigência delas. Não tem hipóteses. Escolha ou crie um cenário para simular uma contratação, a perda de um cliente ou um reajuste.</p>
      </div>
    )

  const porcento = PORCENTO.includes(form.tipo)
  const valido = form.tipo === 'cortar-custo' ? !!form.custoId : form.valor !== 0
  const adicionar = () => {
    const nomeAuto = form.tipo === 'cortar-custo' ? `Cortar: ${custos.find((c) => c.id === form.custoId)?.nome ?? ''}` : ROTULO_HIPOTESE[form.tipo]
    onAlterar((h) => [...h, { id: novoId('h'), tipo: form.tipo, nome: form.nome.trim() || nomeAuto, valor: porcento ? form.valor / 100 : form.valor, inicio: form.inicio, fim: form.fim || undefined, custoId: form.custoId || undefined, ativa: true }])
    setForm(vazio)
    setAbrindo(false)
  }

  return (
    <div className={s.cartao}>
      <div className={s.painelTopo}>
        <input className={s.nomeCenario} value={cenario.nome} onChange={(e) => onRenomear(e.target.value)} aria-label="Nome do cenário" />
        <button type="button" className={ui.iconBtn} title="Duplicar cenário" onClick={onDuplicar}><Copy /></button>
        <button type="button" className={ui.iconBtn} title="Excluir cenário" onClick={onExcluir}><Trash2 /></button>
      </div>
      <div className={s.cartaoTitulo}>Hipóteses</div>
      {cenario.hipoteses.length === 0 && <p className={s.textoBase}>Sem hipóteses: este cenário está igual à base.</p>}
      <ul className={s.hipoteses}>
        {cenario.hipoteses.map((h) => (
          <li key={h.id} className={h.ativa ? undefined : s.hipInativa}>
            <label className={s.hipChave} title={h.ativa ? 'Desligar a hipótese' : 'Ligar a hipótese'}>
              <input type="checkbox" checked={h.ativa} onChange={() => onAlterar((l) => l.map((x) => (x.id === h.id ? { ...x, ativa: !x.ativa } : x)))} />
            </label>
            <div className={s.hipTexto}>
              <b>{h.nome}</b>
              <span>
                {ROTULO_HIPOTESE[h.tipo]} ·{' '}
                {h.tipo === 'cortar-custo' ? '' : PORCENTO.includes(h.tipo) ? `${h.valor > 0 ? '+' : ''}${formatPct(h.valor, 0)}` : `${formatBRL(h.valor)}/mês`}
                {h.tipo === 'cortar-custo' ? '' : ' · '}a partir de {rotulo(h.inicio)}{h.fim ? ` até ${rotulo(h.fim)}` : ''}
              </span>
            </div>
            <button type="button" className={s.efetivar} title="Efetivar: criar o registro de verdade" onClick={() => void avisar({ titulo: 'Efetivar hipótese', mensagem: 'Efetivar cria o registro real (a despesa fixa, o ajuste da meta) com a data da hipótese e tira a hipótese do cenário. Fica para a fase 3; no protótipo não grava.' })}>Efetivar</button>
            <button type="button" className={ui.iconBtn} title="Tirar a hipótese" onClick={() => onAlterar((l) => l.filter((x) => x.id !== h.id))}><Trash2 /></button>
          </li>
        ))}
      </ul>

      {abrindo ? (
        <div className={s.hipForm}>
          <label>
            Tipo
            <select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value as TipoHipotese, valor: 0 })}>
              {(Object.keys(ROTULO_HIPOTESE) as TipoHipotese[]).map((t) => <option key={t} value={t}>{ROTULO_HIPOTESE[t]}</option>)}
            </select>
          </label>
          {form.tipo === 'cortar-custo' ? (
            <label className={s.hipLargo}>
              Despesa
              <select value={form.custoId} onChange={(e) => setForm({ ...form, custoId: e.target.value })}>
                <option value="">Escolha a despesa</option>
                {custos.map((c) => <option key={c.id} value={c.id}>{c.nome} · {formatBRL(c.valor)}</option>)}
              </select>
            </label>
          ) : (
            <>
              <label className={s.hipLargo}>
                Descrição
                <input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder={form.tipo === 'novo-custo' ? 'Ex.: 2 motoristas' : form.tipo === 'nova-receita' ? 'Ex.: cliente novo' : 'Ex.: dissídio'} />
              </label>
              <label>
                {porcento ? 'Percentual (%)' : 'Valor por mês (R$)'}
                <input type="number" step={porcento ? 1 : 100} value={form.valor} onChange={(e) => setForm({ ...form, valor: Number(e.target.value) })} />
              </label>
            </>
          )}
          <label>
            A partir de
            <select value={form.inicio} onChange={(e) => setForm({ ...form, inicio: e.target.value })}>
              {meses.map((m) => <option key={m.chave} value={m.chave}>{m.rotulo}</option>)}
            </select>
          </label>
          <label>
            Até
            <select value={form.fim} onChange={(e) => setForm({ ...form, fim: e.target.value })}>
              <option value="">o fim</option>
              {meses.filter((m) => m.chave >= form.inicio).map((m) => <option key={m.chave} value={m.chave}>{m.rotulo}</option>)}
            </select>
          </label>
          <div className={s.hipBotoes}>
            <button type="button" className={`${ui.btn} ${ui.btnGhost}`} onClick={() => setAbrindo(false)}>Cancelar</button>
            <button type="button" className={`${ui.btn} ${ui.btnPrimary}`} disabled={!valido} onClick={adicionar}>Incluir</button>
          </div>
        </div>
      ) : (
        <button type="button" className={`${ui.btn} ${ui.btnGhost} ${s.btnBloco}`} onClick={() => setAbrindo(true)}><Plus /> Incluir hipótese</button>
      )}
    </div>
  )
}

function TabelaMeses({ linhas }: { linhas: LinhaMes[] }) {
  return (
    <div className={ui.tableScroll}>
      <table className={`${ui.table} ${s.tabela}`}>
        <thead>
          <tr>
            <th>Mês</th>
            <th className={ui.right}>Receita (meta)</th>
            <th className={ui.right}>Despesas fixas</th>
            <th className={ui.right}>DF % da receita</th>
            <th className={ui.right}>Equilíbrio</th>
            <th className={ui.right}>Lucro</th>
            <th className={ui.right}>Fator</th>
          </tr>
        </thead>
        <tbody>
          {linhas.map((l) => (
            <tr key={l.chave}>
              <td className={ui.cellStrong}>
                {l.rotulo}
                {l.semMeta && <span className={s.semMeta}>sem meta</span>}
                {l.metaRepetida && <span className={s.metaRepetida}>meta de {l.ano - 1}</span>}
              </td>
              <td className={ui.right}>{formatBRL(l.receita)}</td>
              <td className={ui.right}>{formatBRL(l.df)}</td>
              <td className={ui.right}>{formatPct(l.dfPct, 1)}</td>
              <td className={ui.right}>{formatBRL(l.equilibrio)}</td>
              <td className={`${ui.right} ${l.lucro < 0 ? s.ruim : s.bom}`}>{formatBRL(l.lucro)}</td>
              <td className={ui.right}>{fatorTxt(l.fator)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

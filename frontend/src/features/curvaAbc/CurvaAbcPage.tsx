import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Bar, CartesianGrid, Cell, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ChartColumnDecreasing } from 'lucide-react'
import ui from '@/features/common/ui.module.css'
import c from '@/features/common/charts.module.css'
import { PageHeader } from '@/features/common/PageHeader'
import { CrudList } from '@/features/common/CrudList'
import type { Column } from '@/features/common/DataTable'
import { LARGURA } from '@/features/common/grid'
import { PercentInput } from '@/features/common/PercentInput'
import { apiFetch } from '@/lib/api'
import { formatBRL, formatPct } from '@/lib/format'
import { semAcento } from '@/lib/texto'
import { useEmpresasQuery } from '@/features/cadastros/hooks'
import s from './curvaAbc.module.css'

type Dimensao = 'clientes' | 'servicos' | 'fornecedores' | 'plano' | 'centro'
type Classe = 'A' | 'B' | 'C'

interface ItemCurva {
  posicao: number
  chave: string
  nome: string
  valor: number
  percentual: number
  acumulado: number
  classe: Classe
  quantidade: number
  margem: number | null
}
interface Curva {
  total: number
  itens: number
  classes: { classe: Classe; itens: number; valor: number; percentual: number }[]
  lista: ItemCurva[]
}

const DIMENSOES: { valor: Dimensao; label: string; quantidade: string }[] = [
  { valor: 'clientes', label: 'Clientes (faturamento)', quantidade: 'lançamentos' },
  { valor: 'servicos', label: 'Serviços (propostas aprovadas)', quantidade: 'itens' },
  { valor: 'fornecedores', label: 'Fornecedores (despesa)', quantidade: 'lançamentos' },
  { valor: 'plano', label: 'Plano de contas', quantidade: 'lançamentos' },
  { valor: 'centro', label: 'Centro de custo', quantidade: 'lançamentos' },
]
/** Cores das classes: A é o que mais pesa (verde escuro), B o meio (laranja), C a cauda (cinza). */
const COR: Record<Classe, string> = { A: '#1a4d1e', B: '#e8702f', C: '#a9b3ab' }
const TOM: Record<Classe, string> = { A: s.classeA, B: s.classeB, C: s.classeC }
const DICA: Record<Classe, string> = {
  A: 'Poucos itens que somam a maior parte: atenção máxima.',
  B: 'O meio do caminho: acompanhar.',
  C: 'A maioria dos itens, com pouco peso no total.',
}

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
/** Período: atalhos (meses fechados até hoje) ou de/até. */
function periodoDe(atalho: string, de: string, ate: string): [string, string] {
  const hoje = new Date()
  if (atalho === 'livre') return [de, ate]
  if (atalho === 'ano') return [`${hoje.getFullYear()}-01-01`, iso(hoje)]
  const meses = Number(atalho)
  return [iso(new Date(hoje.getFullYear(), hoje.getMonth() - meses + 1, 1)), iso(hoje)]
}

/**
 * Curva ABC (Pareto): quem sustenta a receita e onde está o grosso da despesa. Ordena do maior para o
 * menor e classifica pelo acumulado (A até 80%, B até 95%, C o resto; os cortes são ajustáveis).
 */
export function CurvaAbcPage() {
  const { data: empresasData } = useEmpresasQuery()
  const empresas = (empresasData ?? []).filter((e) => e.status === 'ativo')
  const [dimensao, setDimensao] = useState<Dimensao>('clientes')
  const [natureza, setNatureza] = useState<'receita' | 'despesa'>('receita')
  const [base, setBase] = useState<'lancado' | 'realizado'>('lancado')
  const [empresa, setEmpresa] = useState('')
  const [atalho, setAtalho] = useState('12')
  const hoje = new Date()
  const [de, setDe] = useState(iso(new Date(hoje.getFullYear(), 0, 1)))
  const [ate, setAte] = useState(iso(hoje))
  const [corteA, setCorteA] = useState(0.8)
  const [corteB, setCorteB] = useState(0.95)
  const [classe, setClasse] = useState<Classe | 'todas'>('todas')
  const [busca, setBusca] = useState('')
  const [pDe, pAte] = periodoDe(atalho, de, ate)
  const temNatureza = dimensao === 'plano' || dimensao === 'centro'
  const temBase = dimensao !== 'servicos'

  const params = new URLSearchParams({ dimensao, de: pDe, ate: pAte, natureza, base, corteA: String(corteA), corteB: String(corteB) })
  if (empresa) params.set('empresaId', empresa)
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['curva-abc', params.toString()],
    queryFn: () => apiFetch<Curva>(`/analises/curva-abc?${params.toString()}`),
    enabled: !!pDe && !!pAte && pDe <= pAte,
  })

  const q = semAcento(busca.trim())
  const linhas = (data?.lista ?? []).filter((i) => (classe === 'todas' || i.classe === classe) && (!q || semAcento(i.nome).includes(q)))
  const dim = DIMENSOES.find((d) => d.valor === dimensao)!
  const despesa = dimensao === 'fornecedores' || (temNatureza && natureza === 'despesa')
  // Gráfico: os 30 maiores (o resto entra no total e na tabela).
  const grafico = (data?.lista ?? []).slice(0, 30).map((i) => ({ nome: i.nome, pct: i.percentual * 100, acum: i.acumulado * 100, classe: i.classe, valor: i.valor }))

  const columns: Column<ItemCurva>[] = [
    { header: 'Nº', largura: LARGURA.numero, className: ui.right, valor: (i) => i.posicao, cell: (i) => <span className={ui.cellMut}>{i.posicao}</span> },
    { header: 'Classe', largura: LARGURA.curta, valor: (i) => i.classe, cell: (i) => <span className={`${s.classe} ${TOM[i.classe]}`}>{i.classe}</span> },
    { header: dim.label.split(' (')[0], fixa: true, valor: (i) => i.nome, cell: (i) => <span className={ui.cellStrong} title={i.nome}>{i.nome}</span> },
    { header: despesa ? 'Despesa' : 'Receita', className: ui.right, largura: LARGURA.valor, valor: (i) => i.valor, cell: (i) => <b>{formatBRL(i.valor)}</b> },
    { header: '% do total', className: ui.right, largura: LARGURA.curta, valor: (i) => i.percentual, cell: (i) => formatPct(i.percentual) },
    {
      header: 'Acumulado',
      largura: LARGURA.media,
      valor: (i) => i.acumulado,
      cell: (i) => (
        <div className={s.acumulado} title={formatPct(i.acumulado)}>
          <i style={{ width: `${Math.min(100, i.acumulado * 100)}%`, background: COR[i.classe] }} />
          <span>{formatPct(i.acumulado)}</span>
        </div>
      ),
    },
    { header: dim.quantidade[0].toUpperCase() + dim.quantidade.slice(1), className: ui.right, largura: LARGURA.curta, valor: (i) => i.quantidade, cell: (i) => <span className={ui.cellMut}>{i.quantidade}</span> },
    ...(dimensao === 'servicos'
      ? [{ header: 'Margem média', className: ui.right, largura: LARGURA.curta, valor: (i: ItemCurva) => i.margem ?? 0, cell: (i: ItemCurva) => (i.margem === null ? '—' : formatPct(i.margem)) } as Column<ItemCurva>]
      : []),
  ]

  return (
    <div>
      <PageHeader
        breadcrumb="Gerencial"
        title="Curva ABC"
        subtitle="Quem sustenta a receita e onde está o grosso da despesa: do maior para o menor, A são os poucos que somam a maior parte (até 80%), B o meio (até 95%), C a cauda."
      />

      <div className={s.filtros}>
        <select className={ui.filterSelect} value={dimensao} onChange={(e) => { setDimensao(e.target.value as Dimensao); setClasse('todas') }} aria-label="Analisar">
          {DIMENSOES.map((d) => <option key={d.valor} value={d.valor}>{d.label}</option>)}
        </select>
        {temNatureza && (
          <select className={ui.filterSelect} value={natureza} onChange={(e) => setNatureza(e.target.value as 'receita' | 'despesa')} aria-label="Receita ou despesa">
            <option value="receita">Receitas</option>
            <option value="despesa">Despesas</option>
          </select>
        )}
        {temBase && (
          <select className={ui.filterSelect} value={base} onChange={(e) => setBase(e.target.value as 'lancado' | 'realizado')} aria-label="Base">
            <option value="lancado">Lançado (pela competência)</option>
            <option value="realizado">Realizado (pago, pela data do pagamento)</option>
          </select>
        )}
        <select className={ui.filterSelect} value={empresa} onChange={(e) => setEmpresa(e.target.value)} aria-label="Empresa">
          <option value="">Todas as empresas</option>
          {empresas.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
        </select>
        <select className={ui.filterSelect} value={atalho} onChange={(e) => setAtalho(e.target.value)} aria-label="Período">
          <option value="1">Este mês</option>
          <option value="3">Últimos 3 meses</option>
          <option value="6">Últimos 6 meses</option>
          <option value="12">Últimos 12 meses</option>
          <option value="ano">Este ano</option>
          <option value="livre">Personalizado (de/até)</option>
        </select>
        {atalho === 'livre' && (
          <div className={s.periodo}>
            <input type="date" aria-label="De" value={de} onChange={(e) => setDe(e.target.value)} />
            <span>a</span>
            <input type="date" aria-label="Até" value={ate} min={de} onChange={(e) => setAte(e.target.value)} />
          </div>
        )}
        <div className={s.cortes} title="Até onde vai cada classe no acumulado">
          <span>A até</span>
          <PercentInput value={corteA} onChange={(n) => setCorteA(Math.min(0.98, Math.max(0.05, n)))} />
          <span>B até</span>
          <PercentInput value={corteB} onChange={(n) => setCorteB(Math.min(0.99, Math.max(corteA + 0.01, n)))} />
        </div>
      </div>

      {error && <div className={s.erro}>{(error as Error).message}</div>}

      <div className={c.kpis}>
        <div className={c.kpiCard}>
          <div className={c.kpiLabel}>{despesa ? 'Despesa total' : 'Receita total'}</div>
          <div className={c.kpiVal}>{formatBRL(data?.total ?? 0)}</div>
          <div className={c.kpiSub}>{data?.itens ?? 0} {dimensao === 'servicos' ? 'serviço(s)' : dimensao === 'clientes' ? 'cliente(s)' : dimensao === 'fornecedores' ? 'fornecedor(es)' : 'conta(s)'} no período</div>
        </div>
        {(['A', 'B', 'C'] as Classe[]).map((k) => {
          const cl = data?.classes.find((x) => x.classe === k)
          const pctItens = data?.itens ? (cl?.itens ?? 0) / data.itens : 0
          return (
            <button key={k} type="button" className={`${c.kpiCard} ${s.cartaoClasse} ${classe === k ? s.cartaoOn : ''}`} onClick={() => setClasse(classe === k ? 'todas' : k)} aria-pressed={classe === k} title={DICA[k]}>
              <div className={c.kpiLabel}><span className={`${s.classe} ${TOM[k]}`}>{k}</span> Classe {k}</div>
              <div className={c.kpiVal}>{formatPct(cl?.percentual ?? 0)}</div>
              <div className={c.kpiSub}>{cl?.itens ?? 0} item(ns) · {formatPct(pctItens)} dos itens · {formatBRL(cl?.valor ?? 0)}</div>
            </button>
          )
        })}
      </div>

      <div className={c.chartCard} style={{ marginTop: 14 }}>
        <div className={c.chartTitle}><ChartColumnDecreasing /> Pareto: participação de cada item e o acumulado</div>
        {grafico.length === 0 ? (
          <div className={c.note}>{isLoading ? 'Calculando...' : 'Nada no período com esses filtros.'}</div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={grafico} margin={{ top: 10, right: 16, bottom: 4, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ede9e0" vertical={false} />
              <XAxis dataKey="nome" tick={false} height={8} />
              <YAxis domain={[0, 100]} tickFormatter={(v: number) => `${v}%`} tick={{ fontSize: 11, fill: '#6b7b72' }} width={44} />
              <Tooltip
                formatter={(v, nome, item) => (nome === 'acum' ? [`${Number(v).toFixed(1)}%`, 'Acumulado'] : [`${Number(v).toFixed(1)}% · ${formatBRL((item?.payload as { valor: number }).valor)}`, 'Participação'])}
                labelFormatter={(l) => String(l)}
                contentStyle={{ borderRadius: 10, border: '1px solid #e6e3db', fontSize: 12.5 }}
              />
              <ReferenceLine y={corteA * 100} stroke={COR.A} strokeDasharray="4 4" label={{ value: `A ${Math.round(corteA * 100)}%`, position: 'insideTopRight', fontSize: 11, fill: COR.A }} />
              <ReferenceLine y={corteB * 100} stroke={COR.B} strokeDasharray="4 4" label={{ value: `B ${Math.round(corteB * 100)}%`, position: 'insideBottomRight', fontSize: 11, fill: COR.B }} />
              <Bar dataKey="pct" radius={[4, 4, 0, 0]} maxBarSize={28}>
                {grafico.map((g) => <Cell key={g.nome} fill={COR[g.classe]} />)}
              </Bar>
              <Line dataKey="acum" type="monotone" stroke="#143d18" strokeWidth={2} dot={{ r: 3 }} />
            </ComposedChart>
          </ResponsiveContainer>
        )}
        <div className={s.legenda}>
          {(['A', 'B', 'C'] as Classe[]).map((k) => <span key={k}><i style={{ background: COR[k] }} /> Classe {k}: {DICA[k]}</span>)}
          <span><i className={s.linha} /> Acumulado</span>
          {(data?.lista.length ?? 0) > 30 && <span className={ui.cellMut}>O gráfico mostra os 30 maiores; a tabela tem todos.</span>}
        </div>
      </div>

      <div style={{ marginTop: 14 }}>
        <CrudList
          id={`curva-abc-${dimensao}`}
          query={busca}
          onQuery={setBusca}
          searchPlaceholder="Buscar pelo nome..."
          columns={columns}
          rows={linhas}
          getKey={(i) => i.chave}
          rotulo={['item', 'itens']}
          pageSize={20}
          onAtualizar={() => refetch()}
          empty={isLoading ? 'Calculando...' : 'Nada no período com esses filtros.'}
          filters={
            <select className={ui.filterSelect} value={classe} onChange={(e) => setClasse(e.target.value as Classe | 'todas')} aria-label="Classe">
              <option value="todas">Todas as classes</option>
              <option value="A">Só a classe A</option>
              <option value="B">Só a classe B</option>
              <option value="C">Só a classe C</option>
            </select>
          }
        />
      </div>
    </div>
  )
}

import { useMemo, useState } from 'react'
import { Bar, CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { AlertTriangle, ChevronDown, ChevronRight, Landmark, Pencil, PiggyBank, Plus, TrendingUp, Wallet } from 'lucide-react'
import ui from '@/features/common/ui.module.css'
import { PageHeader } from '@/features/common/PageHeader'
import { Hint } from '@/features/common/Hint'
import { formatBRL } from '@/lib/format'
import { fluxoDeCaixa, hojeISO, liquidoDe, primeiroDiaDoMes, saldoCarteira, saldoPrevisto, somarDias, somarMeses, ultimoDiaDoMes, type Granularidade } from './calculos'
import { useFinanceiro } from './store'
import { CarteiraFormModal } from './CarteiraFormModal'
import { carteiraDaEmpresa, type Carteira } from './types'
import { useEmpresasQuery } from '@/features/cadastros/hooks'
import { empresaPadrao } from '@/features/unidades/types'
import s from './financeiro.module.css'

type Janela = '7' | '15' | '30' | 'mes' | 'proximo' | 'custom'
const kBRL = (v: number) => `${v < 0 ? '−' : ''}R$ ${Math.round(Math.abs(v) / 1000)}k`
const dataBR = (iso: string) => iso.split('-').reverse().join('/')

/**
 * Caixa: saldo de cada carteira hoje e previsto, e a linha do tempo de entradas e saídas
 * (realizado até hoje, previsto depois) com o saldo acumulado. Menos colunas que um extrato:
 * o detalhe abre por período.
 */
export function CaixaPage() {
  const { carteiras: todasCarteiras, movimentos: todosMovimentos, salvarCarteira } = useFinanceiro()
  const [editandoCarteira, setEditandoCarteira] = useState<Carteira | null | undefined>(undefined)
  const hoje = hojeISO()
  const [janela, setJanela] = useState<Janela>('30')
  const [custom, setCustom] = useState({ ini: primeiroDiaDoMes(hoje), fim: ultimoDiaDoMes(hoje) })
  const [gran, setGran] = useState<Granularidade>('dia')
  const [carteiraEscolhida, setCarteiraId] = useState('')

  // Empresa: cada CNPJ tem as suas contas. Abre na empresa padrão; "Todas" consolida o grupo.
  const { data: empresasData } = useEmpresasQuery()
  const empresas = (empresasData ?? []).filter((e) => e.status === 'ativo')
  const [empresaEscolhida, setEmpresaEscolhida] = useState<string | null>(null)
  const empresaId = empresaEscolhida ?? (empresas.length > 1 ? (empresaPadrao(empresas)?.id ?? '') : '')
  const carteiras = empresaId ? todasCarteiras.filter((c) => carteiraDaEmpresa(c, empresaId)) : todasCarteiras
  const idsDaEmpresa = new Set(carteiras.map((c) => c.id))
  const movimentos = empresaId
    ? todosMovimentos.filter((m) => idsDaEmpresa.has(m.carteiraId) && (!m.empresaId || m.empresaId === empresaId))
    : todosMovimentos
  const carteiraId = carteiras.some((c) => c.id === carteiraEscolhida) ? carteiraEscolhida : ''
  const [previstos, setPrevistos] = useState(true)
  const [aberto, setAberto] = useState<string | null>(null)

  const { ini, fim } = useMemo(() => {
    if (janela === 'mes') return { ini: primeiroDiaDoMes(hoje), fim: ultimoDiaDoMes(hoje) }
    if (janela === 'proximo') {
      const p = somarMeses(primeiroDiaDoMes(hoje), 1)
      return { ini: p, fim: ultimoDiaDoMes(p) }
    }
    if (janela === 'custom') return custom
    return { ini: somarDias(hoje, -7), fim: somarDias(hoje, Number(janela)) }
  }, [janela, custom, hoje])

  const fluxo = useMemo(() => fluxoDeCaixa(movimentos, carteiras, ini, fim, gran, previstos, carteiraId, hoje), [movimentos, carteiras, ini, fim, gran, previstos, carteiraId, hoje])
  const ativas = carteiras.filter((c) => c.status === 'ativo')
  const totalHoje = ativas.reduce((a, c) => a + saldoCarteira(c, movimentos, hoje), 0)
  const totalPrevisto = ativas.reduce((a, c) => a + saldoPrevisto(c, movimentos, fim, hoje), 0)

  const dados = fluxo.linhas.map((l) => ({
    nome: l.rotulo,
    periodo: l.periodo,
    entradas: l.entradas,
    saidas: l.saidas,
    realizado: l.futuro ? null : l.acumulado,
    previsto: l.futuro || l.periodo >= hoje ? l.acumulado : null,
  }))
  // A linha prevista começa no último ponto realizado, para não ficar um buraco no gráfico.
  const ultimoReal = [...dados].reverse().find((d) => d.realizado !== null)
  if (ultimoReal) ultimoReal.previsto = ultimoReal.realizado
  const hojeNoGrafico = dados.find((d) => d.periodo >= hoje)?.nome

  const entradas = fluxo.linhas.reduce((a, l) => a + l.entradas, 0)
  const saidas = fluxo.linhas.reduce((a, l) => a + l.saidas, 0)
  const menor = fluxo.menorSaldo

  return (
    <div>
      <PageHeader
        breadcrumb="Financeiro"
        title="Caixa"
        subtitle="Quanto há em cada carteira hoje, quanto haverá no fim do período e o caminho até lá."
        action={
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Hint text="Realizado = baixas já feitas, pela data do pagamento. Previsto = lançamentos em aberto, pelo vencimento. O acumulado parte do saldo das carteiras na véspera do período." />
            {empresas.length > 1 && (
              <select className={s.empresaSel} value={empresaId} onChange={(e) => setEmpresaEscolhida(e.target.value)} aria-label="Empresa">
                <option value="">Todas as empresas</option>
                {empresas.map((e) => (
                  <option key={e.id} value={e.id}>{e.nome}</option>
                ))}
              </select>
            )}
            <button className={`${ui.btn} ${ui.btnPrimary}`} onClick={() => setEditandoCarteira(null)}>
              <Plus /> Nova carteira
            </button>
          </div>
        }
      />

      <div className={s.carteiras}>
        <button type="button" className={`${s.carteira} ${s.carteiraTotal} ${!carteiraId ? s.carteiraOn : ''}`} onClick={() => setCarteiraId('')}>
          <div className={s.carteiraNome}><span><PiggyBank size={14} /> Todas as carteiras</span><small>{ativas.length} contas</small></div>
          <div className={`${s.carteiraSaldo} ${totalHoje < 0 ? s.neg : ''}`}>{formatBRL(totalHoje)}</div>
          <div className={s.carteiraPrev}><span>previsto em {dataBR(fim)}</span><b>{formatBRL(totalPrevisto)}</b></div>
        </button>
        {ativas.map((c) => {
          const saldo = saldoCarteira(c, movimentos, hoje)
          const prev = saldoPrevisto(c, movimentos, fim, hoje)
          return (
            <div key={c.id} style={{ position: 'relative', display: 'grid' }}>
            <button type="button" className={`${s.carteira} ${carteiraId === c.id ? s.carteiraOn : ''}`} style={{ borderLeftColor: c.cor }} onClick={() => setCarteiraId(carteiraId === c.id ? '' : c.id)}>
              <div className={s.carteiraNome}>
                <span>{c.tipo === 'banco' ? <Landmark size={14} /> : <Wallet size={14} />} {c.nome}</span>
                <small>{c.tipo === 'banco' ? `ag ${c.agencia} · cc ${c.conta}` : c.tipo}</small>
              </div>
              <div className={`${s.carteiraSaldo} ${saldo < 0 ? s.neg : ''}`}>{formatBRL(saldo)}</div>
              <div className={s.carteiraPrev}><span>previsto</span><b>{formatBRL(prev)}</b></div>
            </button>
            <button type="button" className={`${ui.iconBtn} ${s.carteiraEditar}`} title="Editar carteira" onClick={() => setEditandoCarteira(c)}>
              <Pencil />
            </button>
            </div>
          )
        })}
      </div>
      {ativas.length === 0 && (
        <div className={s.aprovAviso}>Nenhuma carteira ativa. Cadastre a conta bancária ou o caixa em "Nova carteira" para lançar e conciliar.</div>
      )}
      {carteiras.some((c) => c.status !== 'ativo') && (
        <div className={s.aprovNota}>
          Inativas:{' '}
          {carteiras.filter((c) => c.status !== 'ativo').map((c, i) => (
            <span key={c.id}>{i > 0 && ', '}<button type="button" className={s.linkBtn} onClick={() => setEditandoCarteira(c)}>{c.nome}</button></span>
          ))}
        </div>
      )}

      <div className={ui.card}>
        <div className={s.fluxoTop}>
          <div className={s.segmento}>
            {([['7', '7 dias'], ['15', '15 dias'], ['30', '30 dias'], ['mes', 'Este mês'], ['proximo', 'Próximo mês'], ['custom', 'Período']] as [Janela, string][]).map(([v, l]) => (
              <button key={v} className={janela === v ? s.on : ''} onClick={() => setJanela(v)}>{l}</button>
            ))}
          </div>
          {janela === 'custom' && (
            <>
              <input type="date" value={custom.ini} onChange={(e) => setCustom({ ...custom, ini: e.target.value })} />
              <input type="date" value={custom.fim} onChange={(e) => setCustom({ ...custom, fim: e.target.value })} />
            </>
          )}
          <div className={s.segmento}>
            {([['dia', 'Dia'], ['semana', 'Semana'], ['mes', 'Mês']] as [Granularidade, string][]).map(([v, l]) => (
              <button key={v} className={gran === v ? s.on : ''} onClick={() => setGran(v)}>{l}</button>
            ))}
          </div>
          <label className={`${ui.chip} ${previstos ? ui.chipOn : ''}`}>
            <input type="checkbox" className={ui.chipCheck} checked={previstos} onChange={(e) => setPrevistos(e.target.checked)} />
            <TrendingUp /> Incluir previstos
          </label>
          <div style={{ flex: 1 }} />
          <span className={ui.count}>{dataBR(ini)} a {dataBR(fim)}</span>
        </div>

        {menor && (
          <div className={`${s.insight} ${menor.valor < 0 ? s.ruim : ''}`}>
            {menor.valor < 0 ? <AlertTriangle /> : <TrendingUp />}
            <span>
              Menor saldo do período: <b>{formatBRL(menor.valor)}</b> em {dataBR(menor.em)}
              {menor.valor < 0 ? '. O caixa fica negativo: antecipe recebimentos ou adie pagamentos antes dessa data.' : '. Entradas somam '}
              {menor.valor >= 0 && <><b>{formatBRL(entradas)}</b> e saídas <b>{formatBRL(saidas)}</b>.</>}
            </span>
          </div>
        )}

        <div className={s.grafico}>
          <ResponsiveContainer width="100%" height={260}>
            <ComposedChart data={dados} margin={{ top: 10, right: 16, bottom: 0, left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ede9e0" vertical={false} />
              <XAxis dataKey="nome" tick={{ fontSize: 11, fill: '#6b7b72' }} />
              <YAxis tickFormatter={kBRL} tick={{ fontSize: 11, fill: '#6b7b72' }} width={64} />
              <Tooltip formatter={(v, nome) => [formatBRL(Number(v)), String(nome)]} contentStyle={{ borderRadius: 10, border: '1px solid #e6e3db', fontSize: 12 }} />
              {hojeNoGrafico && <ReferenceLine x={hojeNoGrafico} stroke="#e8702f" strokeDasharray="4 3" label={{ value: 'hoje', fontSize: 11, fill: '#e8702f', position: 'top' }} />}
              <Bar dataKey="entradas" name="Entradas" fill="#2e7d44" radius={[3, 3, 0, 0]} maxBarSize={28} />
              <Bar dataKey="saidas" name="Saídas" fill="#e8702f" radius={[3, 3, 0, 0]} maxBarSize={28} />
              <Line type="monotone" dataKey="realizado" name="Saldo realizado" stroke="#143d18" strokeWidth={2.5} dot={{ r: 3 }} connectNulls={false} />
              <Line type="monotone" dataKey="previsto" name="Saldo previsto" stroke="#143d18" strokeWidth={2} strokeDasharray="5 4" dot={{ r: 3, strokeDasharray: '' }} connectNulls={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <div className={s.legenda}>
          <span><i style={{ background: '#2e7d44' }} />Entradas</span>
          <span><i style={{ background: '#e8702f' }} />Saídas</span>
          <span><i style={{ background: '#143d18' }} />Saldo realizado</span>
          <span><i style={{ background: 'repeating-linear-gradient(90deg,#143d18 0 3px,transparent 3px 6px)' }} />Saldo previsto</span>
        </div>

        <table className={s.fluxoTabela}>
          <thead>
            <tr>
              <th>Período</th>
              <th className={s.r}>Entradas</th>
              <th className={s.r}>Saídas</th>
              <th className={s.r}>Resultado</th>
              <th className={s.r}>Saldo acumulado</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className={ui.cellMut}>Saldo em {dataBR(somarDias(ini, -1))}</td>
              <td /><td /><td />
              <td className={`${s.r} ${s.acum} ${fluxo.saldoInicial < 0 ? s.neg : ''}`}>{formatBRL(fluxo.saldoInicial)}</td>
            </tr>
            {fluxo.linhas.map((l) => (
              <FragmentoLinha key={l.periodo} l={l} aberto={aberto === l.periodo} hoje={hoje} gran={gran} onToggle={() => setAberto(aberto === l.periodo ? null : l.periodo)} />
            ))}
            {fluxo.linhas.length === 0 && (
              <tr><td colSpan={5} className={ui.empty}>Nenhuma entrada ou saída neste período.</td></tr>
            )}
          </tbody>
          <tfoot>
            <tr className={s.fluxoRodape}>
              <td>Total do período</td>
              <td className={`${s.r} ${s.pos}`}>{formatBRL(entradas)}</td>
              <td className={`${s.r} ${s.negv}`}>{formatBRL(saidas)}</td>
              <td className={`${s.r} ${entradas - saidas >= 0 ? s.pos : s.negv}`}>{formatBRL(entradas - saidas)}</td>
              <td className={`${s.r} ${s.acum} ${fluxo.saldoFinal < 0 ? s.neg : ''}`}>{formatBRL(fluxo.saldoFinal)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      <CarteiraFormModal open={editandoCarteira !== undefined} initial={editandoCarteira ?? null} onClose={() => setEditandoCarteira(undefined)} onSave={salvarCarteira} />
    </div>
  )
}

function FragmentoLinha({ l, aberto, hoje, gran, onToggle }: { l: ReturnType<typeof fluxoDeCaixa>['linhas'][number]; aberto: boolean; hoje: string; gran: Granularidade; onToggle: () => void }) {
  const ehHoje = gran === 'dia' ? l.periodo === hoje : l.periodo <= hoje && (gran === 'mes' ? l.periodo.slice(0, 7) === hoje.slice(0, 7) : somarDias(l.periodo, 6) >= hoje)
  const Chev = aberto ? ChevronDown : ChevronRight
  return (
    <>
      <tr className={`${s.linha} ${l.futuro ? s.futuro : ''} ${ehHoje ? s.hoje : ''}`} onClick={onToggle}>
        <td><Chev className={s.chev} />{l.rotulo}</td>
        <td className={`${s.r} ${l.entradas ? s.pos : ''}`}>{l.entradas ? formatBRL(l.entradas) : '—'}</td>
        <td className={`${s.r} ${l.saidas ? s.negv : ''}`}>{l.saidas ? formatBRL(l.saidas) : '—'}</td>
        <td className={`${s.r} ${l.resultado >= 0 ? s.pos : s.negv}`}>{formatBRL(l.resultado)}</td>
        <td className={`${s.r} ${s.acum} ${l.acumulado < 0 ? s.neg : ''}`}>{formatBRL(l.acumulado)}</td>
      </tr>
      {aberto && (
        <tr className={s.detalhe}>
          <td colSpan={5}>
            <div className={s.detLista}>
              {l.movimentos.map((m) => (
                <div key={m.id} className={s.detItem}>
                  <small>{dataBR(m.pagoEm || m.vencimento)}{m.pagoEm ? '' : ' · prev.'}</small>
                  <span><i className={`${s.tipoDot} ${s[m.tipo]}`} />{m.parceiroNome} · {m.descricao}</span>
                  <span className={`${s.valor} ${s[m.tipo]}`}>{m.tipo === 'receber' ? '+' : '−'} {formatBRL(liquidoDe(m))}</span>
                </div>
              ))}
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

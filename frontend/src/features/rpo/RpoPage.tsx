import { useState } from 'react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import { GitCompareArrows } from 'lucide-react'
import ui from '@/features/common/ui.module.css'
import { PageHeader } from '@/features/common/PageHeader'
import { Hint } from '@/features/common/Hint'
import { DataTable, type Column } from '@/features/common/DataTable'
import { LARGURA } from '@/features/common/grid'
import { formatBRL, formatPct } from '@/lib/format'
import { nomeUnidade } from '@/features/unidades/mock'
import { useEmpresasQuery } from '@/features/cadastros/hooks'
import { empresaPadrao } from '@/features/unidades/types'
import { usePropostas } from '@/features/propostas/store'
import s from '@/features/common/charts.module.css'

const kBRL = (v: number) => `R$ ${Math.round(v / 1000)}k`

interface LinhaRpo {
  id: string
  proposta: string
  cliente: string
  descricao: string
  orcado: number
  real: number
  desvio: number
}

/**
 * RPO: compara o custo orçado na precificação com o custo realmente executado.
 * A fonte são os itens das propostas APROVADAS que já tiveram o custo realizado
 * lançado (na tela de Propostas, abrindo os itens da proposta).
 */
export function RpoPage() {
  const { data: empresasData } = useEmpresasQuery()
  const empresas = (empresasData ?? []).filter((u) => u.status === 'ativo')
  const [escolhida, setEscolhida] = useState('')
  const { propostas } = usePropostas()

  // Sem efeito: enquanto a escolha não existir na lista, vale a empresa padrão (ou a primeira).
  const unidadeId = empresas.some((e) => e.id === escolhida) ? escolhida : (empresaPadrao(empresas)?.id ?? '')

  const linhas: LinhaRpo[] = propostas
    .filter((p) => p.status === 'aprovada')
    .flatMap((p) =>
      p.itens
        .filter((it) => it.empresaId === unidadeId && (it.custoReal ?? 0) > 0)
        .map((it) => ({
          id: `${p.id}-${it.id}`,
          proposta: p.numero,
          cliente: p.cliente,
          descricao: it.descricao,
          orcado: it.custoTotal,
          real: it.custoReal ?? 0,
          desvio: (it.custoReal ?? 0) - it.custoTotal,
        })),
    )

  const totalOrcado = linhas.reduce((a, o) => a + o.orcado, 0)
  const totalReal = linhas.reduce((a, o) => a + o.real, 0)
  const desvio = totalReal - totalOrcado
  const desvioPct = totalOrcado > 0 ? desvio / totalOrcado : 0

  const barData = linhas.map((o) => ({ nome: o.proposta, orcado: o.orcado, real: o.real }))

  const columns: Column<LinhaRpo>[] = [
    { header: 'Proposta', largura: LARGURA.curta, cell: (o) => <span className={ui.cellStrong}>{o.proposta}</span> },
    { header: 'Cliente', valor: (o) => o.cliente, cell: (o) => <span className={ui.cellMut}>{o.cliente}</span> },
    { header: 'Item', valor: (o) => o.descricao, cell: (o) => <span className={ui.cellMut}>{o.descricao}</span> },
    { header: 'Orçado', largura: LARGURA.valor, className: ui.right, cell: (o) => formatBRL(o.orcado) },
    { header: 'Realizado', largura: LARGURA.valor, className: ui.right, cell: (o) => formatBRL(o.real) },
    {
      header: 'Desvio',
      largura: LARGURA.valor,
      className: ui.right,
      cell: (o) => (
        <span style={{ color: o.desvio <= 0 ? '#2e7d44' : '#c0392b', fontWeight: 600 }}>
          {o.desvio > 0 ? '+' : ''}
          {formatBRL(o.desvio)}
        </span>
      ),
    },
  ]

  const comboUnidade = (
    <select className={ui.filterSelect} value={unidadeId} onChange={(e) => setEscolhida(e.target.value)}>
      {empresas.map((u) => (
        <option key={u.id} value={u.id}>
          {u.nome}
        </option>
      ))}
    </select>
  )

  if (!empresas.length)
    return (
      <div>
        <PageHeader
          breadcrumb="Gerencial"
          title="RPO (Orçado × Realizado)"
          subtitle="Resultado por operação: o custo planejado contra o executado."
        />
        <div className={s.chartCard}>
          <p className={s.note}>Cadastre uma empresa para acompanhar o resultado por operação.</p>
        </div>
      </div>
    )

  return (
    <div>
      <PageHeader
        breadcrumb="Gerencial"
        title="RPO (Orçado × Realizado)"
        subtitle="Resultado por operação: o custo planejado na precificação contra o executado."
        action={
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Hint text="Orçado = custo total de cada item gravado na proposta quando ela foi gerada (custos lançados no Pricing, antes de impostos e margem). Realizado = custo que aconteceu de verdade, lançado depois em Propostas › abrir a proposta aprovada › custo realizado por item. Desvio = realizado − orçado: verde economizou, vermelho estourou. Só entram propostas aprovadas com custo realizado informado." />
            {comboUnidade}
          </div>
        }
      />

      <div className={s.kpis}>
        <div className={s.kpiCard}>
          <div className={s.kpiLabel}>Custo orçado (total)</div>
          <div className={s.kpiVal}>{formatBRL(totalOrcado)}</div>
          <div className={s.kpiSub}>planejado na precificação</div>
        </div>
        <div className={s.kpiCard}>
          <div className={s.kpiLabel}>Custo realizado (total)</div>
          <div className={s.kpiVal}>{formatBRL(totalReal)}</div>
          <div className={s.kpiSub}>executado</div>
        </div>
        <div className={s.kpiCard}>
          <div className={s.kpiLabel}>Desvio</div>
          {/* Mesma cor da tabela: verde economizou, vermelho passou do orçado. */}
          <div className={s.kpiVal} style={{ color: desvio <= 0 ? '#2e7d44' : '#c0392b' }}>{formatBRL(desvio)}</div>
          <div className={s.kpiSub}>
            {desvio <= 0 ? 'economia' : 'acima do orçado'} ({formatPct(Math.abs(desvioPct))})
          </div>
        </div>
        <div className={s.kpiCard}>
          <div className={s.kpiLabel}>Itens acompanhados</div>
          <div className={s.kpiVal}>{linhas.length}</div>
          <div className={s.kpiSub}>com custo realizado lançado</div>
        </div>
      </div>

      <div className={s.chartCard}>
        <div className={s.chartTitle}>
          <GitCompareArrows /> Custo orçado × realizado por proposta
        </div>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={barData} margin={{ top: 14, right: 20, bottom: 6, left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#ede9e0" vertical={false} />
            <XAxis dataKey="nome" tick={{ fontSize: 11, fill: '#6b7b72' }} />
            <YAxis tickFormatter={kBRL} tick={{ fontSize: 12, fill: '#6b7b72' }} width={56} />
            <Tooltip
              formatter={(v) => formatBRL(Number(v))}
              cursor={{ fill: 'rgba(26,77,30,0.05)' }}
              contentStyle={{ borderRadius: 10, border: '1px solid #e6e3db', fontSize: 13 }}
            />
            <Legend verticalAlign="top" align="center" height={28} wrapperStyle={{ fontSize: 12, paddingBottom: 6 }} />
            <Bar dataKey="orcado" name="Orçado" fill="#1a4d1e" radius={[3, 3, 0, 0]} />
            <Bar dataKey="real" name="Realizado" fill="#e8702f" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
        <div style={{ marginTop: 12 }}>
          <DataTable
            columns={columns}
            rows={linhas}
            getKey={(o) => o.id}
            empty={`Nenhum custo realizado lançado em ${nomeUnidade(unidadeId)}. Abra uma proposta aprovada, informe o custo executado de cada item e salve.`}
          />
        </div>
      </div>
    </div>
  )
}

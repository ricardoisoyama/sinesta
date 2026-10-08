import { useState } from 'react'
import { Target, Pencil, Plus, Lock } from 'lucide-react'
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
import ui from '@/features/common/ui.module.css'
import { PageHeader } from '@/features/common/PageHeader'
import { formatBRL, formatPct } from '@/lib/format'
import { getErrorMessage } from '@/lib/api'
import { useAuth } from '@/features/auth/auth-context'
import { usePropostas } from '@/features/propostas/store'
import { useEmpresasQuery } from '@/features/cadastros/hooks'
import { mesesDaMeta, mesesMeta, type CenarioMeta } from './mock'
import { anoDaMeta, faixaDaMeta, realizadoPorMes, type FaixaMeta } from './realizado'
import { useMetas } from './store'
import { MetaFormModal } from './MetaFormModal'
import type { MetaForm } from './meta-schema'
import s from '@/features/common/charts.module.css'
import m from './metas.module.css'

const kBRL = (v: number) => `R$ ${Math.round(v / 1000)}k`
const CLASSE_FAIXA: Record<FaixaMeta, string> = { ok: m.faixaOk, atencao: m.faixaAtencao, ruim: m.faixaRuim }
const COR_FAIXA: Record<FaixaMeta, string> = { ok: '#2e7d44', atencao: '#d99a1f', ruim: '#c0392b' }

export function MetasPage() {
  const { metas, isLoading, add, update, inativar } = useMetas()
  const { propostas } = usePropostas()
  const { user } = useAuth()
  // Só o gestor cria/edita/remove metas; o colaborador acompanha.
  const ehGestor = user?.perfil === 'Gestor'

  const [cenarioId, setCenarioId] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<CenarioMeta | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)

  const cenario = metas.find((c) => c.id === cenarioId) ?? metas[0]
  const { data: empresasData } = useEmpresasQuery()
  const nomeEmpresa = (id?: string) => (empresasData ?? []).find((e) => e.id === id)?.nome ?? ''

  const save = async (d: MetaForm) => {
    setSaveError(null)
    // O anual é sempre a soma dos meses (o servidor confere de novo).
    const dados = { ...d, metaAnual: d.valoresMensais.reduce((a, v) => a + v, 0) }
    try {
      if (editing) await update({ ...editing, ...dados })
      else {
        const nova = await add({ id: crypto.randomUUID(), ...dados })
        setCenarioId(nova.id)
      }
    } catch (err) {
      setSaveError(getErrorMessage(err))
      return
    }
    setModalOpen(false)
    setEditing(null)
  }

  // Exclusão lógica: a meta fica guardada (com quem/quando) e sai da tela.
  const removeCenario = async () => {
    if (!cenario || metas.length <= 1) return
    if (!window.confirm(`Inativar a meta "${cenario.nome}"? Ela sai da tela, mas o histórico fica guardado.`)) return
    const proximo = metas.find((c) => c.id !== cenario.id)
    try {
      await inativar(cenario)
    } catch (err) {
      window.alert(getErrorMessage(err))
      return
    }
    if (proximo) setCenarioId(proximo.id)
    setModalOpen(false)
    setEditing(null)
  }

  const fecharModal = () => {
    setSaveError(null)
    setModalOpen(false)
    setEditing(null)
  }

  const botaoNova = ehGestor ? (
    <button
      className={`${ui.btn} ${ui.btnPrimary}`}
      onClick={() => {
        setEditing(null)
        setModalOpen(true)
      }}
    >
      <Plus /> Nova meta
    </button>
  ) : (
    <span className={m.somenteLeitura} title="Somente o gestor inclui ou altera metas">
      <Lock size={13} /> Somente leitura
    </span>
  )

  if (!cenario) {
    return (
      <div>
        <PageHeader
          breadcrumb="Comercial"
          title="Metas"
          subtitle="Meta de faturamento por mês versus o realizado nas propostas aprovadas."
          action={isLoading ? undefined : botaoNova}
        />
        <div className={s.chartCard}>
          <div className={s.note}>
            {isLoading
              ? 'Carregando metas...'
              : ehGestor
                ? 'Nenhuma meta cadastrada. Clique em "Nova meta" para criar a primeira.'
                : 'Nenhuma meta cadastrada ainda. Peça ao gestor para cadastrar.'}
          </div>
        </div>
        <MetaFormModal open={modalOpen} initial={null} podeRemover={false} error={saveError} onClose={fecharModal} onSave={save} onRemove={removeCenario} />
      </div>
    )
  }

  const ano = anoDaMeta(cenario.ano)
  const realizadoMensal = realizadoPorMes(propostas, ano, cenario.empresaId ?? '')
  const hoje = new Date()
  const mesAtual = hoje.getFullYear() === ano ? hoje.getMonth() : hoje.getFullYear() > ano ? 11 : -1
  const metaMeses = mesesDaMeta(cenario)

  const data = mesesMeta.map((mes, i) => ({
    mes,
    meta: metaMeses[i],
    realizado: realizadoMensal[i],
  }))

  const realizadoAcum = realizadoMensal.reduce((a, v) => a + v, 0)
  const pctAno = cenario.metaAnual > 0 ? realizadoAcum / cenario.metaAnual : 0
  // Projetado até o mês atual (o que a meta esperava ter até agora) x realizado até agora.
  const projetadoAteAgora = data.slice(0, mesAtual + 1).reduce((a, d) => a + d.meta, 0)
  const pctAteAgora = projetadoAteAgora > 0 ? realizadoAcum / projetadoAteAgora : 0
  const faixaAno = faixaDaMeta(pctAno)
  const faixaAteAgora = faixaDaMeta(pctAteAgora)

  const actions = (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
      <select className={ui.filterSelect} value={cenario.id} onChange={(e) => setCenarioId(e.target.value)}>
        {metas.map((c) => (
          <option key={c.id} value={c.id}>
            {nomeEmpresa(c.empresaId) || 'Sem empresa'} · {c.nome} · {anoDaMeta(c.ano)} ({formatBRL(c.metaAnual)})
          </option>
        ))}
      </select>
      {ehGestor && (
        <button
          className={ui.iconBtn}
          onClick={() => {
            setEditing(cenario)
            setModalOpen(true)
          }}
          title="Editar meta"
        >
          <Pencil />
        </button>
      )}
      {botaoNova}
    </div>
  )

  return (
    <div>
      <PageHeader
        breadcrumb="Comercial"
        title="Metas"
        subtitle="Meta de faturamento por mês versus o realizado nas propostas aprovadas."
        action={actions}
      />

      <div className={s.kpis}>
        <div className={s.kpiCard}>
          <div className={s.kpiLabel}>Meta anual · {ano}</div>
          <div className={s.kpiVal}>{formatBRL(cenario.metaAnual)}</div>
          <div className={s.kpiSub}>
            {cenario.empresaId ? (
              <span className={m.empresaTag}>{nomeEmpresa(cenario.empresaId)}</span>
            ) : (
              <span className={m.semEmpresa} title="Edite a meta e escolha a empresa: só assim ela compõe o fator">Sem empresa: não entra no fator</span>
            )}{' '}
            {cenario.nome} · média {formatBRL(cenario.metaAnual / 12)}/mês
          </div>
        </div>
        <div className={s.kpiCard}>
          <div className={s.kpiLabel}>Realizado acumulado</div>
          <div className={s.kpiVal}>{formatBRL(realizadoAcum)}</div>
          <div className={s.kpiSub}>propostas aprovadas em {ano}</div>
        </div>
        <div className={`${s.kpiCard} ${CLASSE_FAIXA[faixaAno]}`}>
          <div className={s.kpiLabel}>% da meta anual</div>
          <div className={s.kpiVal} style={{ color: COR_FAIXA[faixaAno] }}>
            {formatPct(pctAno)}
          </div>
          <div className={s.kpiSub}>atingido no ano</div>
        </div>
        <div className={`${s.kpiCard} ${CLASSE_FAIXA[faixaAteAgora]}`}>
          <div className={s.kpiLabel}>Projetado × realizado</div>
          <div className={s.kpiVal} style={{ color: COR_FAIXA[faixaAteAgora] }}>
            {mesAtual < 0 ? '—' : formatPct(pctAteAgora)}
          </div>
          <div className={s.kpiSub}>
            {mesAtual < 0 ? 'ano ainda não começou' : `esperado até ${mesesMeta[mesAtual]}: ${formatBRL(projetadoAteAgora)}`}
          </div>
        </div>
      </div>

      <div className={s.chartCard}>
        <div className={s.chartTitle}>
          <Target /> Meta × Realizado · {cenario.nome} · {ano}
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} margin={{ top: 14, right: 20, bottom: 6, left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#ede9e0" vertical={false} />
            <XAxis dataKey="mes" tick={{ fontSize: 12, fill: '#6b7b72' }} />
            <YAxis tickFormatter={kBRL} tick={{ fontSize: 12, fill: '#6b7b72' }} width={60} />
            <Tooltip
              formatter={(v) => formatBRL(Number(v))}
              cursor={{ fill: 'rgba(26,77,30,0.05)' }}
              contentStyle={{ borderRadius: 10, border: '1px solid #e6e3db', fontSize: 13 }}
            />
            <Legend verticalAlign="top" align="center" height={28} wrapperStyle={{ fontSize: 12, paddingBottom: 6 }} />
            <Bar dataKey="meta" name="Meta projetada" fill="#1a4d1e" radius={[3, 3, 0, 0]} />
            <Bar dataKey="realizado" name="Realizado" fill="#e8702f" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>

        <table className={`${ui.table} ${m.tabela}`}>
          <thead>
            <tr>
              <th>Mês</th>
              <th className={ui.right}>Projetado</th>
              <th className={ui.right}>Realizado</th>
              <th className={ui.right}>Atingido</th>
            </tr>
          </thead>
          <tbody>
            {data.map((d, i) => {
              const pct = d.meta > 0 ? d.realizado / d.meta : 0
              const passado = i <= mesAtual
              const faixa = faixaDaMeta(pct)
              return (
                <tr key={d.mes} className={i === mesAtual ? m.mesAtual : ''}>
                  <td className={ui.cellStrong}>{d.mes}</td>
                  <td className={ui.right}>{formatBRL(d.meta)}</td>
                  <td className={ui.right}>{d.realizado > 0 ? formatBRL(d.realizado) : '—'}</td>
                  <td className={ui.right}>
                    {passado || d.realizado > 0 ? (
                      <span className={`${m.pill} ${CLASSE_FAIXA[faixa]}`}>{formatPct(pct)}</span>
                    ) : (
                      <span className={ui.cellMut}>—</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        <div className={s.note}>
          <b>Meta projetada</b> é o valor lançado em cada mês. <b>Realizado</b> soma o que a empresa vendeu nas propostas{' '}
          <b>aprovadas</b> em cada mês de {ano}. O DF% do mês (despesas fixas ÷ meta do mês) entra no fator da empresa: o preço de cada mês usa a meta daquele mês. Cores: verde a
          partir de 90% da meta, amarelo a partir de 60%, vermelho abaixo disso.
        </div>
      </div>

      <MetaFormModal
        open={modalOpen}
        initial={
          editing
            ? {
                nome: editing.nome,
                empresaId: editing.empresaId ?? '',
                ano: anoDaMeta(editing.ano),
                valoresMensais: mesesDaMeta(editing).map((v) => Math.round(v * 100) / 100),
                principal: !!editing.principal,
              }
            : null
        }
        podeRemover={metas.length > 1}
        error={saveError}
        onClose={fecharModal}
        onSave={save}
        onRemove={removeCenario}
      />
    </div>
  )
}

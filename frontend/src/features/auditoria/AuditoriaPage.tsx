import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { History, RefreshCw } from 'lucide-react'
import ui from '@/features/common/ui.module.css'
import { PageHeader } from '@/features/common/PageHeader'
import { DataTable, type Column } from '@/features/common/DataTable'
import { Hint } from '@/features/common/Hint'
import { getErrorMessage } from '@/lib/api'
import { ACOES, alteracoesLegiveis, listarAuditoria, type RegistroAuditoria } from './api'
import s from './auditoria.module.css'

const ENTIDADES = ['Proposta', 'Cliente', 'Fornecedor', 'Vendedor', 'Empresa', 'Usuario', 'CustoFixo', 'PlanoConta', 'RegraAprovacao', 'Meta', 'Servico', 'TipoCusto', 'Taxa', 'Oportunidade', 'Funil', 'ModeloProposta', 'ValidadeProposta', 'CategoriaCusto', 'CampoOperacao', 'FichaColuna', 'FichaTecnica']

const quando = (iso: string) => {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })
}

/** Histórico de alterações: quem fez o quê, quando e o que mudou. Só leitura. */
export function AuditoriaPage() {
  const [entidade, setEntidade] = useState('')
  const [acao, setAcao] = useState('')
  const [usuario, setUsuario] = useState('')
  const [limite, setLimite] = useState(300)
  const [aberto, setAberto] = useState<string | null>(null)

  const { data, isFetching, error, refetch } = useQuery({
    queryKey: ['auditoria', entidade, acao, usuario, limite],
    queryFn: () => listarAuditoria({ entidade, acao, usuario, limite }),
  })
  const linhas = data ?? []

  const columns: Column<RegistroAuditoria>[] = [
    { header: 'Quando', fixa: true, cell: (r) => <span className={ui.cellMut}>{quando(r.em)}</span> },
    { header: 'Usuário', cell: (r) => <span className={ui.cellStrong}>{r.usuarioNome || '—'}</span> },
    { header: 'Ação', cell: (r) => <span className={`${s.acao} ${s[`acao_${r.acao.replace(/-/g, '_')}`] ?? ''}`}>{ACOES[r.acao] ?? r.acao}</span> },
    { header: 'Registro', cell: (r) => <span className={ui.cellMut}>{r.entidade}</span> },
    { header: 'Descrição', fixa: true, cell: (r) => r.descricao },
    {
      header: 'Alterações',
      cell: (r) => {
        const itens = alteracoesLegiveis(r.alteracoes)
        if (itens.length === 0) return <span className={ui.cellMut}>—</span>
        const expandido = aberto === r.id
        return (
          <div className={s.alts}>
            {(expandido ? itens : itens.slice(0, 2)).map((a) => (
              <div key={a.campo} className={s.alt}>
                <b>{a.campo}</b>: <span className={s.de}>{a.de}</span> → <span className={s.para}>{a.para}</span>
              </div>
            ))}
            {itens.length > 2 && (
              <button type="button" className={s.mais} onClick={() => setAberto(expandido ? null : r.id)}>
                {expandido ? 'menos' : `+${itens.length - 2} campo(s)`}
              </button>
            )}
          </div>
        )
      },
    },
    { header: 'IP', cell: (r) => <span className={ui.cellMut}>{r.ip}</span> },
  ]

  return (
    <div>
      <PageHeader
        breadcrumb="Configurações"
        title="Auditoria"
        subtitle="Quem fez o quê, quando e o que mudou: cadastros, propostas, permissões e acessos."
        action={
          <div className={s.acoes}>
            <Hint text="Toda gravação passa por aqui: criar, alterar, inativar, importar, status e aprovação de proposta, anexos, transferência de carteira e cada login (inclusive os recusados). Nas alterações aparecem só os campos que mudaram." />
            <button type="button" className={`${ui.btn} ${ui.btnGhost}`} onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw /> Atualizar
            </button>
          </div>
        }
      />

      <div className={ui.card}>
        <div className={`${ui.toolbar} ${s.filtros}`}>
          <select value={entidade} onChange={(e) => setEntidade(e.target.value)} aria-label="Registro">
            <option value="">Todos os registros</option>
            {ENTIDADES.map((e) => <option key={e} value={e}>{e}</option>)}
          </select>
          <select value={acao} onChange={(e) => setAcao(e.target.value)} aria-label="Ação">
            <option value="">Todas as ações</option>
            {Object.entries(ACOES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <input value={usuario} onChange={(e) => setUsuario(e.target.value)} placeholder="Usuário..." aria-label="Usuário" />
          <select value={limite} onChange={(e) => setLimite(Number(e.target.value))} aria-label="Quantidade">
            {[100, 300, 1000, 2000].map((n) => <option key={n} value={n}>últimos {n}</option>)}
          </select>
          <div style={{ flex: 1 }} />
          <span className={`${ui.count} ${s.contagem}`}>
            <History size={14} /> {linhas.length} registro{linhas.length === 1 ? '' : 's'}
          </span>
        </div>
        {error && <div className={s.erro}>{getErrorMessage(error)}</div>}
        <div className={s.tabela}>
          <DataTable columns={columns} rows={linhas} getKey={(r) => r.id} empty={isFetching ? 'Carregando...' : 'Nenhum registro na trilha ainda.'} />
        </div>
      </div>
    </div>
  )
}

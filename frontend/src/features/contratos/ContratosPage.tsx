import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarClock, FilePlus2, FolderOpen, Repeat, Truck } from 'lucide-react'
import ui from '@/features/common/ui.module.css'
import { PageHeader } from '@/features/common/PageHeader'
import { CrudList } from '@/features/common/CrudList'
import { AvisoPrototipo } from '@/features/common/AvisoPrototipo'
import type { Column } from '@/features/common/DataTable'
import { LARGURA } from '@/features/common/grid'
import { avisar } from '@/features/common/dialogo/dialogo'
import { formatBRL } from '@/lib/format'
import { buscaPeloNumero, semAcento } from '@/lib/texto'
import { CONTRATOS_EXEMPLO } from './mock'
import { alertasDoContrato, dataBR, diasParaFim, hojeISO, mesAnoNum, progressoVigencia, proximoFaturamento, valorContrato } from './regras'
import type { Contrato, Modalidade, SituacaoContrato } from './types'
import { BadgeModalidade, BadgeSituacao, Alertas } from './componentes'
import s from './contratos.module.css'

type FiltroSituacao = 'ativos' | 'encerrados' | 'todos'

const ATIVOS: SituacaoContrato[] = ['vigente', 'suspenso', 'a-faturar']

/**
 * Lista de contratos (protótipo). Recorrente e spot na mesma lista; cada linha abre a pasta
 * do contrato. Os números do topo respondem "quanto entra todo mês" e "o que pede atenção".
 */
export function ContratosPage() {
  const navigate = useNavigate()
  const hoje = hojeISO()
  const [busca, setBusca] = useState('')
  const [empresa, setEmpresa] = useState('todas')
  const [modalidade, setModalidade] = useState<'todas' | Modalidade>('todas')
  const [situacao, setSituacao] = useState<FiltroSituacao>('ativos')

  const empresas = [...new Map(CONTRATOS_EXEMPLO.map((c) => [c.empresaId, c.empresaNome])).entries()]
  const q = semAcento(busca.trim())
  const linhas = CONTRATOS_EXEMPLO.filter((c) => empresa === 'todas' || c.empresaId === empresa)
    .filter((c) => modalidade === 'todas' || c.modalidade === modalidade)
    .filter((c) => (situacao === 'todos' ? true : situacao === 'ativos' ? ATIVOS.includes(c.situacao) : !ATIVOS.includes(c.situacao)))
    .filter((c) => !q || buscaPeloNumero(busca.replace(/\D/g, ''), Number(c.numero.replace(/\D/g, ''))) || semAcento(`${c.numero} ${c.clienteNome} ${c.clienteDocumento} ${c.tipoOperacao} ${c.propostaNumero}`).includes(q))
    // Em andamento primeiro; dentro de cada grupo, pela numeração.
    .sort((a, b) => Number(!ATIVOS.includes(a.situacao)) - Number(!ATIVOS.includes(b.situacao)) || a.numero.localeCompare(b.numero))

  const columns: Column<Contrato>[] = [
    { header: 'Nº', fixa: true, largura: LARGURA.curta, valor: (c) => c.numero, cell: (c) => <span className={s.numero}>{c.numero}</span> },
    {
      header: 'Cliente',
      fixa: true,
      valor: (c) => `${c.clienteNome} · ${c.tipoOperacao} · ${c.empresaNome}`,
      cell: (c) => (
        <div className={s.cliente}>
          <span className={ui.cellStrong}>{c.clienteNome}</span>
          <small>
            {c.tipoOperacao} · {c.empresaNome}
            {c.localServico ? ` · ${c.localServico}` : ''}
          </small>
        </div>
      ),
    },
    { header: 'Modalidade', largura: LARGURA.curta, valor: (c) => (c.modalidade === 'spot' ? 'Spot' : 'Recorrente'), cell: (c) => <BadgeModalidade modalidade={c.modalidade} /> },
    {
      header: 'Vigência',
      largura: LARGURA.media,
      valor: (c) => (c.modalidade === 'spot' ? dataBR(c.inicio) : `${mesAnoNum(c.inicio)} → ${mesAnoNum(c.fim)}`),
      cell: (c) =>
        c.modalidade === 'spot' ? (
          <div className={s.vigCel}>
            <span>{dataBR(c.inicio)}</span>
            <small>serviço avulso</small>
          </div>
        ) : (
          <div className={s.vigCel}>
            <span>
              {mesAnoNum(c.inicio)} → {mesAnoNum(c.fim)}
            </span>
            <i className={s.vigMini}>
              <i style={{ width: `${Math.round(progressoVigencia(c, hoje) * 100)}%` }} />
            </i>
          </div>
        ),
    },
    {
      header: 'Valor',
      className: ui.right,
      largura: LARGURA.valor,
      valor: (c) => valorContrato(c, hoje),
      cell: (c) => (
        <div className={s.valorCel}>
          <span className={ui.cellStrong}>{formatBRL(valorContrato(c, hoje))}</span>
          <small>
            {c.modalidade === 'spot' ? 'total' : 'por mês'}
            {proximoFaturamento(c, hoje) ? ` · fatura ${dataBR(proximoFaturamento(c, hoje)!).slice(0, 5)}` : ''}
          </small>
        </div>
      ),
    },
    { header: 'Atenção', largura: LARGURA.longa, valor: (c) => alertasDoContrato(c, hoje).map((a) => a.texto).join(' · '), cell: (c) => <Alertas alertas={alertasDoContrato(c, hoje)} max={1} /> },
    { header: 'Situação', largura: LARGURA.situacao, valor: (c) => c.situacao, cell: (c) => <BadgeSituacao situacao={c.situacao} /> },
    {
      header: 'Ações',
      fixa: true,
      largura: LARGURA.acoes,
      className: ui.colActions,
      cell: (c) => (
        <button type="button" className={ui.iconBtn} title="Abrir a pasta do contrato" onClick={(e) => { e.stopPropagation(); navigate(`/contratos/${c.id}`) }}>
          <FolderOpen />
        </button>
      ),
    },
  ]

  const resumo = (visiveis: Contrato[]) => {
    const recorrentes = visiveis.filter((c) => c.modalidade === 'recorrente' && c.situacao === 'vigente')
    const mensal = recorrentes.reduce((a, c) => a + valorContrato(c, hoje), 0)
    const vencendo = recorrentes.filter((c) => diasParaFim(c, hoje) <= 90)
    const mes = hoje.slice(0, 7)
    const spots = visiveis.filter((c) => c.modalidade === 'spot' && c.inicio.slice(0, 7) === mes)
    return (
      <div className={s.kpis}>
        <div className={s.kpi}>
          <div className={s.kpiLabel}><Repeat size={14} /> Receita recorrente</div>
          <div className={`${s.kpiVal} ${s.kpiDestaque}`}>{formatBRL(mensal)}</div>
          <div className={s.kpiSub}>por mês · {recorrentes.length} contrato{recorrentes.length === 1 ? '' : 's'} vigente{recorrentes.length === 1 ? '' : 's'}</div>
        </div>
        <div className={s.kpi}>
          <div className={s.kpiLabel}><CalendarClock size={14} /> Vencem em 90 dias</div>
          <div className={`${s.kpiVal} ${vencendo.length ? s.kpiAlerta : ''}`}>{vencendo.length}</div>
          <div className={s.kpiSub}>{vencendo.length ? vencendo.map((c) => c.clienteNome).join(', ') : 'nenhum contrato perto do fim'}</div>
        </div>
        <div className={s.kpi}>
          <div className={s.kpiLabel}><Truck size={14} /> Spots no mês</div>
          <div className={s.kpiVal}>{spots.length}</div>
          <div className={s.kpiSub}>{formatBRL(spots.reduce((a, c) => a + valorContrato(c, hoje), 0))} em serviços avulsos</div>
        </div>
        <div className={s.kpi}>
          <div className={s.kpiLabel}>Pedem atenção</div>
          <div className={s.kpiVal}>{visiveis.filter((c) => alertasDoContrato(c, hoje).some((a) => a.tom !== 'info')).length}</div>
          <div className={s.kpiSub}>atraso, vencimento ou reajuste perto</div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        breadcrumb="Comercial"
        title="Contratos"
        subtitle="Contratos recorrentes e serviços spot de todas as operações. Cada um abre a sua pasta."
        action={
          <button
            type="button"
            className={`${ui.btn} ${ui.btnPrimary}`}
            onClick={() =>
              void avisar({
                titulo: 'Novo contrato',
                mensagem:
                  'O contrato nasce da proposta aprovada: no Pricing a proposta diz se é Recorrente ou Spot e, aprovada, ganha o botão "Gerar contrato" (escopo, preço e condições já vêm preenchidos). Também dá para abrir um em branco. No protótipo, esse fluxo ainda não grava.',
              })
            }
          >
            <FilePlus2 /> Novo contrato
          </button>
        }
      />
      <AvisoPrototipo />
      <CrudList
        id="contratos"
        query={busca}
        onQuery={setBusca}
        searchPlaceholder="Buscar por nº, cliente, CNPJ, operação ou proposta..."
        columns={columns}
        rows={linhas}
        getKey={(c) => c.id}
        rotulo={['contrato', 'contratos']}
        onRowClick={(c) => navigate(`/contratos/${c.id}`)}
        resumo={resumo}
        empty="Nenhum contrato com esses filtros."
        filters={
          <>
            <select className={ui.filterSelect} value={empresa} onChange={(e) => setEmpresa(e.target.value)} aria-label="Empresa">
              <option value="todas">Todas as empresas</option>
              {empresas.map(([id, nome]) => (
                <option key={id} value={id}>{nome}</option>
              ))}
            </select>
            <div className={s.segmento} role="group" aria-label="Modalidade">
              {(['todas', 'recorrente', 'spot'] as const).map((m) => (
                <button key={m} type="button" className={modalidade === m ? s.segOn : ''} onClick={() => setModalidade(m)}>
                  {m === 'todas' ? 'Todos' : m === 'recorrente' ? 'Recorrentes' : 'Spot'}
                </button>
              ))}
            </div>
            <select className={ui.filterSelect} value={situacao} onChange={(e) => setSituacao(e.target.value as FiltroSituacao)} aria-label="Situação">
              <option value="ativos">Em andamento</option>
              <option value="encerrados">Encerrados e faturados</option>
              <option value="todos">Todos</option>
            </select>
          </>
        }
      />
    </div>
  )
}

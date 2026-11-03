import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarClock, FilePlus2, FolderOpen, LayoutTemplate, Repeat, Truck } from 'lucide-react'
import ui from '@/features/common/ui.module.css'
import { PageHeader } from '@/features/common/PageHeader'
import { CrudList } from '@/features/common/CrudList'
import type { Column } from '@/features/common/DataTable'
import { LARGURA } from '@/features/common/grid'
import { formatBRL } from '@/lib/format'
import { buscaPeloNumero, semAcento } from '@/lib/texto'
import { useContratos } from './api'
import { useNomes } from './faturas'
import { alertasDoContrato, dataBR, diasParaFim, emAndamento, hojeISO, mesAnoNum, porDocumento, progressoVigencia, proximaFatura, situacaoDe, valorContrato } from './regras'
import type { Contrato, Modalidade } from './types'
import { BadgeModalidade, BadgeSituacao, Alertas } from './componentes'
import s from './contratos.module.css'

type FiltroSituacao = 'ativos' | 'encerrados' | 'todos'

/**
 * Lista de contratos. Recorrente e spot na mesma lista; cada linha abre a pasta do contrato.
 * Os números do topo respondem "quanto entra todo mês" e "o que pede atenção".
 */
export function ContratosPage() {
  const navigate = useNavigate()
  const hoje = hojeISO()
  const nomes = useNomes()
  const [busca, setBusca] = useState('')
  const [empresa, setEmpresa] = useState('todas')
  const [modalidade, setModalidade] = useState<'todas' | Modalidade>('todas')
  const [situacao, setSituacao] = useState<FiltroSituacao>('ativos')
  const { data, isLoading } = useContratos()
  const contratos = data?.contratos ?? []
  const faturas = data?.faturas ?? []
  const sit = (c: Contrato) => situacaoDe(c, faturas)
  const alertas = (c: Contrato) => alertasDoContrato(c, faturas, hoje)

  const empresas = [...new Set(contratos.map((c) => c.empresaId))]
  const q = semAcento(busca.trim())
  const linhas = contratos.filter((c) => empresa === 'todas' || c.empresaId === empresa)
    .filter((c) => modalidade === 'todas' || c.modalidade === modalidade)
    .filter((c) => (situacao === 'todos' ? true : situacao === 'ativos' ? emAndamento(sit(c)) : !emAndamento(sit(c))))
    .filter((c) => !q || buscaPeloNumero(busca.replace(/\D/g, ''), Number(c.numero.replace(/\D/g, ''))) || semAcento(`${c.numero} ${c.clienteNome} ${c.clienteDocumento} ${c.tipoOperacao} ${c.propostaNumero}`).includes(q))
    // Em andamento primeiro; dentro de cada grupo, pela numeração.
    .sort((a, b) => Number(!emAndamento(sit(a))) - Number(!emAndamento(sit(b))) || a.numero.localeCompare(b.numero))

  const columns: Column<Contrato>[] = [
    { header: 'Nº', fixa: true, largura: LARGURA.curta, valor: (c) => c.numero, cell: (c) => <span className={s.numero}>{c.numero}</span> },
    {
      header: 'Cliente',
      fixa: true,
      valor: (c) => `${c.clienteNome} · ${c.tipoOperacao} · ${nomes.empresa(c.empresaId)}`,
      cell: (c) => (
        <div className={s.cliente}>
          <span className={ui.cellStrong}>{c.clienteNome}</span>
          <small>
            {c.tipoOperacao} · {nomes.empresa(c.empresaId)}
            {c.localServico ? ` · ${c.localServico}` : ''}
          </small>
        </div>
      ),
    },
    { header: 'Modalidade', largura: LARGURA.status + 30, valor: (c) => (c.modalidade === 'spot' ? 'Spot' : 'Recorrente'), cell: (c) => <BadgeModalidade modalidade={c.modalidade} /> },
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
            <span>{mesAnoNum(c.inicio)} → {mesAnoNum(c.fim)}</span>
            <i className={s.vigMini}>
              <i style={{ width: `${Math.round(progressoVigencia(c, hoje) * 100)}%` }} />
            </i>
          </div>
        ),
    },
    {
      header: 'Valor',
      className: ui.right,
      largura: LARGURA.media,
      valor: (c) => valorContrato(c, hoje),
      cell: (c) => {
        const prox = proximaFatura(c, faturas)
        return (
          <div className={s.valorCel}>
            <span className={ui.cellStrong}>{porDocumento(c) ? 'por frete' : formatBRL(valorContrato(c, hoje))}</span>
            <small>
              {porDocumento(c) ? 'tabela do contrato' : c.modalidade === 'spot' ? 'total' : 'por mês'}
              {prox ? ` · vence ${dataBR(prox.vencimento).slice(0, 5)}` : ''}
            </small>
          </div>
        )
      },
    },
    { header: 'Atenção', largura: LARGURA.longa, valor: (c) => alertas(c).map((a) => a.texto).join(' · '), cell: (c) => <Alertas alertas={alertas(c)} max={1} /> },
    { header: 'Situação', largura: LARGURA.situacao, valor: (c) => sit(c), cell: (c) => <BadgeSituacao situacao={sit(c)} /> },
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
    const mensal = recorrentes.filter((c) => !porDocumento(c)).reduce((a, c) => a + valorContrato(c, hoje), 0)
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
          <div className={s.kpiVal}>{visiveis.filter((c) => alertas(c).some((a) => a.tom !== 'info')).length}</div>
          <div className={s.kpiSub}>atraso, devolução, vencimento ou reajuste perto</div>
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
          <div className={s.acoesTopo}>
            <button type="button" className={`${ui.btn} ${ui.btnGhost}`} onClick={() => navigate('/cadastros/modelos-contrato')}>
              <LayoutTemplate /> Modelos de contrato
            </button>
            <button type="button" className={`${ui.btn} ${ui.btnPrimary}`} onClick={() => navigate('/contratos/novo')} title="O contrato nasce de uma proposta aprovada">
              <FilePlus2 /> Novo contrato
            </button>
          </div>
        }
      />
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
        empty={isLoading ? 'Carregando...' : contratos.length === 0 ? 'Nenhum contrato ainda. Ele nasce de uma proposta aprovada: "Gerar contrato" na lista de propostas ou "Novo contrato" aqui.' : 'Nenhum contrato com esses filtros.'}
        filters={
          <>
            <select className={ui.filterSelect} value={empresa} onChange={(e) => setEmpresa(e.target.value)} aria-label="Empresa">
              <option value="todas">Todas as empresas</option>
              {empresas.map((id) => <option key={id} value={id}>{nomes.empresa(id)}</option>)}
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

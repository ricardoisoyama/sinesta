import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AlertTriangle, ChevronLeft, ChevronRight, ClipboardCheck, FileCheck2, FolderOpen, Landmark, ReceiptText, X } from 'lucide-react'
import ui from '@/features/common/ui.module.css'
import { PageHeader } from '@/features/common/PageHeader'
import { CrudList } from '@/features/common/CrudList'
import { AvisoPrototipo } from '@/features/common/AvisoPrototipo'
import type { Column } from '@/features/common/DataTable'
import { LARGURA, LARGURA_ICONE } from '@/features/common/grid'
import { avisar } from '@/features/common/dialogo/dialogo'
import { formatBRL } from '@/lib/format'
import { semAcento } from '@/lib/texto'
import { BadgeFatura, BadgeModalidade } from '@/features/contratos/componentes'
import { dataBR, ETAPAS_FATURA, hojeISO, ROTULO_SITUACAO_FATURA } from '@/features/contratos/regras'
import type { SituacaoFatura } from '@/features/contratos/types'
import { acaoPossivel, faturasDoMes, ROTULO_ACAO, totalDaFatura, type Acao, type FaturaCentral } from './dados'
import { ConferenciaModal } from './ConferenciaModal'
import s from './faturamento.module.css'

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
const somaMes = (comp: string, n: number) => {
  const [a, m] = comp.split('-').map(Number)
  const d = new Date(a, m - 1 + n, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
const nomeMes = (comp: string) => {
  const m = MESES[Number(comp.slice(5, 7)) - 1]
  return `${m[0].toUpperCase()}${m.slice(1)} de ${comp.slice(0, 4)}`
}

type FiltroEtapa = SituacaoFatura | 'todas' | 'atencao'

/**
 * Central de Faturamento (protótipo): o que precisa ser faturado no mês, de todos os contratos e
 * spots. O contrato mora na pasta; quem anda aqui é a fatura: prevista → conferida → NF → boleto →
 * recebida. Sem kanban: uma esteira com os totais por etapa e um grid com ações em lote.
 */
export function CentralFaturamentoPage() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const hoje = hojeISO()
  const [mes, setMes] = useState(hoje.slice(0, 7))
  const [empresa, setEmpresa] = useState('todas')
  const [etapa, setEtapa] = useState<FiltroEtapa>('todas')
  const [busca, setBusca] = useState('')
  // Mudanças do protótipo (conferir, emitir...) por id de fatura; somem ao sair da tela.
  const [mudancas, setMudancas] = useState<Record<string, Partial<FaturaCentral>>>({})
  const [conferindo, setConferindo] = useState<FaturaCentral | null>(null)
  const [nf, setNf] = useState(1170)
  const contratoFiltro = params.get('contrato')

  const doMes = faturasDoMes(mes, hoje).map((f) => ({ ...f, ...mudancas[f.id] }) as FaturaCentral)
  const daEmpresa = doMes.filter((f) => empresa === 'todas' || f.empresaId === empresa)
  const empresas = [...new Map(doMes.map((f) => [f.empresaId, f.empresaNome])).entries()]
  const q = semAcento(busca.trim())
  const linhas = daEmpresa
    .filter((f) => !contratoFiltro || f.contratoId === contratoFiltro)
    .filter((f) => etapa === 'todas' || (etapa === 'atencao' ? f.situacao === 'atrasada' || f.situacao === 'problema' : f.situacao === etapa))
    .filter((f) => !q || semAcento(`${f.numero} ${f.clienteNome} ${f.descricao} ${f.nf ?? ''} ${f.boleto ?? ''}`).includes(q))
    .sort((a, b) => ETAPAS_FATURA.indexOf(a.situacao) - ETAPAS_FATURA.indexOf(b.situacao) || a.vencimento.localeCompare(b.vencimento))

  const aplicar = (f: FaturaCentral, acao: Acao, extra: Partial<FaturaCentral> = {}): Partial<FaturaCentral> => {
    if (acao === 'conferir') return { situacao: 'conferida', ...extra }
    if (acao === 'emitir') return { situacao: 'nf-emitida', nf: f.documentoDaOperacao ? f.nf : String(nf), ...extra }
    return { situacao: 'boleto-emitido', boleto: `00${nf + 1000}`.slice(-6), ...extra }
  }
  const executar = (f: FaturaCentral, acao: Acao, extra: Partial<FaturaCentral> = {}) => {
    setMudancas((m) => ({ ...m, [f.id]: { ...m[f.id], ...aplicar(f, acao, extra) } }))
    if (acao !== 'conferir') setNf((n) => n + 1)
  }
  const emLote = (itens: FaturaCentral[], acao: Acao, limpar: () => void) => {
    const aptas = itens.filter((f) => acaoPossivel(f) === acao)
    const novo: Record<string, Partial<FaturaCentral>> = {}
    aptas.forEach((f, i) => {
      novo[f.id] = acao === 'emitir' ? { situacao: 'nf-emitida', nf: f.documentoDaOperacao ? f.nf : String(nf + i) } : acao === 'boleto' ? { situacao: 'boleto-emitido', boleto: `00${nf + 1000 + i}`.slice(-6) } : { situacao: 'conferida' }
    })
    setMudancas((m) => ({ ...m, ...Object.fromEntries(Object.entries(novo).map(([id, v]) => [id, { ...m[id], ...v }])) }))
    if (acao !== 'conferir') setNf((n) => n + aptas.length)
    limpar()
    const fora = itens.length - aptas.length
    void avisar({
      titulo: `${ROTULO_ACAO[acao]}: ${aptas.length} fatura(s)`,
      mensagem: `${aptas.length} fatura(s) ${acao === 'conferir' ? 'conferida(s)' : acao === 'emitir' ? 'com NFS-e emitida (as de transporte usam o CT-e da viagem)' : 'com boleto e Pix gerados'}.${fora ? ` ${fora} ficaram de fora porque estão em outra etapa.` : ''} No protótipo nada vai para a prefeitura nem para o banco.`,
    })
  }

  const contagem = (sit: SituacaoFatura[]) => {
    const l = daEmpresa.filter((f) => sit.includes(f.situacao))
    return { n: l.length, total: l.reduce((a, f) => a + totalDaFatura(f), 0) }
  }
  const atencao = contagem(['atrasada', 'problema'])

  const columns: Column<FaturaCentral>[] = [
    { header: 'Contrato', fixa: true, largura: LARGURA.curta, valor: (f) => f.numero, cell: (f) => <span className={s.numero}>{f.numero}</span> },
    {
      header: 'Cliente',
      fixa: true,
      valor: (f) => `${f.clienteNome} · ${f.descricao}`,
      cell: (f) => (
        <div className={s.cliente}>
          <span className={ui.cellStrong}>{f.clienteNome}</span>
          <small>{f.avulsa ? <b className={s.avulsa}>Extra separado</b> : null}{f.avulsa ? ' · ' : ''}{f.descricao}</small>
        </div>
      ),
    },
    { header: 'Modalidade', largura: LARGURA.curta, valor: (f) => f.modalidade, cell: (f) => <BadgeModalidade modalidade={f.modalidade} /> },
    { header: 'Referência', largura: LARGURA.curta, valor: (f) => f.referencia, cell: (f) => <span className={ui.cellMut}>{f.referencia}</span> },
    { header: 'Vencimento', largura: LARGURA.data, valor: (f) => dataBR(f.vencimento), cell: (f) => <span className={f.situacao === 'atrasada' ? s.atrasado : undefined}>{dataBR(f.vencimento)}</span> },
    {
      header: 'Total',
      className: ui.right,
      largura: LARGURA.valor,
      valor: (f) => totalDaFatura(f),
      cell: (f) => (
        <div className={s.valorCel}>
          <span className={ui.cellStrong}>{formatBRL(totalDaFatura(f))}</span>
          {f.extras.length > 0 && <small>+ {f.extras.length} extra(s)</small>}
        </div>
      ),
    },
    { header: 'Situação', largura: LARGURA.situacao, valor: (f) => ROTULO_SITUACAO_FATURA[f.situacao], cell: (f) => <BadgeFatura situacao={f.situacao} /> },
    {
      header: 'NF / Boleto',
      largura: LARGURA.media,
      valor: (f) => `${f.nf ?? ''} ${f.boleto ?? ''}`,
      cell: (f) => (
        <div className={s.docs}>
          <span>{f.nf ? (f.documentoDaOperacao ? f.nf : `NF ${f.nf}`) : '—'}</span>
          {f.boleto && <small>boleto {f.boleto}</small>}
        </div>
      ),
    },
    {
      header: 'Ações',
      fixa: true,
      largura: LARGURA.acoes + LARGURA_ICONE,
      className: ui.colActions,
      cell: (f) => {
        const acao = acaoPossivel(f)
        return (
          <>
            <button type="button" className={ui.iconBtn} title="Conferir a fatura" onClick={(e) => { e.stopPropagation(); setConferindo(f) }}>
              <ClipboardCheck />
            </button>
            {acao && acao !== 'conferir' && (
              <button type="button" className={ui.iconBtn} title={ROTULO_ACAO[acao]} onClick={(e) => { e.stopPropagation(); executar(f, acao) }}>
                {acao === 'emitir' ? <FileCheck2 /> : <Landmark />}
              </button>
            )}
            <button type="button" className={ui.iconBtn} title="Abrir a pasta do contrato" onClick={(e) => { e.stopPropagation(); navigate(`/contratos/${f.contratoId}`) }}>
              <FolderOpen />
            </button>
          </>
        )
      },
    },
  ]

  const passo = (sit: SituacaoFatura, i: number) => {
    const c = contagem(sit === 'boleto-emitido' ? ['boleto-emitido'] : [sit])
    return (
      <button key={sit} type="button" className={`${s.passo} ${etapa === sit ? s.passoOn : ''} ${c.n === 0 ? s.passoVazio : ''}`} onClick={() => setEtapa(etapa === sit ? 'todas' : sit)} aria-pressed={etapa === sit}>
        <span className={s.passoNum}>{i + 1}</span>
        <span className={s.passoTexto}>
          <b>{ROTULO_SITUACAO_FATURA[sit]}</b>
          <span>{c.n} · {formatBRL(c.total)}</span>
        </span>
      </button>
    )
  }

  const totalMes = daEmpresa.reduce((a, f) => a + totalDaFatura(f), 0)
  const recebido = contagem(['recebida']).total

  return (
    <div>
      <PageHeader
        breadcrumb="Financeiro"
        title="Faturamento"
        subtitle="As faturas do mês de todos os contratos e spots: conferir, emitir a NFS-e, gerar o boleto e acompanhar até receber."
        action={
          <div className={s.topoAcoes}>
            <div className={s.mesNav}>
              <button type="button" onClick={() => setMes(somaMes(mes, -1))} aria-label="Mês anterior"><ChevronLeft size={16} /></button>
              <span>{nomeMes(mes)}</span>
              <button type="button" onClick={() => setMes(somaMes(mes, 1))} aria-label="Próximo mês"><ChevronRight size={16} /></button>
            </div>
            <select className={ui.filterSelect} value={empresa} onChange={(e) => setEmpresa(e.target.value)} aria-label="Empresa">
              <option value="todas">Todas as empresas</option>
              {empresas.map(([id, nome]) => <option key={id} value={id}>{nome}</option>)}
            </select>
          </div>
        }
      />
      <AvisoPrototipo>dados de exemplo; conferir, emitir e gerar boleto aqui só mudam a tela (nada vai para a prefeitura nem para o banco).</AvisoPrototipo>

      <div className={s.painel}>
        <div className={s.totais}>
          <div>
            <span className={s.totRotulo}>A faturar em {nomeMes(mes)}</span>
            <span className={s.totValor}>{formatBRL(totalMes)}</span>
            <span className={s.totSub}>{daEmpresa.length} fatura(s) · {formatBRL(recebido)} já recebido</span>
          </div>
          <div className={s.barraMes} aria-hidden>
            <i className={s.barraRecebido} style={{ width: `${totalMes ? (recebido / totalMes) * 100 : 0}%` }} />
          </div>
          {atencao.n > 0 && (
            <button type="button" className={`${s.atencao} ${etapa === 'atencao' ? s.atencaoOn : ''}`} onClick={() => setEtapa(etapa === 'atencao' ? 'todas' : 'atencao')}>
              <AlertTriangle size={15} /> {atencao.n} em atraso ou com problema · {formatBRL(atencao.total)}
            </button>
          )}
        </div>
        <div className={s.esteira}>{ETAPAS_FATURA.map(passo)}</div>
      </div>

      {contratoFiltro && (
        <div className={s.filtroContrato}>
          Mostrando só o contrato {doMes.find((f) => f.contratoId === contratoFiltro)?.numero ?? ''}
          <button type="button" onClick={() => setParams({})} aria-label="Tirar o filtro"><X size={13} /> ver todos</button>
        </div>
      )}

      <CrudList
        id="faturamento"
        query={busca}
        onQuery={setBusca}
        searchPlaceholder="Buscar por contrato, cliente, NF ou boleto..."
        columns={columns}
        rows={linhas}
        getKey={(f) => f.id}
        rotulo={['fatura', 'faturas']}
        pageSize={12}
        onRowClick={setConferindo}
        empty={etapa === 'todas' ? 'Nenhuma fatura neste mês.' : `Nenhuma fatura em "${etapa === 'atencao' ? 'atenção' : ROTULO_SITUACAO_FATURA[etapa]}".`}
        acoesLote={({ itens, limpar }) => (
          <>
            <button type="button" className={ui.selBtn} onClick={() => emLote(itens, 'conferir', limpar)}><ClipboardCheck size={14} /> Conferir</button>
            <button type="button" className={ui.selBtn} onClick={() => emLote(itens, 'emitir', limpar)}><ReceiptText size={14} /> Emitir NFS-e</button>
            <button type="button" className={ui.selBtn} onClick={() => emLote(itens, 'boleto', limpar)}><Landmark size={14} /> Gerar boletos</button>
          </>
        )}
      />

      <ConferenciaModal
        fatura={conferindo}
        onClose={() => setConferindo(null)}
        onAbrirPasta={(id) => navigate(`/contratos/${id}`)}
        onAprovar={(f, ajustes, emitir) => {
          executar(f, 'conferir', ajustes)
          if (emitir) setMudancas((m) => ({ ...m, [f.id]: { ...m[f.id], ...ajustes, situacao: 'nf-emitida', nf: f.documentoDaOperacao ? f.nf : String(nf) } }))
          if (emitir) setNf((n) => n + 1)
          setConferindo(null)
        }}
      />
    </div>
  )
}

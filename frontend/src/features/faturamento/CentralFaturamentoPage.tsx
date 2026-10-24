import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AlertTriangle, ChevronLeft, ChevronRight, ClipboardCheck, FileCheck2, FilePlus2, FolderOpen, HandCoins, Landmark, X } from 'lucide-react'
import ui from '@/features/common/ui.module.css'
import { PageHeader } from '@/features/common/PageHeader'
import { CrudList } from '@/features/common/CrudList'
import type { Column } from '@/features/common/DataTable'
import { LARGURA, LARGURA_ICONE } from '@/features/common/grid'
import { avisar } from '@/features/common/dialogo/dialogo'
import { formatBRL } from '@/lib/format'
import { getErrorMessage } from '@/lib/api'
import { semAcento } from '@/lib/texto'
import { BadgeFatura } from '@/features/contratos/componentes'
import { dataBR, ETAPAS_FATURA, hojeISO, ROTULO_SITUACAO_FATURA } from '@/features/contratos/regras'
import { avancarFatura, conferirLote, useFaturasDoMes, useRecarregarContratos, type DadosEtapa, type EtapaFatura } from '@/features/contratos/api'
import { faturasCentrais, useNomes, type FaturaCentral } from '@/features/contratos/faturas'
import type { SituacaoFatura } from '@/features/contratos/types'
import { ConferenciaModal } from './ConferenciaModal'
import { NovaCobrancaModal } from './NovaCobrancaModal'
import { RegistroModal, type Registro } from './RegistroModal'
import { PendentesSiimp } from './PendentesSiimp'
import { PERMISSAO_NFSE, abrirArquivoNfse, emitirNfseFatura, useNfseDasFaturas } from './nfseFatura'
import { useAuth } from '@/features/auth/auth-context'
import { usePendentes } from './pendentes'
import { useEmpresasQuery } from '@/features/cadastros/hooks'
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
const ATENCAO: SituacaoFatura[] = ['atrasada', 'devolvida']
/** Grupos dos cards: o que ainda vai ser faturado e o que já foi (NF/boleto emitidos). */
const A_FATURAR: SituacaoFatura[] = ['prevista', 'a-conferir', 'conferida']
const FATURADO: SituacaoFatura[] = ['nf-emitida', 'boleto-emitido']
const ultimoDiaDoMes = (comp: string) => {
  const [a, m] = comp.split('-').map(Number)
  return `${comp}-${String(new Date(a, m, 0).getDate()).padStart(2, '0')}`
}

/** O passo seguinte da fatura (o botão de "avançar" da linha). Devolvida volta pela pasta do contrato. */
const proximoPasso = (f: FaturaCentral): Registro | 'conferir' | null =>
  f.situacao === 'prevista' || f.situacao === 'a-conferir' ? 'conferir'
    : f.situacao === 'conferida' ? 'nf'
      : f.situacao === 'nf-emitida' ? 'boleto'
        : f.situacao === 'boleto-emitido' || f.situacao === 'atrasada' ? 'recebimento' : null
const ROTULO_PASSO: Record<Registro, string> = { nf: 'Registrar a NF', boleto: 'Registrar o boleto', recebimento: 'Registrar o recebimento' }
const ICONE_PASSO: Record<Registro, typeof Landmark> = { nf: FileCheck2, boleto: Landmark, recebimento: HandCoins }

type FiltroEtapa = SituacaoFatura | 'todas' | 'atencao' | 'a-faturar' | 'faturado'
const GRUPO: Partial<Record<FiltroEtapa, SituacaoFatura[]>> = { atencao: ATENCAO, 'a-faturar': A_FATURAR, faturado: FATURADO }

/**
 * Central de Faturamento: o que precisa ser faturado no mês, de todos os contratos e spots. O
 * contrato mora na pasta; quem anda aqui é a fatura: prevista → conferida → NF → boleto → recebida.
 * A conferência pode devolver a fatura (com motivo) para alguém ajustar o contrato.
 */
export function CentralFaturamentoPage() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const recarregar = useRecarregarContratos()
  const nomes = useNomes()
  const hoje = hojeISO()
  const [mes, setMes] = useState(params.get('mes') ?? hoje.slice(0, 7))
  const [empresa, setEmpresa] = useState('todas')
  const [etapa, setEtapa] = useState<FiltroEtapa>('todas')
  const [busca, setBusca] = useState('')
  const [conferindoId, setConferindoId] = useState<string | null>(null)
  const [registro, setRegistro] = useState<{ id: string; etapa: Registro } | null>(null)
  const [novaCobranca, setNovaCobranca] = useState(false)
  const contratoFiltro = params.get('contrato')
  // Visão "Fretes sem fatura": CT-es e minutas da SIIMP ainda sem fatura (piloto de convivência com a SIIMP).
  const visaoSiimp = params.get('visao') === 'siimp'
  const { data: todasEmpresas } = useEmpresasQuery()
  const { data: fretes } = usePendentes(`${mes}-01`, ultimoDiaDoMes(mes))
  const { data, isLoading } = useFaturasDoMes(mes)

  const doMes = faturasCentrais(data?.contratos ?? [], data?.faturas ?? [], nomes)
  // NFS-e emitidas pelo ELROND: situação ao lado da fatura (emitida vira a NF da fatura no servidor).
  const { user } = useAuth()
  const podeEmitirNfse = !!user?.permissoes?.includes(PERMISSAO_NFSE)
  const { porFatura: nfses, recarregar: recarregarNfse } = useNfseDasFaturas(
    doMes.filter((f) => !!f.nfseId).map((f) => f.id),
    recarregar,
  )
  const conferindo = conferindoId ? doMes.find((f) => f.id === conferindoId) ?? null : null
  const registrando = registro ? doMes.find((f) => f.id === registro.id) : undefined
  const daEmpresa = doMes.filter((f) => empresa === 'todas' || f.empresaId === empresa)
  // Todas as empresas ativas (não só as que já têm fatura no mês: no começo do piloto não há nenhuma).
  const empresas = [...new Set([...(todasEmpresas ?? []).filter((e) => e.status === 'ativo').map((e) => e.id), ...doMes.map((f) => f.empresaId)])]
  const q = semAcento(busca.trim())
  const linhas = daEmpresa
    .filter((f) => !contratoFiltro || f.contratoId === contratoFiltro)
    .filter((f) => etapa === 'todas' || (GRUPO[etapa] ? GRUPO[etapa]!.includes(f.situacao) : f.situacao === etapa))
    .filter((f) => !q || semAcento(`${f.numero} ${f.clienteNome} ${f.descricao} ${f.nf} ${f.boleto}`).includes(q))
    .sort((a, b) => Number(!ATENCAO.includes(a.situacao)) - Number(!ATENCAO.includes(b.situacao)) || ETAPAS_FATURA.indexOf(a.situacao) - ETAPAS_FATURA.indexOf(b.situacao) || a.vencimento.localeCompare(b.vencimento))

  /** Chama o servidor, recarrega as três telas e fecha o que estiver aberto. Erro vira aviso. */
  const executar = async (fn: () => Promise<unknown>) => {
    try {
      await fn()
      await recarregar()
      setConferindoId(null)
      setRegistro(null)
    } catch (err) {
      void avisar({ titulo: 'Não foi possível concluir', mensagem: getErrorMessage(err) })
    }
  }
  const avancar = (id: string, e: EtapaFatura, dados: DadosEtapa = {}) => executar(() => avancarFatura(id, e, dados))

  const conferirEmLote = async (itens: FaturaCentral[], limpar: () => void) => {
    const aptas = itens.filter((f) => proximoPasso(f) === 'conferir')
    if (!aptas.length) return void avisar({ titulo: 'Nada para conferir', mensagem: 'As faturas escolhidas não estão esperando conferência.' })
    await executar(async () => {
      const r = await conferirLote(aptas.map((f) => f.id))
      limpar()
      const fora = itens.length - r.conferidas
      void avisar({ titulo: `${r.conferidas} fatura(s) conferida(s)`, mensagem: fora ? `${fora} ficaram de fora porque estão em outra etapa.` : 'Agora é registrar a NF de cada uma.' })
    })
  }

  const contagem = (sit: SituacaoFatura[]) => {
    const l = daEmpresa.filter((f) => sit.includes(f.situacao))
    return { n: l.length, total: l.reduce((a, f) => a + f.total, 0) }
  }
  const atencao = contagem(ATENCAO)

  const columns: Column<FaturaCentral>[] = [
    {
      header: 'Contrato',
      fixa: true,
      largura: LARGURA.curta,
      valor: (f) => `${f.numero} ${f.modalidade}`,
      cell: (f) => (
        <div className={s.cliente}>
          <span className={s.numero}>{f.numero}</span>
          <small>{f.modalidade === 'spot' ? 'spot' : 'recorrente'}</small>
        </div>
      ),
    },
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
    { header: 'Referência', largura: LARGURA.media, valor: (f) => f.referencia, cell: (f) => <span className={ui.cellMut}>{f.referencia}</span> },
    { header: 'Vencimento', largura: LARGURA.data, valor: (f) => dataBR(f.vencimento), cell: (f) => <span className={f.situacao === 'atrasada' ? s.atrasado : undefined}>{dataBR(f.vencimento)}</span> },
    {
      header: 'Total',
      className: ui.right,
      largura: LARGURA.valor,
      valor: (f) => f.total,
      cell: (f) => (
        <div className={s.valorCel}>
          <span className={ui.cellStrong}>{formatBRL(f.total)}</span>
          {f.extras.length > 0 && <small>+ {f.extras.length} extra(s)</small>}
        </div>
      ),
    },
    {
      header: 'Situação',
      largura: LARGURA.media,
      valor: (f) => `${ROTULO_SITUACAO_FATURA[f.situacao]} ${f.nf} ${f.boleto}`,
      cell: (f) => (
        <div className={s.docs}>
          <BadgeFatura situacao={f.situacao} />
          {(f.nf || f.boleto) && <small>{[f.nf && (f.documentoDaOperacao || f.nf.startsWith('NFS-e') ? f.nf : `NF ${f.nf}`), f.boleto && `boleto ${f.boleto}`].filter(Boolean).join(' · ')}</small>}
          {(() => {
            const n = nfses.get(f.id)?.nota
            if (!n) return null
            if (n.situacao === 'Rejeitada') return <small className={s.atrasado} title={n.mensagem}>NFS-e rejeitada: {n.mensagem}</small>
            if (n.emAndamento) return <small>NFS-e na prefeitura…</small>
            return n.temArquivos ? (
              <small>
                <button type="button" className={s.linkNfse} onClick={(e) => { e.stopPropagation(); void abrirArquivoNfse(n.id, 'pdf').catch((err) => avisar({ titulo: 'Não foi possível abrir', mensagem: getErrorMessage(err) })) }}>PDF</button>
                {' · '}
                <button type="button" className={s.linkNfse} onClick={(e) => { e.stopPropagation(); void abrirArquivoNfse(n.id, 'xml').catch((err) => avisar({ titulo: 'Não foi possível abrir', mensagem: getErrorMessage(err) })) }}>XML</button>
              </small>
            ) : null
          })()}
        </div>
      ),
    },
    {
      header: 'Ações',
      fixa: true,
      largura: LARGURA.acoes + LARGURA_ICONE,
      className: ui.colActions,
      cell: (f) => {
        const passo = proximoPasso(f)
        const Icone = passo && passo !== 'conferir' ? ICONE_PASSO[passo] : null
        return (
          <>
            <button type="button" className={ui.iconBtn} title="Conferir a fatura" onClick={(e) => { e.stopPropagation(); setConferindoId(f.id) }}>
              <ClipboardCheck />
            </button>
            {passo && passo !== 'conferir' && Icone && (
              <button type="button" className={ui.iconBtn} title={ROTULO_PASSO[passo]} onClick={(e) => { e.stopPropagation(); setRegistro({ id: f.id, etapa: passo }) }}>
                <Icone />
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

  const passoEsteira = (sit: SituacaoFatura, i: number) => {
    const c = contagem([sit])
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

  const fretesSemFatura = (fretes ?? []).filter((d) => d.situacao === 'pendente' && (empresa === 'todas' || d.empresaId === empresa))
  /** Card do topo: número, valor e, ao clicar, a visão/filtro correspondente. */
  const card = (rotulo: string, n: number, total: number, sub: string, ativo: boolean, onClick: () => void, tom = '') => (
    <button type="button" className={`${s.card} ${tom} ${ativo ? s.cardOn : ''}`} onClick={onClick} aria-pressed={ativo}>
      <span className={s.cardRotulo}>{rotulo}</span>
      <span className={s.cardValor}>{formatBRL(total)}</span>
      <span className={s.cardSub}>{n} · {sub}</span>
    </button>
  )
  const verFaturas = (e: FiltroEtapa) => {
    if (visaoSiimp) setParams({})
    setEtapa(etapa === e && !visaoSiimp ? 'todas' : e)
  }

  const totalMes = daEmpresa.reduce((a, f) => a + f.total, 0)
  const recebido = contagem(['recebida']).total

  return (
    <div>
      <PageHeader
        breadcrumb="Financeiro"
        title="Faturamento"
        subtitle="As faturas do mês de todos os contratos e spots: conferir, registrar a NF e o boleto e acompanhar até receber."
        action={
          <div className={s.topoAcoes}>
            <div className={s.mesNav}>
              <button type="button" onClick={() => setMes(somaMes(mes, -1))} aria-label="Mês anterior"><ChevronLeft size={16} /></button>
              <span>{nomeMes(mes)}</span>
              <button type="button" onClick={() => setMes(somaMes(mes, 1))} aria-label="Próximo mês"><ChevronRight size={16} /></button>
            </div>
            <select className={ui.filterSelect} value={empresa} onChange={(e) => setEmpresa(e.target.value)} aria-label="Empresa">
              <option value="todas">Todas as empresas</option>
              {empresas.map((id) => <option key={id} value={id}>{nomes.empresa(id)}</option>)}
            </select>
            <button type="button" className={`${ui.btn} ${ui.btnPrimary}`} onClick={() => setNovaCobranca(true)}><FilePlus2 /> Nova cobrança avulsa</button>
          </div>
        }
      />

      <div className={s.cards}>
        {card('Fretes sem fatura', fretesSemFatura.length, fretesSemFatura.reduce((a, d) => a + d.valor, 0), 'CT-es e minutas da SIIMP', visaoSiimp, () => setParams({ visao: 'siimp' }), s.cardFretes)}
        {card('A faturar', contagem(A_FATURAR).n, contagem(A_FATURAR).total, 'previstas e em conferência', !visaoSiimp && etapa === 'a-faturar', () => verFaturas('a-faturar'))}
        {card('Faturado', contagem(FATURADO).n, contagem(FATURADO).total, 'NF e boleto emitidos', !visaoSiimp && etapa === 'faturado', () => verFaturas('faturado'))}
        {card('Recebido', contagem(['recebida']).n, contagem(['recebida']).total, 'pago pelo cliente', !visaoSiimp && etapa === 'recebida', () => verFaturas('recebida'), s.cardOk)}
        {card('Em atraso', atencao.n, atencao.total, 'vencidas ou devolvidas', !visaoSiimp && etapa === 'atencao', () => verFaturas('atencao'), atencao.n > 0 ? s.cardAlerta : '')}
      </div>

      {visaoSiimp ? (
        <PendentesSiimp key={mes} mes={mes} empresa={empresa} nomeEmpresa={nomes.empresa} />
      ) : (
      <>
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
              <AlertTriangle size={15} /> {atencao.n} em atraso ou devolvida(s) · {formatBRL(atencao.total)}
            </button>
          )}
        </div>
        <div className={s.esteira}>{ETAPAS_FATURA.map(passoEsteira)}</div>
      </div>

      {contratoFiltro && (
        <div className={s.filtroContrato}>
          Mostrando só o contrato {data?.contratos.find((c) => c.id === contratoFiltro)?.numero ?? ''}
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
        onRowClick={(f) => setConferindoId(f.id)}
        empty={isLoading ? 'Carregando...' : etapa === 'todas' ? 'Nenhuma fatura neste mês. Elas nascem dos contratos (a partir do mês em que cada um começa a faturar pelo ELROND).' : `Nenhuma fatura em "${etapa === 'atencao' ? 'em atraso' : etapa === 'a-faturar' ? 'a faturar' : etapa === 'faturado' ? 'faturado' : ROTULO_SITUACAO_FATURA[etapa]}".`}
        acoesLote={({ itens, limpar }) => (
          <button type="button" className={ui.selBtn} onClick={() => void conferirEmLote(itens, limpar)}><ClipboardCheck size={14} /> Conferir</button>
        )}
      />
      </>
      )}

      <ConferenciaModal
        fatura={conferindo}
        onClose={() => setConferindoId(null)}
        onAbrirPasta={(id) => navigate(`/contratos/${id}`)}
        onAprovar={(f, dados, nf) =>
          executar(async () => {
            await avancarFatura(f.id, 'conferir', dados)
            if (nf !== null) await avancarFatura(f.id, 'nf', { numero: nf })
          })
        }
        onDevolver={(f, motivo) => avancar(f.id, 'devolver', { motivo })}
      />
      {registro && registrando && (
        <RegistroModal
          fatura={registrando}
          etapa={registro.etapa}
          onClose={() => setRegistro(null)}
          onConfirmar={(dados) => avancar(registrando.id, registro.etapa, dados)}
          nfse={nfses.get(registrando.id)}
          onEmitirNfse={
            podeEmitirNfse
              ? async () => {
                  const r = await emitirNfseFatura(registrando.id)
                  await recarregar()
                  await recarregarNfse()
                  return r
                }
              : undefined
          }
        />
      )}
      {novaCobranca && (
        <NovaCobrancaModal
          onClose={() => setNovaCobranca(false)}
          onCriado={(id, mesFatura) => {
            setNovaCobranca(false)
            setMes(mesFatura)
            setParams({ contrato: id })
          }}
        />
      )}
    </div>
  )
}

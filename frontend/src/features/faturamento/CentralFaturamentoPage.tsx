import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AlertTriangle, ChevronLeft, ChevronRight, ClipboardCheck, FileCheck2, FilePlus2, FolderOpen, Landmark, ReceiptText, X } from 'lucide-react'
import ui from '@/features/common/ui.module.css'
import { PageHeader } from '@/features/common/PageHeader'
import { CrudList } from '@/features/common/CrudList'
import { AvisoPrototipo } from '@/features/common/AvisoPrototipo'
import type { Column } from '@/features/common/DataTable'
import { LARGURA, LARGURA_ICONE } from '@/features/common/grid'
import { avisar, confirmar } from '@/features/common/dialogo/dialogo'
import { formatBRL } from '@/lib/format'
import { semAcento } from '@/lib/texto'
import { BadgeFatura, BadgeModalidade } from '@/features/contratos/componentes'
import { dataBR, ETAPAS_FATURA, hojeISO, ROTULO_SITUACAO_FATURA } from '@/features/contratos/regras'
import { prototipo, usePrototipo } from '@/features/contratos/store'
import type { AjusteFatura } from '@/features/contratos/faturas'
import type { SituacaoFatura } from '@/features/contratos/types'
import { acaoPossivel, faturasDoMes, ROTULO_ACAO, totalDaFatura, type Acao, type FaturaCentral } from './dados'
import { ConferenciaModal } from './ConferenciaModal'
import { NovaCobrancaModal } from './NovaCobrancaModal'
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
const ATENCAO: SituacaoFatura[] = ['atrasada', 'problema', 'devolvida']

type FiltroEtapa = SituacaoFatura | 'todas' | 'atencao'

/**
 * Central de Faturamento (protótipo): o que precisa ser faturado no mês, de todos os contratos e
 * spots. O contrato mora na pasta; quem anda aqui é a fatura: prevista → conferida → NF → boleto →
 * recebida. A conferência pode devolver a fatura (com motivo) para alguém ajustar o contrato.
 */
export function CentralFaturamentoPage() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const hoje = hojeISO()
  const { contratos, ajustes } = usePrototipo()
  const [mes, setMes] = useState(hoje.slice(0, 7))
  const [empresa, setEmpresa] = useState('todas')
  const [etapa, setEtapa] = useState<FiltroEtapa>('todas')
  const [busca, setBusca] = useState('')
  const [conferindoId, setConferindoId] = useState<string | null>(null)
  const [novaCobranca, setNovaCobranca] = useState(false)
  const contratoFiltro = params.get('contrato')

  const doMes = faturasDoMes(contratos, mes, hoje, ajustes)
  const conferindo = conferindoId ? doMes.find((f) => f.id === conferindoId) ?? null : null
  const daEmpresa = doMes.filter((f) => empresa === 'todas' || f.empresaId === empresa)
  const empresas = [...new Map(contratos.map((c) => [c.empresaId, c.empresaNome])).entries()]
  const q = semAcento(busca.trim())
  const linhas = daEmpresa
    .filter((f) => !contratoFiltro || f.contratoId === contratoFiltro)
    .filter((f) => etapa === 'todas' || (etapa === 'atencao' ? ATENCAO.includes(f.situacao) : f.situacao === etapa))
    .filter((f) => !q || semAcento(`${f.numero} ${f.clienteNome} ${f.descricao} ${f.nf ?? ''} ${f.boleto ?? ''}`).includes(q))
    .sort((a, b) => Number(!ATENCAO.includes(a.situacao)) - Number(!ATENCAO.includes(b.situacao)) || ETAPAS_FATURA.indexOf(a.situacao) - ETAPAS_FATURA.indexOf(b.situacao) || a.vencimento.localeCompare(b.vencimento))

  // Numeração das NFS-e do protótipo: continua da maior já usada.
  const proximaNf = () => Math.max(1169, ...Object.values(ajustes).map((a) => Number(a.nf) || 0)) + 1
  const passo = (f: FaturaCentral, acao: Acao, nf: number): AjusteFatura =>
    acao === 'conferir' ? { situacao: 'conferida' } : acao === 'emitir' ? { situacao: 'nf-emitida', nf: f.documentoDaOperacao ? f.nf : String(nf) } : { situacao: 'boleto-emitido', boleto: `00${nf + 1000}`.slice(-6) }
  const textoDe = (acao: Acao, f: FaturaCentral) => (acao === 'conferir' ? 'Conferida' : acao === 'emitir' ? (f.documentoDaOperacao ? 'Cobrança liberada (documento da viagem)' : 'NFS-e emitida') : 'Boleto e Pix gerados')

  const executar = (f: FaturaCentral, acao: Acao) =>
    prototipo.ajustarFatura(f.id, passo(f, acao, proximaNf()), { quem: 'você', texto: textoDe(acao, f), total: totalDaFatura(f) })

  const emLote = (itens: FaturaCentral[], acao: Acao, limpar: () => void) => {
    const aptas = itens.filter((f) => acaoPossivel(f) === acao)
    const base = proximaNf()
    prototipo.ajustarFaturas(aptas.map((f, i) => ({ id: f.id, parcial: passo(f, acao, base + i), versao: { quem: 'você', texto: `${textoDe(acao, f)} (em lote)`, total: totalDaFatura(f) } })))
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
  const atencao = contagem(ATENCAO)

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
    { header: 'Referência', largura: LARGURA.media, valor: (f) => f.referencia, cell: (f) => <span className={ui.cellMut}>{f.referencia}</span> },
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
            <button type="button" className={ui.iconBtn} title="Conferir a fatura" onClick={(e) => { e.stopPropagation(); setConferindoId(f.id) }}>
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
            <button type="button" className={`${ui.btn} ${ui.btnPrimary}`} onClick={() => setNovaCobranca(true)}><FilePlus2 /> Novo spot ou cobrança</button>
          </div>
        }
      />
      <AvisoPrototipo
        onRestaurar={async () => {
          if (await confirmar({ titulo: 'Restaurar os exemplos', mensagem: 'Voltar contratos, modelos e faturas do protótipo para os dados de exemplo? O que foi mexido neste navegador some.', confirmar: 'Restaurar' })) prototipo.restaurarExemplos()
        }}
      >
        dados de exemplo, guardados só neste navegador; conferir, emitir e gerar boleto não vão para a prefeitura nem para o banco.
      </AvisoPrototipo>

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
              <AlertTriangle size={15} /> {atencao.n} em atraso, devolvida(s) ou com problema · {formatBRL(atencao.total)}
            </button>
          )}
        </div>
        <div className={s.esteira}>{ETAPAS_FATURA.map(passoEsteira)}</div>
      </div>

      {contratoFiltro && (
        <div className={s.filtroContrato}>
          Mostrando só o contrato {contratos.find((c) => c.id === contratoFiltro)?.numero ?? ''}
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
        onClose={() => setConferindoId(null)}
        onAbrirPasta={(id) => navigate(`/contratos/${id}`)}
        onAprovar={(f, ajuste, emitir, totalNovo) => {
          const nf = proximaNf()
          prototipo.ajustarFatura(
            f.id,
            emitir ? { ...ajuste, situacao: 'nf-emitida', nf: f.documentoDaOperacao ? f.nf : String(nf) } : { ...ajuste, situacao: 'conferida' },
            { quem: 'você', texto: emitir ? (f.documentoDaOperacao ? 'Conferida e cobrança liberada' : 'Conferida e NFS-e emitida') : 'Conferência aprovada', total: totalNovo },
          )
          setConferindoId(null)
        }}
        onDevolver={(f, motivo, totalAtual) => {
          prototipo.ajustarFatura(f.id, { situacao: 'devolvida', motivo }, { quem: 'você', texto: `Devolvida na conferência: ${motivo}`, total: totalAtual })
          setConferindoId(null)
        }}
      />
      {novaCobranca && (
        <NovaCobrancaModal
          onClose={() => setNovaCobranca(false)}
          onCriado={(id, mesFatura) => {
            setNovaCobranca(false)
            setMes(mesFatura)
            setConferindoId(null)
            void avisar({ titulo: 'Criado', mensagem: 'O spot já tem a sua pasta e a fatura está "A conferir" nesta lista.' }).then(() => navigate(`/financeiro/faturamento?contrato=${id}`))
          }}
        />
      )}
    </div>
  )
}

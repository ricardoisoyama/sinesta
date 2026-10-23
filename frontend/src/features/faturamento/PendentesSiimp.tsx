import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, CloudDownload, FileText, Loader2, Receipt, UserPlus } from 'lucide-react'
import ui from '@/features/common/ui.module.css'
import { CrudList } from '@/features/common/CrudList'
import type { Column } from '@/features/common/DataTable'
import { LARGURA } from '@/features/common/grid'
import { avisar } from '@/features/common/dialogo/dialogo'
import { formatBRL, formatCpfCnpj } from '@/lib/format'
import { getErrorMessage } from '@/lib/api'
import { semAcento } from '@/lib/texto'
import { dataBR } from '@/features/contratos/regras'
import { FaturarModal } from './FaturarModal'
import { FaturasEmitidas } from './FaturasEmitidas'
import { useFaturasClientes } from './faturasClientes'
import { consultarSiimp, ROTULO_PENDENTE, usePendentes, useSituacaoConsulta, type DocumentoFaturavel, type SituacaoPendente } from './pendentes'
import s from './faturamento.module.css'

interface Props {
  /** Mês da Central (yyyy-MM): o período padrão da consulta. */
  mes: string
  /** Empresa escolhida na Central ("todas" = todas). */
  empresa: string
  nomeEmpresa: (id: string) => string
}

type Filtro = SituacaoPendente | 'todas'
const TOM: Record<SituacaoPendente, string> = {
  pendente: ui.badgeWarn,
  'faturado-siimp': ui.badgeOff,
  'faturado-elrond': ui.badgeOk,
  incompleto: ui.badgeInfo,
  cancelado: ui.badgeOff,
}
const ultimoDia = (mes: string) => {
  const [a, m] = mes.split('-').map(Number)
  return `${mes}-${String(new Date(a, m, 0).getDate()).padStart(2, '0')}`
}
/** O piloto olha só o recente: no máximo 31 dias por consulta (o antigo fica com a SIIMP). */
const MAX_DIAS = 31
const dias = (de: string, ate: string) => Math.round((Date.parse(ate) - Date.parse(de)) / 86_400_000) + 1
const horaBR = (iso: string) => (iso ? new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '')

/**
 * CT-es e minutas da SIIMP que ainda não têm fatura (piloto de convivência). "Consultar SIIMP" lê o
 * mês e liga cada documento à empresa (CNPJ do emitente) e ao cliente (CNPJ do tomador). O que o
 * ELROND já faturou nunca volta como pendente.
 */
export function PendentesSiimp({ mes, empresa, nomeEmpresa }: Props) {
  const qc = useQueryClient()
  const [periodo, setPeriodo] = useState({ de: `${mes}-01`, ate: ultimoDia(mes) })
  const { de, ate } = periodo
  const periodoErro = !de || !ate ? 'Informe o período.' : ate < de ? 'O fim vem antes do início.' : dias(de, ate) > MAX_DIAS ? `No máximo ${MAX_DIAS} dias por consulta.` : ''
  const { data, isLoading } = usePendentes(de, ate)
  const { data: consulta } = useSituacaoConsulta()
  const [filtro, setFiltro] = useState<Filtro>('pendente')
  const [busca, setBusca] = useState('')
  const rodando = !!consulta?.rodando
  // Aba: os documentos da SIIMP ou as faturas que o ELROND já emitiu com eles.
  const [aba, setAba] = useState<'documentos' | 'faturas'>('documentos')
  const [faturando, setFaturando] = useState<DocumentoFaturavel[] | null>(null)
  const { data: emitidas } = useFaturasClientes(de, ate)
  const qtdEmitidas = (emitidas ?? []).filter((f) => empresa === 'todas' || f.fatura.empresaId === empresa).length

  const daEmpresa = (data ?? []).filter((d) => empresa === 'todas' || d.empresaId === empresa)
  const q = semAcento(busca.trim())
  const linhas = daEmpresa
    .filter((d) => filtro === 'todas' || d.situacao === filtro)
    .filter((d) => !q || semAcento(`${d.numero} ${d.tomadorNome} ${d.tomadorDocumento} ${d.descricao} ${d.nfseNumero}`).includes(q))
  const conta = (sit: SituacaoPendente) => daEmpresa.filter((d) => d.situacao === sit)
  const aFaturar = conta('pendente')
  const ultima = consulta && !consulta.rodando && consulta.terminadaEm && consulta.de === de ? consulta : null

  const consultar = async () => {
    if (periodoErro) return
    try {
      await consultarSiimp(de, ate)
      await qc.invalidateQueries({ queryKey: ['faturamento-pendente', 'situacao'] })
    } catch (err) {
      void avisar({ titulo: 'Não foi possível consultar', mensagem: getErrorMessage(err) })
    }
  }

  /** Só pendentes, de uma empresa, de um cliente e de um tipo: o servidor confere de novo. */
  const abrirFaturar = (itens: DocumentoFaturavel[]) => {
    const aptos = itens.filter((d) => d.situacao === 'pendente')
    const problema =
      aptos.length === 0 ? 'Escolha documentos "a faturar".'
        : aptos.some((d) => !d.empresaId) ? 'Há documento de um CNPJ emitente que não está cadastrado como empresa.'
          : aptos.some((d) => !d.clienteId) ? 'Há documento de um tomador que não está cadastrado como cliente.'
            : new Set(aptos.map((d) => d.empresaId)).size > 1 ? 'Os documentos são de empresas diferentes: cada empresa emite a sua fatura.'
              : new Set(aptos.map((d) => d.clienteId)).size > 1 ? 'Os documentos são de clientes diferentes: escolha os de um cliente só.'
                : new Set(aptos.map((d) => d.tipo)).size > 1 ? 'Fature CT-es e minutas separadamente.'
                  : ''
    if (problema) {
      void avisar({ titulo: 'Não dá para faturar juntos', mensagem: problema })
      return false
    }
    setFaturando(aptos)
    return true
  }

  const columns: Column<DocumentoFaturavel>[] = [
    {
      header: 'Documento',
      fixa: true,
      largura: LARGURA.longa,
      valor: (d) => `${d.tipo} ${d.numero}`,
      cell: (d) => (
        <div className={ui.rowName}>
          <span className={ui.avatarSm}>{d.tipo === 'cte' ? <FileText size={15} /> : <Receipt size={15} />}</span>
          <div>
            <div className={ui.cellStrong}>{d.tipo === 'cte' ? 'CT-e' : 'Minuta'} {d.numero}</div>
            <div className={ui.cellMut}>
              {d.serie ? `série ${d.serie} · ` : ''}
              {d.tipo === 'minuta' ? (d.nfseNumero ? `NFS-e ${d.nfseNumero}` : 'sem NFS-e') : dataBR(d.emissao)}
            </div>
          </div>
        </div>
      ),
    },
    {
      header: 'Empresa',
      largura: LARGURA.media,
      valor: (d) => (d.empresaId ? nomeEmpresa(d.empresaId) : d.emitenteCnpj),
      cell: (d) =>
        d.empresaId ? (
          <span className={ui.cellMut}>{nomeEmpresa(d.empresaId)}</span>
        ) : (
          <span className={s.alertaCelula} title="O CNPJ do emitente não está em Cadastros › Empresas">
            <AlertTriangle size={13} /> {d.emitenteCnpj ? formatCpfCnpj(d.emitenteCnpj) : d.emitenteNome || 'sem CNPJ'}
          </span>
        ),
    },
    {
      header: 'Tomador (cliente)',
      valor: (d) => d.tomadorNome,
      cell: (d) => (
        <div>
          <div className={ui.cellStrong}>{d.tomadorNome || '—'}</div>
          {d.clienteId ? (
            <div className={ui.cellMut}>{formatCpfCnpj(d.tomadorDocumento)}</div>
          ) : (
            <Link className={s.alertaCelula} to={`/cadastros/clientes?novo=${encodeURIComponent(d.tomadorNome)}`} title="A SIIMP não devolveu o CNPJ deste tomador: cadastre o cliente para faturar">
              <UserPlus size={13} /> {d.tomadorDocumento ? `${formatCpfCnpj(d.tomadorDocumento)} não cadastrado no ELROND` : 'não cadastrado no ELROND'}
            </Link>
          )}
        </div>
      ),
    },
    { header: 'Trecho / observação', largura: LARGURA.longa, valor: (d) => d.descricao, cell: (d) => <span className={ui.cellMut}>{d.descricao || '—'}</span> },
    { header: 'Valor', className: ui.right, largura: LARGURA.valor, valor: (d) => d.valor, cell: (d) => <span className={ui.cellStrong}>{formatBRL(d.valor)}</span> },
    {
      header: 'Situação',
      largura: LARGURA.media,
      valor: (d) => ROTULO_PENDENTE[d.situacao],
      cell: (d) => (
        <div>
          <span className={`${ui.badge} ${TOM[d.situacao]}`}>{ROTULO_PENDENTE[d.situacao]}</span>
          {d.motivo && <div className={d.situacao === 'faturado-elrond' ? s.alertaCelula : ui.cellMut}>{d.motivo}</div>}
        </div>
      ),
    },
  ]

  return (
    <>
      <div className={s.painel}>
        <div className={s.pendTopo}>
          <div>
            <span className={s.totRotulo}>Fretes sem fatura · criados de {dataBR(de)} a {dataBR(ate)}</span>
            <span className={s.totSub}>
              {aFaturar.length} documento(s) sem fatura · {conta('faturado-siimp').length} já na SIIMP · {conta('faturado-elrond').length} no ELROND
              {conta('incompleto').length > 0 && ` · ${conta('incompleto').length} incompleto(s)`}
            </span>
          </div>
          <div className={s.pendAcao}>
            <div className={s.topoAcoes}>
              <label className={s.periodo}>
                De
                <input type="date" value={de} onChange={(e) => setPeriodo({ de: e.target.value, ate })} disabled={rodando} />
              </label>
              <label className={s.periodo}>
                Até
                <input type="date" value={ate} min={de} onChange={(e) => setPeriodo({ de, ate: e.target.value })} disabled={rodando} />
              </label>
            <button type="button" className={`${ui.btn} ${ui.btnPrimary}`} onClick={consultar} disabled={rodando || !!periodoErro} title={periodoErro || 'Lê na SIIMP os CT-es e as minutas do período'}>
              {rodando ? <Loader2 className={s.girando} /> : <CloudDownload />} {rodando ? 'Consultando...' : 'Consultar SIIMP'}
            </button>
            </div>
            <span className={periodoErro ? s.alertaCelula : ui.cellMut}>
              {periodoErro
                ? periodoErro
                : rodando
                ? `${consulta?.etapa}${consulta && consulta.total > 0 ? ` (${consulta.feito} de ${consulta.total})` : ''} · a SIIMP aceita 60 consultas por minuto`
                : consulta?.erro
                  ? `Última consulta falhou: ${consulta.erro}`
                  : ultima
                    ? `Consultado em ${horaBR(ultima.terminadaEm)} por ${ultima.por}${ultima.resumo?.clientesCriados ? ` · ${ultima.resumo.clientesCriados} cliente(s) cadastrado(s) com os dados da SIIMP` : ''}`
                    : (data ?? []).length === 0
                      ? 'Ainda não consultado neste mês.'
                      : `Lido da SIIMP em ${horaBR((data ?? [])[0]?.lidoEm ?? '')}`}
            </span>
          </div>
        </div>
        {rodando && (
          <div className={`${s.progresso} ${consulta && consulta.total > 0 ? '' : s.progressoIndef}`} role="progressbar" aria-label={consulta?.etapa}
            aria-valuenow={consulta && consulta.total > 0 ? Math.round((consulta.feito / consulta.total) * 100) : undefined}>
            <i style={{ width: `${consulta && consulta.total > 0 ? (consulta.feito / consulta.total) * 100 : 35}%` }} />
          </div>
        )}
      </div>

      <div className={s.abas} role="tablist" aria-label="Documentos ou faturas">
        <button type="button" role="tab" aria-selected={aba === 'documentos'} className={aba === 'documentos' ? s.abaOn : ''} onClick={() => setAba('documentos')}>
          Documentos da SIIMP <small>{aFaturar.length} a faturar</small>
        </button>
        <button type="button" role="tab" aria-selected={aba === 'faturas'} className={aba === 'faturas' ? s.abaOn : ''} onClick={() => setAba('faturas')}>
          Faturas emitidas pelo ELROND <small>{qtdEmitidas}</small>
        </button>
      </div>

      {aba === 'faturas' ? (
        <FaturasEmitidas de={de} ate={ate} empresa={empresa} nomeEmpresa={nomeEmpresa} />
      ) : (
      <CrudList
        id="faturamento-pendentes"
        query={busca}
        onQuery={setBusca}
        searchPlaceholder="Buscar por número, tomador, CNPJ, trecho ou NFS-e..."
        columns={columns}
        rows={linhas}
        getKey={(d) => d.id}
        rotulo={['documento', 'documentos']}
        pageSize={15}
        empty={isLoading ? 'Carregando...' : (data ?? []).length === 0 ? 'Clique em "Consultar SIIMP" para trazer os CT-es e as minutas do período.' : 'Nenhum documento neste filtro.'}
        acoesLote={({ itens, limpar }) => (
          <button type="button" className={ui.selBtn} onClick={() => { if (abrirFaturar(itens)) limpar() }}>
            <Receipt size={14} /> Faturar ({itens.filter((d) => d.situacao === 'pendente').length})
          </button>
        )}
        filters={
          <select className={ui.filterSelect} value={filtro} onChange={(e) => setFiltro(e.target.value as Filtro)} aria-label="Situação">
            <option value="pendente">A faturar ({aFaturar.length})</option>
            <option value="todas">Todas as situações ({daEmpresa.length})</option>
            {(['faturado-siimp', 'faturado-elrond', 'incompleto', 'cancelado'] as SituacaoPendente[]).map((sit) => (
              <option key={sit} value={sit}>{ROTULO_PENDENTE[sit]} ({conta(sit).length})</option>
            ))}
          </select>
        }
      />
      )}

      {faturando && (
        <FaturarModal
          documentos={faturando}
          nomeEmpresa={nomeEmpresa}
          onClose={() => setFaturando(null)}
          onFaturado={() => {
            setFaturando(null)
            setAba('faturas')
            void qc.invalidateQueries({ queryKey: ['faturamento-pendente'] })
            void qc.invalidateQueries({ queryKey: ['faturas-clientes'] })
          }}
        />
      )}
    </>
  )
}

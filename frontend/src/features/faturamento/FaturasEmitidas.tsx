import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Ban, FileDown, Landmark, Mail } from 'lucide-react'
import ui from '@/features/common/ui.module.css'
import { CrudList } from '@/features/common/CrudList'
import type { Column } from '@/features/common/DataTable'
import { LARGURA, LARGURA_ICONE } from '@/features/common/grid'
import { avisar } from '@/features/common/dialogo/dialogo'
import { Modal } from '@/features/common/Modal'
import { Field } from '@/features/common/Field'
import { formatBRL } from '@/lib/format'
import { getErrorMessage } from '@/lib/api'
import { semAcento } from '@/lib/texto'
import { dataBR } from '@/features/contratos/regras'
import { abrirPdfFatura, cancelarFatura, emitirBoletoFatura, enviarFatura, useFaturasClientes, type FaturaClienteDto } from './faturasClientes'
import s from './faturamento.module.css'

interface Props {
  de: string
  ate: string
  empresa: string
  nomeEmpresa: (id: string) => string
}

const BOLETO: Record<string, { rotulo: string; tom: string }> = {
  pendente: { rotulo: 'Enviando ao banco', tom: ui.badgeInfo },
  processando: { rotulo: 'Em processamento', tom: ui.badgeInfo },
  'a-receber': { rotulo: 'A receber', tom: ui.badgeWarn },
  recebida: { rotulo: 'Pago', tom: ui.badgeOk },
  cancelada: { rotulo: 'Cancelado', tom: ui.badgeOff },
  expirada: { rotulo: 'Expirado', tom: ui.badgeOff },
  falha: { rotulo: 'Falhou', tom: ui.badgeErr },
  incerta: { rotulo: 'Sem confirmação', tom: ui.badgeErr },
}

const situacao = (f: FaturaClienteDto) =>
  f.fatura.situacao === 'cancelada' ? 'Cancelada' : f.pagoEm ? 'Recebida' : f.fatura.vencimento < new Date().toISOString().slice(0, 10) ? 'Vencida' : 'Em aberto'
const TOM_SITUACAO: Record<string, string> = { Cancelada: ui.badgeOff, Recebida: ui.badgeOk, Vencida: ui.badgeErr, 'Em aberto': ui.badgeWarn }
const horaBR = (iso: string) => (iso ? new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '')

/** Faturas emitidas pelo ELROND no período (pela data de emissão): PDF, e-mail, boleto e cancelamento. */
export function FaturasEmitidas({ de, ate, empresa, nomeEmpresa }: Props) {
  const qc = useQueryClient()
  const { data, isLoading, refetch } = useFaturasClientes(de, ate)
  const [busca, setBusca] = useState('')
  const [ocupado, setOcupado] = useState<string | null>(null)
  const [cancelando, setCancelando] = useState<FaturaClienteDto | null>(null)
  const [motivo, setMotivo] = useState('')

  const q = semAcento(busca.trim())
  const linhas = (data ?? [])
    .filter((f) => empresa === 'todas' || f.fatura.empresaId === empresa)
    .filter((f) => !q || semAcento(`${f.fatura.numero} ${f.fatura.cliente.nome} ${f.fatura.cliente.documento} ${f.fatura.documentos.map((x) => x.numero).join(' ')}`).includes(q))

  const executar = async (id: string, titulo: string, fn: () => Promise<string>) => {
    setOcupado(id)
    try {
      const mensagem = await fn()
      await qc.invalidateQueries({ queryKey: ['faturas-clientes'] })
      await qc.invalidateQueries({ queryKey: ['faturamento-pendente'] })
      void avisar({ titulo, mensagem })
    } catch (e) {
      void avisar({ titulo: 'Não foi possível concluir', mensagem: getErrorMessage(e) })
    } finally {
      setOcupado(null)
    }
  }

  const enviar = (f: FaturaClienteDto) =>
    executar(f.fatura.id, `Fatura ${f.fatura.numero} enviada`, async () => {
      const envios = await enviarFatura(f.fatura.id)
      return envios.map((e) => (e.erro ? `${e.para}: falhou (${e.erro})` : `${e.para}: ${e.anexos.join(', ')}`)).join('\n')
    })

  const boleto = (f: FaturaClienteDto) =>
    executar(f.fatura.id, `Boleto da fatura ${f.fatura.numero}`, async () => {
      await emitirBoletoFatura(f.fatura.id)
      return 'Boleto emitido. Agora é enviar a fatura por e-mail.'
    })

  const cancelar = async () => {
    if (!cancelando) return
    const f = cancelando
    setCancelando(null)
    await executar(f.fatura.id, `Fatura ${f.fatura.numero} cancelada`, async () => {
      await cancelarFatura(f.fatura.id, motivo)
      return 'Boleto e lançamento cancelados. Os documentos voltaram para a lista de fretes sem fatura.'
    })
  }

  const columns: Column<FaturaClienteDto>[] = [
    {
      header: 'Fatura',
      fixa: true,
      largura: LARGURA.curta,
      valor: (f) => f.fatura.numero,
      cell: (f) => (
        <div className={s.cliente}>
          <span className={s.numero}>{f.fatura.numero}</span>
          <small>{nomeEmpresa(f.fatura.empresaId)}</small>
        </div>
      ),
    },
    {
      header: 'Cliente',
      fixa: true,
      valor: (f) => f.fatura.cliente.nome,
      cell: (f) => (
        <div className={s.cliente}>
          <span className={ui.cellStrong}>{f.fatura.cliente.nome}</span>
          <small>
            {f.fatura.documentos.length} {f.fatura.tipo === 'cte' ? 'CT-e(s)' : 'minuta(s)'}: {f.fatura.documentos.slice(0, 4).map((x) => x.numero).join(', ')}
            {f.fatura.documentos.length > 4 ? '…' : ''}
          </small>
        </div>
      ),
    },
    { header: 'Emissão', largura: LARGURA.data, valor: (f) => dataBR(f.fatura.emissao), cell: (f) => <span className={ui.cellMut}>{dataBR(f.fatura.emissao)}</span> },
    { header: 'Vencimento', largura: LARGURA.data, valor: (f) => dataBR(f.fatura.vencimento), cell: (f) => <span className={situacao(f) === 'Vencida' ? s.atrasado : undefined}>{dataBR(f.fatura.vencimento)}</span> },
    { header: 'Total', className: ui.right, largura: LARGURA.valor, valor: (f) => f.fatura.total, cell: (f) => <span className={ui.cellStrong}>{formatBRL(f.fatura.total)}</span> },
    {
      header: 'Situação',
      largura: LARGURA.media,
      valor: (f) => situacao(f),
      cell: (f) => (
        <div className={s.docs}>
          <span className={`${ui.badge} ${TOM_SITUACAO[situacao(f)]}`}>{situacao(f)}</span>
          {f.pagoEm && <small>pago em {dataBR(f.pagoEm)} · {formatBRL(f.valorPago)}</small>}
          {f.fatura.situacao === 'cancelada' && <small title={f.fatura.motivoCancelamento}>{f.fatura.motivoCancelamento}</small>}
        </div>
      ),
    },
    {
      header: 'Boleto',
      largura: LARGURA.media,
      valor: (f) => BOLETO[f.boletoSituacao]?.rotulo ?? 'Sem boleto',
      cell: (f) => (
        <div className={s.docs}>
          <span className={`${ui.badge} ${BOLETO[f.boletoSituacao]?.tom ?? ui.badgeOff}`}>{BOLETO[f.boletoSituacao]?.rotulo ?? 'Sem boleto'}</span>
          {f.boletoMensagem && f.boletoSituacao !== 'a-receber' && <small title={f.boletoMensagem}>{f.boletoMensagem}</small>}
        </div>
      ),
    },
    {
      header: 'E-mail',
      largura: LARGURA.media,
      valor: (f) => (f.ultimoEnvio ? horaBR(f.ultimoEnvio) : 'Não enviado'),
      cell: (f) =>
        f.ultimoEnvio ? (
          <span className={f.ultimoEnvioOk ? ui.cellMut : s.alertaCelula} title={f.fatura.envios.filter((e) => e.em === f.ultimoEnvio).map((e) => `${e.para}${e.erro ? `: ${e.erro}` : ''}`).join('\n')}>
            {f.ultimoEnvioOk ? 'Enviado' : 'Falhou'} {horaBR(f.ultimoEnvio)}
          </span>
        ) : (
          <span className={ui.cellMut}>Não enviado</span>
        ),
    },
    {
      header: 'Ações',
      fixa: true,
      largura: LARGURA.acoes + LARGURA_ICONE,
      className: ui.colActions,
      cell: (f) => {
        const ativa = f.fatura.situacao === 'emitida'
        const semBoleto = ativa && (!f.boletoSituacao || ['falha', 'cancelada', 'expirada'].includes(f.boletoSituacao)) && !f.pagoEm
        const travado = ocupado === f.fatura.id
        return (
          <>
            <button type="button" className={ui.iconBtn} title="Abrir o PDF da fatura" onClick={(e) => { e.stopPropagation(); void abrirPdfFatura(f.fatura.id).catch((err) => avisar({ titulo: 'Não foi possível abrir', mensagem: getErrorMessage(err) })) }}>
              <FileDown />
            </button>
            {ativa && !semBoleto && (
              <button type="button" className={ui.iconBtn} title="Enviar por e-mail aos contatos do cliente" disabled={travado} onClick={(e) => { e.stopPropagation(); void enviar(f) }}>
                <Mail />
              </button>
            )}
            {semBoleto && (
              <button type="button" className={ui.iconBtn} title="Emitir o boleto" disabled={travado} onClick={(e) => { e.stopPropagation(); void boleto(f) }}>
                <Landmark />
              </button>
            )}
            {ativa && !f.pagoEm && (
              <button type="button" className={`${ui.iconBtn} ${ui.danger}`} title="Cancelar a fatura" disabled={travado} onClick={(e) => { e.stopPropagation(); setMotivo(''); setCancelando(f) }}>
                <Ban />
              </button>
            )}
          </>
        )
      },
    },
  ]

  return (
    <>
      <CrudList
        id="faturas-clientes"
        query={busca}
        onQuery={setBusca}
        searchPlaceholder="Buscar por número, cliente, CNPJ ou documento..."
        columns={columns}
        rows={linhas}
        getKey={(f) => f.fatura.id}
        rotulo={['fatura', 'faturas']}
        pageSize={15}
        onAtualizar={() => refetch()}
        empty={isLoading ? 'Carregando...' : 'Nenhuma fatura emitida pelo ELROND neste período. Marque os documentos em "A faturar" e clique em Faturar.'}
      />
      <Modal
        open={!!cancelando}
        onClose={() => setCancelando(null)}
        title={`Cancelar a fatura ${cancelando?.fatura.numero ?? ''}`}
        subtitle="O boleto é cancelado no banco, o lançamento a receber é cancelado e os documentos voltam para a faturar. O número não é reaproveitado."
        icon={<Ban />}
        maxWidth={520}
        footer={
          <>
            <button type="button" className={`${ui.btn} ${ui.btnGhost}`} onClick={() => setCancelando(null)}>Voltar</button>
            <button type="button" className={`${ui.btn} ${ui.btnPrimary}`} disabled={!motivo.trim()} onClick={() => void cancelar()}>Cancelar a fatura</button>
          </>
        }
      >
        <Field label="Motivo" req>
          <textarea id="motivo-cancelar-fatura" rows={3} value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ex.: valor errado, documento faltando" />
        </Field>
      </Modal>
    </>
  )
}

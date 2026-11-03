import { useState } from 'react'
import { FileCheck2, HandCoins, Landmark, Send } from 'lucide-react'
import { Modal } from '@/features/common/Modal'
import ui from '@/features/common/ui.module.css'
import { formatBRL } from '@/lib/format'
import { dataBR, hojeISO } from '@/features/contratos/regras'
import type { FaturaCentral } from '@/features/contratos/faturas'
import type { DadosEtapa } from '@/features/contratos/api'
import { getErrorMessage } from '@/lib/api'
import type { NfseDaFatura } from './nfseFatura'
import s from './faturamento.module.css'

export type Registro = 'nf' | 'boleto' | 'recebimento'

const TEXTO: Record<Registro, { titulo: string; icone: typeof Landmark; botao: string }> = {
  nf: { titulo: 'Registrar a nota fiscal', icone: FileCheck2, botao: 'Registrar NF' },
  boleto: { titulo: 'Registrar o boleto', icone: Landmark, botao: 'Registrar boleto' },
  recebimento: { titulo: 'Registrar o recebimento', icone: HandCoins, botao: 'Marcar como recebida' },
}

/**
 * NF, boleto e recebimento, por enquanto REGISTRADOS à mão (o número que saiu na prefeitura, no
 * banco ou no extrato). Quando a emissão pela Central entrar, este é o passo que vira automático.
 */
interface Props {
  fatura: FaturaCentral
  etapa: Registro
  onClose: () => void
  onConfirmar: (dados: DadosEtapa) => Promise<void>
  /** Emissão da NFS-e pelo ELROND (só com a permissão "/fiscal/nfse"; sem ela, só o registro à mão). */
  onEmitirNfse?: () => Promise<NfseDaFatura>
  /** A NFS-e que a fatura já tem (em processamento, rejeitada...). */
  nfse?: NfseDaFatura
}

export function RegistroModal({ fatura: f, etapa, onClose, onConfirmar, onEmitirNfse, nfse }: Props) {
  const [emitindo, setEmitindo] = useState(false)
  const [resultado, setResultado] = useState<NfseDaFatura | null>(null)
  const [erroNfse, setErroNfse] = useState<string | null>(null)
  const nota = (resultado ?? nfse)?.nota ?? null
  const emAndamento = !!nota?.emAndamento
  const emitir = async () => {
    if (!onEmitirNfse) return
    setEmitindo(true)
    setErroNfse(null)
    try {
      const r = await onEmitirNfse()
      setResultado(r)
      if (r.nota?.situacao === 'Emitida') onClose()
    } catch (e) {
      setErroNfse(getErrorMessage(e))
    } finally {
      setEmitindo(false)
    }
  }
  const [numero, setNumero] = useState('')
  const [data, setData] = useState(hojeISO())
  const [enviando, setEnviando] = useState(false)
  // Contrato sem nota fiscal (locação, reembolso): o passo é emitir só a fatura, e o número é opcional.
  const semNota = etapa === 'nf' && f.semNotaFiscal
  const t = semNota ? { titulo: 'Emitir a fatura (sem nota fiscal)', icone: TEXTO.nf.icone, botao: 'Emitir a fatura' } : TEXTO[etapa]
  const ctePronto = etapa === 'nf' && f.documentoDaOperacao
  const valido = etapa === 'recebimento' ? !!data && data <= hojeISO() : etapa === 'nf' ? semNota || ctePronto || !!numero.trim() : true

  const confirmar = async () => {
    setEnviando(true)
    try {
      await onConfirmar(etapa === 'recebimento' ? { data } : { numero: numero.trim() })
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={t.titulo}
      subtitle={`${f.numero} · ${f.clienteNome} · ${f.referencia} · ${formatBRL(f.total)}`}
      icon={<t.icone />}
      maxWidth={520}
      maximizavel={false}
      busy={enviando}
      footer={
        <>
          <button type="button" className={`${ui.btn} ${ui.btnGhost}`} onClick={onClose}>Cancelar</button>
          <button type="button" className={`${ui.btn} ${ui.btnPrimary}`} disabled={!valido || enviando} onClick={() => void confirmar()}>{t.botao}</button>
        </>
      }
    >
      {semNota && (
        <>
          <p className={s.confNota}>O contrato {f.numero} fatura sem nota fiscal (condições do contrato). Emitida, a fatura trava (não recalcula mais) e os extras dela ficam faturados.</p>
          <label className={s.campoModal}>
            Referência (opcional)
            <input autoFocus value={numero} onChange={(e) => setNumero(e.target.value)} placeholder="Ex.: fatura de locação 11/2026" />
          </label>
        </>
      )}
      {etapa === 'nf' && !semNota && !ctePronto && onEmitirNfse && (
        <div className={s.emitirNfse}>
          <div>
            <b>Emitir a NFS-e pelo ELROND</b>
            <span>
              Com o serviço do contrato ({f.servicoNome || 'sem serviço'}), os impostos da empresa e o endereço do cliente. Emitida, a NF entra na fatura sozinha.
            </span>
            {nota && (
              <span className={nota.situacao === 'Rejeitada' ? s.alertaCelula : s.nfseSituacao}>
                {nota.situacao === 'Rejeitada'
                  ? `Rejeitada: ${nota.mensagem}`
                  : emAndamento
                    ? 'Enviada à prefeitura: a Central atualiza sozinha quando ela responder.'
                    : `NFS-e ${nota.numero || ''} ${nota.situacao.toLowerCase()}`}
                {nota.ambiente && nota.ambiente !== 'Production' ? ` · ambiente de teste (${nota.ambiente})` : ''}
              </span>
            )}
            {erroNfse && <span className={s.alertaCelula}>{erroNfse}</span>}
          </div>
          <button type="button" className={`${ui.btn} ${ui.btnPrimary}`} disabled={emitindo || emAndamento} onClick={() => void emitir()}>
            <Send /> {emitindo ? 'Enviando...' : nota?.situacao === 'Rejeitada' ? 'Emitir de novo' : 'Emitir NFS-e'}
          </button>
        </div>
      )}
      {etapa === 'nf' && !semNota && (
        <>
          {!ctePronto && onEmitirNfse && <p className={s.ouManual}>ou registre o número de uma nota emitida fora do ELROND:</p>}
          <p className={s.confNota}>
            {ctePronto
              ? 'Frete com CT-e: o documento fiscal já saiu na viagem. Deixe em branco para usar os CT-es da fatura, ou informe outro número.'
              : `Informe o número da NFS-e de ${f.servicoNome} emitida para este valor. Com a nota registrada a fatura trava (não recalcula mais) e os extras dela ficam faturados.`}
          </p>
          <label className={s.campoModal}>
            {ctePronto ? 'Documento (opcional)' : 'Número da NF'}
            <input autoFocus value={numero} onChange={(e) => setNumero(e.target.value)} placeholder={ctePronto ? f.documentos.map((d) => `CT-e ${d.numero}`).join(', ') : 'Ex.: 1171'} />
          </label>
        </>
      )}
      {etapa === 'boleto' && (
        <>
          <p className={s.confNota}>Boleto de {formatBRL(f.total)} com vencimento em {dataBR(f.vencimento)}, pela {f.carteiraNome}. Informe o nosso número ou a referência, se tiver.</p>
          <label className={s.campoModal}>
            Nosso número / referência (opcional)
            <input autoFocus value={numero} onChange={(e) => setNumero(e.target.value)} />
          </label>
        </>
      )}
      {etapa === 'recebimento' && (
        <>
          <p className={s.confNota}>Quando o dinheiro entrou. A baixa no extrato e em Entradas e Saídas entra quando o boleto passar a sair por aqui.</p>
          <label className={s.campoModal}>
            Recebida em
            <input type="date" value={data} max={hojeISO()} onChange={(e) => setData(e.target.value)} />
          </label>
        </>
      )}
    </Modal>
  )
}

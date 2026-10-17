import { AlertTriangle, Info, Repeat, Zap } from 'lucide-react'
import { ROTULO_SITUACAO_FATURA, type Alerta } from './regras'
import type { Modalidade, SituacaoContrato, SituacaoFatura } from './types'
import s from './contratos.module.css'

export function BadgeModalidade({ modalidade }: { modalidade: Modalidade }) {
  return modalidade === 'spot' ? (
    <span className={`${s.badge} ${s.badgeSpot}`}><Zap size={12} /> Spot</span>
  ) : (
    <span className={`${s.badge} ${s.badgeRecorrente}`}><Repeat size={12} /> Recorrente</span>
  )
}

const SITUACAO: Record<SituacaoContrato, { rotulo: string; cls: string }> = {
  vigente: { rotulo: 'Vigente', cls: s.stVigente },
  suspenso: { rotulo: 'Suspenso', cls: s.stSuspenso },
  encerrado: { rotulo: 'Encerrado', cls: s.stEncerrado },
  'a-faturar': { rotulo: 'A faturar', cls: s.stAFaturar },
  faturado: { rotulo: 'Faturado', cls: s.stEncerrado },
}

export function BadgeSituacao({ situacao }: { situacao: SituacaoContrato }) {
  const x = SITUACAO[situacao]
  return <span className={`${s.badge} ${x.cls}`}>{x.rotulo}</span>
}

const FATURA_CLS: Record<SituacaoFatura, string> = {
  prevista: s.fPrevista,
  'a-conferir': s.fConferir,
  conferida: s.fConferida,
  'nf-emitida': s.fEmitida,
  'boleto-emitido': s.fEmitida,
  recebida: s.fRecebida,
  atrasada: s.fAtrasada,
  devolvida: s.fDevolvida,
  cancelada: s.badgeNeutro,
}

export function BadgeFatura({ situacao }: { situacao: SituacaoFatura }) {
  return <span className={`${s.badge} ${FATURA_CLS[situacao]}`}>{ROTULO_SITUACAO_FATURA[situacao]}</span>
}

/** Alertas como etiquetas; com `max`, mostra os primeiros e "+n". */
export function Alertas({ alertas, max }: { alertas: Alerta[]; max?: number }) {
  if (alertas.length === 0) return <span className={s.mut}>—</span>
  const vis = max ? alertas.slice(0, max) : alertas
  return (
    <span className={s.alertas}>
      {vis.map((a) => (
        <span key={a.texto} className={`${s.alerta} ${s[`alerta_${a.tom}`]}`}>
          {a.tom === 'info' ? <Info size={11} /> : <AlertTriangle size={11} />} {a.texto}
        </span>
      ))}
      {max && alertas.length > max && <span className={s.mais}>+{alertas.length - max}</span>}
    </span>
  )
}

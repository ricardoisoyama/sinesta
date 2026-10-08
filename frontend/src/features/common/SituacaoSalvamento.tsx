import { AlertTriangle, Check, Loader2, PencilLine } from 'lucide-react'
import type { SituacaoSalvamento as Situacao } from './useSalvamentoAutomatico'
import s from './planilha.module.css'

/** Selo "Salvo / Salvando… / Erro" das telas que gravam sozinhas. */
export function SituacaoSalvamento({ situacao, erro, onTentar }: { situacao: Situacao; erro?: string; onTentar?: () => void }) {
  if (situacao === 'erro')
    return (
      <span className={`${s.salvo} ${s.salvoErro}`} title={erro}>
        <AlertTriangle /> Não salvou{erro ? `: ${erro}` : ''}
        {onTentar && (
          <button type="button" onClick={onTentar}>Tentar de novo</button>
        )}
      </span>
    )
  if (situacao === 'salvando')
    return <span className={s.salvo}><Loader2 className={s.gira} /> Salvando…</span>
  if (situacao === 'pendente')
    return <span className={s.salvo}><PencilLine /> Alterações não salvas</span>
  return <span className={`${s.salvo} ${s.salvoOk}`}><Check /> Tudo salvo</span>
}

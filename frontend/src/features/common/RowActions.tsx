import { Pencil, Trash2, RotateCcw, Lock } from 'lucide-react'
import ui from './ui.module.css'

interface Props {
  status: string
  onEdit: () => void
  onSetStatus: (next: 'ativo' | 'inativo') => void
  /** false trava editar e inativar (ex.: registro já usado em proposta). */
  podeEditar?: boolean
  /** Explicação mostrada no lugar do botão bloqueado. */
  motivoBloqueio?: string
}

/** Ações da linha: Editar + Inativar (lixeira) / Reativar (para registros inativos). Não exclui. */
export function RowActions({ status, onEdit, onSetStatus, podeEditar = true, motivoBloqueio }: Props) {
  return (
    <>
      {podeEditar ? (
        <button className={ui.iconBtn} onClick={onEdit} title="Editar"><Pencil /></button>
      ) : (
        <button className={ui.iconBtn} disabled title={motivoBloqueio ?? 'Registro em uso, só pode ser inativado'}>
          <Lock />
        </button>
      )}
      {status === 'inativo' ? (
        <button className={ui.iconBtn} onClick={() => onSetStatus('ativo')} title="Reativar">
          <RotateCcw />
        </button>
      ) : (
        <button
          className={`${ui.iconBtn} ${ui.danger}`}
          onClick={() => { if (window.confirm('Inativar este registro?')) onSetStatus('inativo') }}
          title="Inativar"
        >
          <Trash2 />
        </button>
      )}
    </>
  )
}

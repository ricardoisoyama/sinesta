import { useState } from 'react'
import { ArrowRightLeft } from 'lucide-react'
import { Modal } from '@/features/common/Modal'
import { Field } from '@/features/common/Field'
import ui from '@/features/common/ui.module.css'
import type { Vendedor } from './types'

interface Props {
  open: boolean
  /** Vendedor de origem. */
  de: Vendedor | null
  vendedores: Vendedor[]
  busy?: boolean
  error?: string | null
  onClose: () => void
  onConfirmar: (paraId: string) => void
}

/** Passa todos os clientes (SDR, Sales e CS) de um vendedor para outro. */
export function TransferirCarteiraModal({ open, de, vendedores, busy, error, onClose, onConfirmar }: Props) {
  const [paraId, setParaId] = useState('')
  const [abriuEm, setAbriuEm] = useState(open)
  if (open !== abriuEm) {
    setAbriuEm(open)
    if (open) setParaId('')
  }
  const destinos = vendedores.filter((v) => v.id !== de?.id && v.status === 'ativo')

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Transferir carteira"
      subtitle={de ? `De: ${de.nome}` : ''}
      icon={<ArrowRightLeft />}
      maxWidth={520}
      maximizavel={false}
      error={error}
      busy={busy}
      footer={
        <>
          <button type="button" className={`${ui.btn} ${ui.btnGhost}`} onClick={onClose}>
            Cancelar
          </button>
          <button
            type="button"
            className={`${ui.btn} ${ui.btnPrimary}`}
            disabled={!paraId}
            onClick={() => onConfirmar(paraId)}
          >
            {busy ? 'Transferindo...' : 'Transferir'}
          </button>
        </>
      }
    >
      <section className={ui.fsection}>
        <Field label="Para o vendedor" req hint="Todos os clientes em que a origem é SDR, Sales ou CS passam para o destino.">
          <select value={paraId} onChange={(e) => setParaId(e.target.value)}>
            <option value="">Selecione</option>
            {destinos.map((v) => (
              <option key={v.id} value={v.id}>
                {v.nome}
              </option>
            ))}
          </select>
        </Field>
        {destinos.length === 0 && <div className={ui.modalNote}>Não há outro vendedor ativo para receber a carteira.</div>}
      </section>
    </Modal>
  )
}

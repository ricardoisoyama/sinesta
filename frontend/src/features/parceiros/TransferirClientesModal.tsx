import { useState } from 'react'
import { ArrowRightLeft } from 'lucide-react'
import { Modal } from '@/features/common/Modal'
import { Field } from '@/features/common/Field'
import ui from '@/features/common/ui.module.css'
import type { TransferenciaClientes } from '@/features/cadastros/api'
import type { Vendedor } from './types'

interface Props {
  open: boolean
  /** Quantos clientes serão movidos. */
  quantidade: number
  vendedores: Vendedor[]
  busy?: boolean
  error?: string | null
  onClose: () => void
  onConfirmar: (destino: TransferenciaClientes) => void
}

const MANTER = ''

/**
 * Move os clientes selecionados na lista para vendedores, função a função (igual ao cadastro:
 * SDR, Sales e CS podem ser pessoas diferentes). Função deixada em "Manter" não muda.
 */
export function TransferirClientesModal({ open, quantidade, vendedores, busy, error, onClose, onConfirmar }: Props) {
  const [sdr, setSdr] = useState(MANTER)
  const [sales, setSales] = useState(MANTER)
  const [cs, setCs] = useState(MANTER)
  const [abriuEm, setAbriuEm] = useState(open)
  if (open !== abriuEm) {
    setAbriuEm(open)
    if (open) {
      setSdr(MANTER)
      setSales(MANTER)
      setCs(MANTER)
    }
  }
  const destinos = vendedores.filter((v) => v.status === 'ativo')
  const algum = !!(sdr || sales || cs)

  const combo = (valor: string, set: (v: string) => void, rotulo: string) => (
    <Field label={rotulo}>
      <select value={valor} onChange={(e) => set(e.target.value)}>
        <option value={MANTER}>Manter como está</option>
        {destinos.map((v) => (
          <option key={v.id} value={v.id}>
            {v.nome}
          </option>
        ))}
      </select>
    </Field>
  )

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Transferir clientes para vendedores"
      subtitle={`${quantidade} cliente${quantidade === 1 ? '' : 's'} selecionado${quantidade === 1 ? '' : 's'}`}
      icon={<ArrowRightLeft />}
      maxWidth={640}
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
            disabled={!algum}
            onClick={() => onConfirmar({ vendedorSdrId: sdr, vendedorSalesId: sales, vendedorCsId: cs })}
          >
            {busy ? 'Transferindo...' : 'Transferir'}
          </button>
        </>
      }
    >
      <section className={ui.fsection}>
        <div className={ui.fsectionTitle}>
          Vendedores <span className={ui.fsectionHint}>escolha só as funções que quer trocar; a mesma pessoa pode ocupar as três</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
          {combo(sdr, setSdr, 'SDR (pré-venda)')}
          {combo(sales, setSales, 'Sales (fechamento)')}
          {combo(cs, setCs, 'CS (pós-venda)')}
        </div>
        {destinos.length === 0 && <div className={ui.modalNote}>Não há vendedor ativo para receber os clientes.</div>}
      </section>
    </Modal>
  )
}

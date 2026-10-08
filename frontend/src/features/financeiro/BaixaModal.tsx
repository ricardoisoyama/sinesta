import { useState } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { Modal } from '@/features/common/Modal'
import { Field } from '@/features/common/Field'
import { MoneyInput } from '@/features/common/MoneyInput'
import ui from '@/features/common/ui.module.css'
import { formatBRL } from '@/lib/format'
import { hojeISO, liquidoDe, sinal } from './calculos'
import { carteiraDaEmpresa, type Carteira, type Movimento } from './types'
import type { Baixa } from './store'
import s from './financeiro.module.css'

interface Props {
  open: boolean
  /** Um movimento (baixa simples, com juros/multa/desconto) ou vários (baixa em lote). */
  movimentos: Movimento[]
  carteiras: Carteira[]
  onClose: () => void
  onConfirmar: (b: Baixa) => Promise<void> | void
}

/** Liquidação: informa quando e por qual carteira; ajustes só quando é um movimento. */
export function BaixaModal({ open, movimentos, carteiras, onClose, onConfirmar }: Props) {
  const [pagoEm, setPagoEm] = useState(hojeISO())
  const [carteiraId, setCarteiraId] = useState('')
  const [desconto, setDesconto] = useState(0)
  const [juros, setJuros] = useState(0)
  const [multa, setMulta] = useState(0)
  const [abriuEm, setAbriuEm] = useState(open)
  if (open !== abriuEm) {
    setAbriuEm(open)
    if (open) {
      setPagoEm(hojeISO())
      setCarteiraId(movimentos.length === 1 ? movimentos[0].carteiraId : '')
      setDesconto(movimentos.length === 1 ? movimentos[0].desconto : 0)
      setJuros(movimentos.length === 1 ? movimentos[0].juros : 0)
      setMulta(movimentos.length === 1 ? movimentos[0].multa : 0)
    }
  }
  const um = movimentos.length === 1 ? movimentos[0] : null
  const total = um ? Math.max(0, um.valor - desconto + juros + multa) : movimentos.reduce((a, m) => a + liquidoDe(m), 0)
  const efeito = movimentos.reduce((a, m) => a + sinal(m) * (um ? total : liquidoDe(m)), 0)

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={um ? 'Liquidar lançamento' : `Baixa em lote · ${movimentos.length} lançamentos`}
      subtitle={um ? `${um.parceiroNome} · ${um.descricao}` : 'Todos recebem a mesma data e carteira'}
      icon={<CheckCircle2 />}
      maxWidth={560}
      maximizavel={false}
      footer={
        <>
          <button type="button" className={`${ui.btn} ${ui.btnGhost}`} onClick={onClose}>
            Cancelar
          </button>
          <button type="button" className={`${ui.btn} ${ui.btnPrimary}`} disabled={!pagoEm} onClick={() => onConfirmar({ pagoEm, carteiraId, desconto: um ? desconto : undefined, juros: um ? juros : undefined, multa: um ? multa : undefined })}>
            Confirmar baixa
          </button>
        </>
      }
    >
      {!um && (
        <div className={s.baixaLista}>
          {movimentos.map((m) => (
            <div key={m.id}>
              <span>
                <i className={`${s.tipoDot} ${s[m.tipo]}`} />
                {m.parceiroNome} · {m.descricao}
              </span>
              <span className={`${s.valor} ${s[m.tipo]}`}>{formatBRL(liquidoDe(m))}</span>
            </div>
          ))}
        </div>
      )}
      <section className={ui.fsection}>
        <div className={ui.grid}>
          <Field className={ui.col2} label="Data do pagamento" req>
            <input type="date" value={pagoEm} onChange={(e) => setPagoEm(e.target.value)} />
          </Field>
          <Field className={ui.col2} label="Carteira" hint={um ? undefined : 'Em branco = mantém a carteira de cada movimento.'}>
            <select value={carteiraId} onChange={(e) => setCarteiraId(e.target.value)}>
              <option value="">{um ? 'Selecione' : 'Manter a de cada um'}</option>
              {/* Só as contas que servem a todos os lançamentos escolhidos (cada CNPJ tem as suas). */}
              {carteiras.filter((c) => c.status === 'ativo' && movimentos.every((m) => carteiraDaEmpresa(c, m.empresaId))).map((c) => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </select>
          </Field>
          {um && (
            <>
              <Field label="Valor">
                <input value={formatBRL(um.valor)} readOnly />
              </Field>
              <Field label="Desconto (R$)">
                <MoneyInput value={desconto} onChange={setDesconto} />
              </Field>
              <Field label="Juros (R$)">
                <MoneyInput value={juros} onChange={setJuros} />
              </Field>
              <Field label="Multa (R$)">
                <MoneyInput value={multa} onChange={setMulta} />
              </Field>
            </>
          )}
        </div>
        <div className={s.baixaTotal}>
          <span>{efeito >= 0 ? 'Entra no caixa' : 'Sai do caixa'}</span>
          <b>{formatBRL(Math.abs(efeito))}</b>
        </div>
      </section>
    </Modal>
  )
}

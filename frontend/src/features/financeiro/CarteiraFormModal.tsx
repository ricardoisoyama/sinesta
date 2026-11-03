import { useState } from 'react'
import { Landmark } from 'lucide-react'
import { Modal } from '@/features/common/Modal'
import { Field } from '@/features/common/Field'
import { MoneyInput } from '@/features/common/MoneyInput'
import ui from '@/features/common/ui.module.css'
import { getErrorMessage } from '@/lib/api'
import { useEmpresasQuery } from '@/features/cadastros/hooks'
import { empresaPadrao } from '@/features/unidades/types'
import { hojeISO } from './calculos'
import type { Carteira } from './types'

interface Props {
  open: boolean
  /** Editando uma carteira existente; null = nova. */
  initial: Carteira | null
  onClose: () => void
  onSave: (c: Carteira) => Promise<unknown>
  /** Aberto pelo cadastro da empresa: a conta é dela (sem escolher). */
  empresaFixa?: string
}

const CORES = ['#2563eb', '#16a34a', '#d97706', '#9333ea', '#dc2626', '#0891b2', '#475569']

const vazia = (): Carteira => ({
  id: '',
  nome: '',
  tipo: 'banco',
  banco: '',
  agencia: '',
  conta: '',
  saldoInicial: 0,
  saldoInicialEm: hojeISO(),
  cor: CORES[0],
  status: 'ativo',
})

/** Conta bancária, caixa, cartão ou investimento (aplicação: entra e sai por transferência; rendimento é entrada). */
export function CarteiraFormModal({ open, initial, onClose, onSave, empresaFixa }: Props) {
  const [d, setD] = useState<Carteira>(vazia())
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [abriuEm, setAbriuEm] = useState(open)
  if (open !== abriuEm) {
    setAbriuEm(open)
    if (open) {
      setD(initial ?? vazia())
      setErro('')
    }
  }
  const set = (p: Partial<Carteira>) => setD((x) => ({ ...x, ...p }))
  const { data: empresasData } = useEmpresasQuery()
  const empresas = (empresasData ?? []).filter((e) => e.status === 'ativo' || e.id === d.empresaId)
  // Carteira nova já vem na empresa padrão (cada CNPJ tem as suas contas).
  const empresaId = empresaFixa || (d.empresaId ?? (d.id ? '' : (empresaPadrao(empresas)?.id ?? '')))

  const submit = async () => {
    if (!d.nome.trim()) return setErro('Dê um nome à conta.')
    // Carteira nova precisa de empresa; a antiga (compartilhada) pode continuar assim até alguém escolher.
    if (!empresaId && !d.id && empresas.length > 1) return setErro('Escolha a empresa dona da conta.')
    setSalvando(true)
    try {
      await onSave({ ...d, nome: d.nome.trim(), empresaId })
      onClose()
    } catch (err) {
      setErro(getErrorMessage(err))
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initial?.id ? 'Editar conta' : 'Nova conta'}
      subtitle="Conta bancária, caixa, cartão ou investimento"
      icon={<Landmark />}
      maxWidth={620}
      maximizavel={false}
      busy={salvando}
      footer={
        <>
          <button type="button" className={`${ui.btn} ${ui.btnGhost}`} onClick={onClose}>Cancelar</button>
          <button type="button" className={`${ui.btn} ${ui.btnPrimary}`} onClick={submit}>Salvar</button>
        </>
      }
    >
      <section className={ui.fsection}>
        <div className={ui.grid}>
          <Field className={ui.col2} label="Nome" req error={erro}>
            <input value={d.nome} onChange={(e) => set({ nome: e.target.value })} placeholder="Ex.: Itaú PJ" autoFocus />
          </Field>
          {!empresaFixa && (
          <Field className={ui.col2} label="Empresa" req hint="CNPJ dono da conta. Lançamentos de outra empresa não entram nesta carteira.">
            <select value={empresaId} onChange={(e) => set({ empresaId: e.target.value })}>
              <option value="">{d.id && !d.empresaId ? 'Todas (carteira antiga)' : 'Selecione'}</option>
              {empresas.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nome}{e.cnpj ? ` · ${e.cnpj}` : ''}
                </option>
              ))}
            </select>
          </Field>
          )}
          <Field className={ui.col2} label="Tipo">
            <select value={d.tipo} onChange={(e) => set({ tipo: e.target.value as Carteira['tipo'] })}>
              <option value="banco">Banco</option>
              <option value="caixa">Caixa</option>
              <option value="cartao">Cartão</option>
              <option value="investimento">Investimento</option>
            </select>
          </Field>
          {(d.tipo === 'banco' || d.tipo === 'investimento') && (
            <>
              <Field className={ui.col2} label="Banco">
                <input value={d.banco} onChange={(e) => set({ banco: e.target.value })} placeholder="Ex.: 341 · Itaú" />
              </Field>
              <Field label="Agência">
                <input value={d.agencia} onChange={(e) => set({ agencia: e.target.value })} />
              </Field>
              <Field label="Conta">
                <input value={d.conta} onChange={(e) => set({ conta: e.target.value })} />
              </Field>
            </>
          )}
          <Field className={ui.col2} label="Saldo inicial (R$)" hint="Saldo no dia em que a carteira começa a ser controlada aqui.">
            <MoneyInput value={d.saldoInicial} onChange={(n) => set({ saldoInicial: n })} />
          </Field>
          <Field className={ui.col2} label="Saldo em">
            <input type="date" value={d.saldoInicialEm} onChange={(e) => set({ saldoInicialEm: e.target.value })} />
          </Field>
          <Field className={ui.col2} label="Cor">
            <div style={{ display: 'flex', gap: 6 }}>
              {CORES.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-label={`Cor ${c}`}
                  onClick={() => set({ cor: c })}
                  style={{ width: 24, height: 24, borderRadius: '50%', background: c, border: d.cor === c ? '2px solid var(--text, #111)' : '2px solid transparent', cursor: 'pointer' }}
                />
              ))}
            </div>
          </Field>
          <Field label="Situação">
            <select value={d.status} onChange={(e) => set({ status: e.target.value as Carteira['status'] })}>
              <option value="ativo">Ativa</option>
              <option value="inativo">Inativa</option>
            </select>
          </Field>
        </div>
      </section>
    </Modal>
  )
}

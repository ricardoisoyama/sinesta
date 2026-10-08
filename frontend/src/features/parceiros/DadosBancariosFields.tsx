import { Field } from '@/features/common/Field'
import { BancoAutocomplete } from '@/features/common/BancoAutocomplete'
import ui from '@/features/common/ui.module.css'
import { formatAgencia, formatContaBancaria } from '@/lib/format'
import type { DadosBancarios, TipoConta } from './types'

interface Props {
  value: DadosBancarios
  onChange: (v: DadosBancarios) => void
  /** Conta no exterior (fornecedor estrangeiro): SWIFT, IBAN e roteamento no lugar de agência e Pix. */
  internacional?: boolean
}

/** Bloco de dados bancários, igual em Empresa, Cliente, Fornecedor e Vendedor. */
export function DadosBancariosFields({ value, onChange, internacional }: Props) {
  const set = (patch: Partial<DadosBancarios>) => onChange({ ...value, ...patch })
  if (internacional)
    return (
      <div className={ui.grid}>
        <div className={`${ui.col4} ${ui.modalNote}`}>
          Conta no exterior, para pagamento por transferência internacional (wire transfer). Os dados vêm na invoice do fornecedor.
        </div>
        <Field className={ui.col2} label="Titular da conta (beneficiary)">
          <input value={value.beneficiario ?? ''} onChange={(e) => set({ beneficiario: e.target.value })} placeholder="Ex.: Anthropic, PBC" />
        </Field>
        <Field className={ui.col2} label="Banco">
          <input value={value.banco} onChange={(e) => set({ banco: e.target.value })} placeholder="Ex.: JPMorgan Chase Bank" />
        </Field>
        <Field className={ui.col2} label="SWIFT / BIC" hint="Código do banco: 8 ou 11 letras e números (ex.: CHASUS33).">
          <input
            value={value.swift ?? ''}
            onChange={(e) => set({ swift: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 11) })}
            placeholder="CHASUS33"
          />
        </Field>
        <Field className={ui.col2} label="IBAN ou número da conta" hint="Europa usa IBAN; EUA e outros, o número da conta.">
          <input
            value={value.iban ?? ''}
            onChange={(e) => set({ iban: e.target.value.toUpperCase().replace(/[^A-Z0-9 ]/g, '').slice(0, 40) })}
            placeholder="Ex.: GB33 BUKB 2020 1555 5555 55"
          />
        </Field>
        <Field className={ui.col2} label="Código de roteamento" hint="ABA / routing number (EUA), Sort code (Reino Unido), BSB (Austrália). Deixe em branco se não houver.">
          <input value={value.roteamento ?? ''} onChange={(e) => set({ roteamento: e.target.value.replace(/[^\dA-Za-z-]/g, '').slice(0, 20) })} placeholder="Ex.: 021000021" />
        </Field>
      </div>
    )
  return (
    <div className={ui.grid}>
      <Field className={ui.col2} label="Banco" hint="Digite o código (341) ou o nome (Itaú) e escolha na lista.">
        <BancoAutocomplete value={value.banco} onChange={(v) => set({ banco: v })} />
      </Field>
      <Field label="Agência">
        <input
          value={value.agencia}
          onChange={(e) => set({ agencia: formatAgencia(e.target.value) })}
          placeholder="0000"
          inputMode="numeric"
          maxLength={7}
        />
      </Field>
      <Field label="Conta">
        <input
          value={value.conta}
          onChange={(e) => set({ conta: formatContaBancaria(e.target.value) })}
          placeholder="00000-0"
          inputMode="numeric"
          maxLength={14}
        />
      </Field>
      <Field className={ui.col2} label="Tipo de conta">
        <select value={value.tipoConta} onChange={(e) => set({ tipoConta: e.target.value as TipoConta })}>
          <option value="">Não informado</option>
          <option value="corrente">Conta corrente</option>
          <option value="poupanca">Poupança</option>
        </select>
      </Field>
      <Field className={ui.col2} label="Chave Pix">
        <input value={value.pix} onChange={(e) => set({ pix: e.target.value })} placeholder="CNPJ, e-mail, telefone ou chave aleatória" />
      </Field>
    </div>
  )
}

import { useState } from 'react'
import { IdCard, MapPin, Phone, Plus, Trash2, UserRound } from 'lucide-react'
import { Modal } from '@/features/common/Modal'
import { Field } from '@/features/common/Field'
import { StatusToggle } from '@/features/common/StatusToggle'
import { CampoCep } from '@/features/common/CampoCep'
import { CidadeAutocomplete } from '@/features/common/CidadeAutocomplete'
import ui from '@/features/common/ui.module.css'
import { formatCpf, formatRg, formatTelefone } from '@/lib/format'
import { CATEGORIAS_CNH, TIPOS_MOTORISTA, VINCULOS_MOTORISTA, diasParaVencerCnh, motoristaVazio, type Motorista } from './types'

interface Props {
  open: boolean
  initial: Motorista | null
  error?: string | null
  hoje: string
  onClose: () => void
  onSave: (m: Motorista) => void
}

const opcoes = (lista: string[], vazio = 'Selecione') => (
  <>
    <option value="">{vazio}</option>
    {lista.map((o) => <option key={o} value={o}>{o}</option>)}
  </>
)

/** Cadastro de motorista: dados pessoais, CNH, endereço e contatos de referência. */
export function MotoristaFormModal({ open, initial, error, hoje, onClose, onSave }: Props) {
  const [m, setM] = useState<Motorista>(() => (initial ? { ...motoristaVazio(), ...initial } : motoristaVazio()))
  const [erroNome, setErroNome] = useState('')
  const set = (p: Partial<Motorista>) => setM((x) => ({ ...x, ...p }))
  const end = m.endereco ?? motoristaVazio().endereco!
  const setEnd = (p: Partial<NonNullable<Motorista['endereco']>>) => set({ endereco: { ...end, ...p } })
  const dias = diasParaVencerCnh(m.validadeCnh, hoje)

  const salvar = () => {
    if (m.nome.trim().length < 2) {
      setErroNome('Informe o nome.')
      return
    }
    setErroNome('')
    onSave({ ...m, cpf: m.cpf.replace(/\D/g, '') })
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Motorista"
      subtitle={initial ? 'Editar cadastro' : 'Novo motorista'}
      icon={<IdCard />}
      maxWidth={760}
      error={error}
      footer={
        <>
          <button type="button" className={`${ui.btn} ${ui.btnGhost}`} onClick={onClose}>Cancelar</button>
          <button type="button" className={`${ui.btn} ${ui.btnPrimary}`} onClick={salvar}>Salvar</button>
        </>
      }
    >
      <div className={ui.topRow}>
        <span className={ui.modalNote}>Motorista, ajudante ou operador habilitado para as operações.</span>
        <StatusToggle value={m.status !== 'inativo'} onChange={(v) => set({ status: v ? 'ativo' : 'inativo' })} />
      </div>

      <section className={ui.fsection}>
        <div className={ui.fsectionTitle}><UserRound /> Dados pessoais</div>
        <div className={ui.grid}>
          <Field className={ui.col2} label="Nome" req error={erroNome}>
            <input value={m.nome} onChange={(e) => set({ nome: e.target.value })} placeholder="Nome completo" />
          </Field>
          <Field label="CPF">
            <input value={formatCpf(m.cpf)} onChange={(e) => set({ cpf: e.target.value.replace(/\D/g, '').slice(0, 11) })} placeholder="000.000.000-00" inputMode="numeric" />
          </Field>
          <Field label="Data de nascimento">
            <input type="date" value={m.dataNascimento} onChange={(e) => set({ dataNascimento: e.target.value })} />
          </Field>
          <Field label="RG">
            <input value={formatRg(m.rg)} onChange={(e) => set({ rg: e.target.value })} />
          </Field>
          <Field label="Emissão do RG">
            <input type="date" value={m.dataEmissaoRg} onChange={(e) => set({ dataEmissaoRg: e.target.value })} />
          </Field>
          <Field label="Tipo">
            <select value={m.tipo} onChange={(e) => set({ tipo: e.target.value })}>{opcoes(TIPOS_MOTORISTA)}</select>
          </Field>
          <Field label="Vínculo" hint="Frota própria, agregado, autônomo ou terceiro.">
            <select value={m.vinculo} onChange={(e) => set({ vinculo: e.target.value })}>{opcoes(VINCULOS_MOTORISTA)}</select>
          </Field>
          <Field className={ui.col2} label="Nome da mãe">
            <input value={m.nomeMae} onChange={(e) => set({ nomeMae: e.target.value })} />
          </Field>
          <Field className={ui.col2} label="Nome do pai">
            <input value={m.nomePai} onChange={(e) => set({ nomePai: e.target.value })} />
          </Field>
          <Field label="Telefone">
            <input value={formatTelefone(m.telefone)} onChange={(e) => set({ telefone: e.target.value })} placeholder="(00) 00000-0000" />
          </Field>
          <Field className={ui.col2} label="E-mail">
            <input type="email" value={m.email} onChange={(e) => set({ email: e.target.value })} />
          </Field>
        </div>
      </section>

      <section className={ui.fsection}>
        <div className={ui.fsectionTitle}><IdCard /> CNH</div>
        <div className={ui.grid}>
          <Field label="Nº da CNH">
            <input value={m.numeroCnh} onChange={(e) => set({ numeroCnh: e.target.value })} inputMode="numeric" />
          </Field>
          <Field label="Registro">
            <input value={m.registroCnh} onChange={(e) => set({ registroCnh: e.target.value })} inputMode="numeric" />
          </Field>
          <Field label="Categoria">
            <select value={m.categoriaCnh} onChange={(e) => set({ categoriaCnh: e.target.value })}>{opcoes(CATEGORIAS_CNH)}</select>
          </Field>
          <Field label="Validade" hint={dias === null ? undefined : dias < 0 ? `Vencida há ${-dias} dia(s).` : dias <= 30 ? `Vence em ${dias} dia(s).` : undefined}>
            <input type="date" value={m.validadeCnh} onChange={(e) => set({ validadeCnh: e.target.value })} />
          </Field>
          <Field label="1ª habilitação">
            <input type="date" value={m.primeiraHabilitacao} onChange={(e) => set({ primeiraHabilitacao: e.target.value })} />
          </Field>
        </div>
      </section>

      <section className={ui.fsection}>
        <div className={ui.fsectionTitle}><MapPin /> Endereço</div>
        <div className={ui.grid}>
          <Field label="CEP" hint="Com os 8 números, rua, bairro e cidade são preenchidos sozinhos.">
            <CampoCep
              value={end.cep}
              onChange={(v) => setEnd({ cep: v })}
              onEncontrado={(c) => {
                setM((x) => ({
                  ...x,
                  cidade: c.cidade || x.cidade,
                  endereco: { ...(x.endereco ?? end), logradouro: c.logradouro || (x.endereco?.logradouro ?? ''), bairro: c.bairro || (x.endereco?.bairro ?? '') },
                }))
              }}
            />
          </Field>
          <Field className={ui.col2} label="Rua">
            <input value={end.logradouro} onChange={(e) => setEnd({ logradouro: e.target.value })} placeholder="Rua, avenida..." />
          </Field>
          <Field label="Número">
            <input value={end.numero} onChange={(e) => setEnd({ numero: e.target.value })} placeholder="Ex.: 45 ou S/N" />
          </Field>
          <Field label="Complemento">
            <input value={end.complemento} onChange={(e) => setEnd({ complemento: e.target.value })} />
          </Field>
          <Field label="Bairro">
            <input value={end.bairro} onChange={(e) => setEnd({ bairro: e.target.value })} />
          </Field>
          <Field className={ui.col2} label="Cidade">
            <CidadeAutocomplete value={m.cidade} onChange={(v) => set({ cidade: v })} placeholder="Digite e escolha a cidade" />
          </Field>
        </div>
      </section>

      <section className={ui.fsection}>
        <div className={ui.fsectionTitle}><Phone /> Contatos de referência</div>
        <div className={ui.grid}>
          {m.referencias.map((r, i) => (
            <div key={i} className={ui.col4} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input style={{ flex: 2 }} value={r.nome} onChange={(e) => set({ referencias: m.referencias.map((x, j) => (j === i ? { ...x, nome: e.target.value } : x)) })} placeholder="Nome" aria-label={`Nome da referência ${i + 1}`} />
              <input style={{ flex: 1 }} value={formatTelefone(r.telefone)} onChange={(e) => set({ referencias: m.referencias.map((x, j) => (j === i ? { ...x, telefone: e.target.value } : x)) })} placeholder="Telefone" aria-label={`Telefone da referência ${i + 1}`} />
              <button type="button" className={ui.iconBtn} title="Tirar" onClick={() => set({ referencias: m.referencias.filter((_, j) => j !== i) })}><Trash2 /></button>
            </div>
          ))}
          {m.referencias.length < 5 && (
            <div className={ui.col4}>
              <button type="button" className={`${ui.btn} ${ui.btnGhost}`} onClick={() => set({ referencias: [...m.referencias, { nome: '', telefone: '' }] })}><Plus /> Incluir referência</button>
            </div>
          )}
          <Field className={ui.col4} label="Observação">
            <input value={m.observacao} onChange={(e) => set({ observacao: e.target.value })} placeholder="Opcional" />
          </Field>
        </div>
      </section>
    </Modal>
  )
}

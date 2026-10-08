import { Plus, Trash2 } from 'lucide-react'
import { Field } from '@/features/common/Field'
import ui from '@/features/common/ui.module.css'
import { formatTelefone } from '@/lib/format'
import { formatTelefoneInternacional } from '@/lib/paises'
import { PERFIS_COMPRA, novoContato, type Contato, type PerfilCompra } from './types'
import s from './parceiros.module.css'

interface Props {
  value: Contato[]
  onChange: (v: Contato[]) => void
  /** Mostra o perfil de compra (influenciador/decisor) e os envios de fatura/boleto/NF. */
  cliente: boolean
  /** Erro de e-mail por índice (vindo da validação do formulário). */
  errosEmail?: Record<number, string | undefined>
  /** Contato no exterior: telefone com o código do país (DDI), sem a máscara de DDD. */
  ddi?: string
}

/** Lista de contatos com "+": cada pessoa tem nome, cargo, telefone, e-mail e o que recebe. */
export function ContatosEditor({ value, onChange, cliente, errosEmail = {}, ddi }: Props) {
  const exterior = ddi !== undefined
  const upd = (id: string, patch: Partial<Contato>) =>
    onChange(value.map((c) => (c.id === id ? { ...c, ...patch } : c)))
  const rm = (id: string) => onChange(value.filter((c) => c.id !== id))
  const add = () => onChange([...value, novoContato()])

  return (
    <div>
      {value.length === 0 && (
        <div className={s.contatosVazio}>Nenhum contato. Adicione quem responde pela conta.</div>
      )}
      {value.map((c, i) => (
        <div key={c.id} className={ui.subBlock}>
          <div className={ui.subBlockHead}>
            <span>Contato {i + 1}</span>
            <button type="button" className={`${ui.iconBtn} ${ui.danger}`} onClick={() => rm(c.id)} title="Remover contato">
              <Trash2 />
            </button>
          </div>
          <div className={ui.grid}>
            <Field className={ui.col2} label="Nome">
              <input value={c.nome} onChange={(e) => upd(c.id, { nome: e.target.value })} placeholder="Quem responde pela conta" />
            </Field>
            <Field className={ui.col2} label="Cargo">
              <input value={c.cargo} onChange={(e) => upd(c.id, { cargo: e.target.value })} placeholder="Ex.: Gerente de compras" />
            </Field>
            {exterior ? (
              <Field className={ui.col2} label="Telefone" hint="Com o código do país na frente (ex.: +1 415 555 0100).">
                <input
                  value={c.telefone}
                  onFocus={() => !c.telefone && ddi && upd(c.id, { telefone: `+${ddi} ` })}
                  onChange={(e) => upd(c.id, { telefone: formatTelefoneInternacional(e.target.value) })}
                  placeholder={ddi ? `+${ddi} ...` : '+1 415 555 0100'}
                  inputMode="tel"
                  maxLength={24}
                />
              </Field>
            ) : (
              <Field className={ui.col2} label="Telefone">
                <input
                  value={c.telefone}
                  onChange={(e) => upd(c.id, { telefone: formatTelefone(e.target.value) })}
                  placeholder="(00) 00000-0000"
                  inputMode="numeric"
                  maxLength={15}
                />
              </Field>
            )}
            <Field className={ui.col2} label="E-mail" error={errosEmail[i]}>
              <input value={c.email} onChange={(e) => upd(c.id, { email: e.target.value })} placeholder={exterior ? 'contact@company.com' : 'contato@empresa.com.br'} />
            </Field>
            {cliente && (
              <>
                <Field
                  className={ui.col2}
                  label="Perfil de compra"
                  hint="Decisor fecha a compra; influenciador participa da decisão. Usado no CRM e na proposta."
                >
                  <select value={c.perfilCompra} onChange={(e) => upd(c.id, { perfilCompra: e.target.value as PerfilCompra })}>
                    {PERFIS_COMPRA.map((p) => (
                      <option key={p.valor} value={p.valor}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field className={ui.col2} label="Recebe por e-mail" hint="Para quem o sistema vai endereçar cada documento.">
                  <div className={ui.checkRow} style={{ height: 36, alignItems: 'center' }}>
                    <label className={ui.checkItem}>
                      <input type="checkbox" checked={c.recebeFatura} onChange={(e) => upd(c.id, { recebeFatura: e.target.checked })} />
                      Fatura
                    </label>
                    <label className={ui.checkItem}>
                      <input type="checkbox" checked={c.recebeBoleto} onChange={(e) => upd(c.id, { recebeBoleto: e.target.checked })} />
                      Boleto
                    </label>
                    <label className={ui.checkItem}>
                      <input type="checkbox" checked={c.recebeNotaFiscal} onChange={(e) => upd(c.id, { recebeNotaFiscal: e.target.checked })} />
                      Nota fiscal
                    </label>
                  </div>
                </Field>
              </>
            )}
          </div>
        </div>
      ))}
      <button type="button" className={`${ui.btn} ${ui.btnGhost}`} onClick={add}>
        <Plus /> Adicionar contato
      </button>
    </div>
  )
}

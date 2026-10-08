import { useEffect, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { mesclar } from '@/lib/mesclar'
import { UserRound } from 'lucide-react'
import { Modal } from '@/features/common/Modal'
import { Field } from '@/features/common/Field'
import { StatusToggle } from '@/features/common/StatusToggle'
import { CidadeAutocomplete } from '@/features/common/CidadeAutocomplete'
import ui from '@/features/common/ui.module.css'
import { formatCpfCnpj, formatTelefone } from '@/lib/format'
import { vendedorSchema, emptyVendedor, type VendedorForm } from './parceiro-schema'
import { TIPOS_PESSOA, TIPOS_VENDEDOR, type TipoVendedor, type Vendedor } from './types'
import { DadosBancariosFields } from './DadosBancariosFields'
import { FuncionarioAutocomplete } from './FuncionarioAutocomplete'
import { RegioesEditor } from './RegioesEditor'
import s from './parceiros.module.css'

interface Props {
  open: boolean
  initial?: Vendedor | null
  error?: string | null
  busy?: boolean
  onClose: () => void
  onSave: (data: VendedorForm) => void
}

export function VendedorFormModal({ open, initial, error, busy, onClose, onSave }: Props) {
  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    formState: { errors },
  } = useForm<VendedorForm>({
    resolver: zodResolver(vendedorSchema),
    defaultValues: emptyVendedor,
  })
  const [aba, setAba] = useState<'dados' | 'regioes' | 'banco'>('dados')
  // Ao (re)abrir o modal, volta para a primeira aba.
  const [abriuEm, setAbriuEm] = useState(open)
  if (open !== abriuEm) {
    setAbriuEm(open)
    if (open) setAba('dados')
  }

  const ativo = useWatch({ control, name: 'status' }) !== 'inativo'
  const tipo = useWatch({ control, name: 'tipo' })
  const tipoVendedor = useWatch({ control, name: 'tipoVendedor' }) ?? ''
  const cpfCnpj = useWatch({ control, name: 'cpfCnpj' }) ?? ''
  const cidade = useWatch({ control, name: 'cidade' }) ?? ''
  const telefone = useWatch({ control, name: 'telefone' }) ?? ''
  const banco = useWatch({ control, name: 'banco' }) ?? emptyVendedor.banco
  const usuarioId = useWatch({ control, name: 'usuarioId' }) ?? ''
  const regioes = useWatch({ control, name: 'regioesBloqueadas' }) ?? []
  const nomeAtual = useWatch({ control, name: 'nome' }) ?? ''
  const emailAtual = useWatch({ control, name: 'email' }) ?? ''

  useEffect(() => {
    if (!open) return
    reset(
      initial
        ? {
            ...emptyVendedor,
            ...initial,
            tipoVendedor: initial.tipoVendedor ?? '',
            usuarioId: initial.usuarioId ?? '',
            regioesBloqueadas: initial.regioesBloqueadas ?? [],
            banco: mesclar(emptyVendedor.banco, initial.banco),
          }
        : emptyVendedor,
    )
  }, [open, initial, reset])

  const submit = handleSubmit(
    (data) => onSave(data),
    () => setAba('dados'),
  )

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Vendedor"
      subtitle={initial ? 'Editar registro' : 'Novo registro'}
      icon={<UserRound />}
      maxWidth={720}
      error={error}
      busy={busy}
      footer={
        <>
          <button type="button" className={`${ui.btn} ${ui.btnGhost}`} onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" form="vendedorForm" className={`${ui.btn} ${ui.btnPrimary}`}>
            {busy ? 'Salvando...' : 'Salvar'}
          </button>
        </>
      }
    >
      <form id="vendedorForm" onSubmit={submit} noValidate>
        <div className={ui.topRow}>
          <span className={ui.modalNote}>
            Quem vende e o papel dele no comercial. A comissão é definida em Parametrizações &gt; Aprovadores e Regras.
          </span>
          <StatusToggle value={ativo} onChange={(v) => setValue('status', v ? 'ativo' : 'inativo')} />
        </div>

        <div className={s.tabs}>
          <button type="button" className={`${s.tab} ${aba === 'dados' ? s.tabActive : ''}`} onClick={() => setAba('dados')}>
            Dados
          </button>
          <button type="button" className={`${s.tab} ${aba === 'regioes' ? s.tabActive : ''}`} onClick={() => setAba('regioes')}>
            Regiões bloqueadas {regioes.length > 0 && <span className={s.tabBadge}>{regioes.length}</span>}
          </button>
          <button type="button" className={`${s.tab} ${aba === 'banco' ? s.tabActive : ''}`} onClick={() => setAba('banco')}>
            Dados bancários
          </button>
        </div>

        {aba === 'regioes' && (
          <section className={ui.fsection}>
            <div className={ui.fsectionTitle}>
              Regiões em que NÃO vende{' '}
              <span className={ui.fsectionHint}>bloqueia na precificação e no CRM quando o cliente é dessa região</span>
            </div>
            <RegioesEditor value={regioes} onChange={(v) => setValue('regioesBloqueadas', v)} />
          </section>
        )}

        {aba === 'dados' && (
          <>
            <section className={ui.fsection}>
              <div className={ui.grid}>
                <Field
                  className={ui.col4}
                  label="É o funcionário"
                  hint="Vincule ao funcionário que usa o portal: o Pricing reconhece o vendedor pelo usuário logado. Representante ou terceiro sem acesso fica sem vínculo."
                >
                  <FuncionarioAutocomplete
                    usuarioId={usuarioId}
                    onChange={(u) => {
                      setValue('usuarioId', u?.id ?? '')
                      if (!u) return
                      // Preenche o que ainda está em branco com os dados do funcionário.
                      if (!nomeAtual.trim()) setValue('nome', u.nome, { shouldValidate: true })
                      if (!emailAtual.trim()) setValue('email', u.email)
                      if (!cpfCnpj.trim() && u.cpf) setValue('cpfCnpj', u.cpf)
                      if (!telefone.trim() && u.telefone) setValue('telefone', u.telefone)
                    }}
                  />
                </Field>
                <Field className={ui.col2} label="Nome" req error={errors.nome?.message}>
                  <input {...register('nome')} placeholder="Ex.: Ana Paula Ferreira" />
                </Field>
                <Field
                  className={ui.col2}
                  label="Função"
                  hint="SDR prospecta e qualifica; Sales fecha; CS cuida do cliente depois da venda; Representante vende por conta própria."
                >
                  <select value={tipoVendedor} onChange={(e) => setValue('tipoVendedor', e.target.value as TipoVendedor)}>
                    <option value="">Não informada</option>
                    {TIPOS_VENDEDOR.map((t) => (
                      <option key={t.valor} value={t.valor}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field className={ui.col2} label="Tipo" req>
                  <select {...register('tipo')}>
                    {TIPOS_PESSOA.map((t) => (
                      <option key={t.valor} value={t.valor}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field className={ui.col2} label={tipo === 'juridica' ? 'CNPJ' : 'CPF'}>
                  <input
                    value={cpfCnpj}
                    onChange={(e) => setValue('cpfCnpj', formatCpfCnpj(e.target.value))}
                    placeholder={tipo === 'juridica' ? '00.000.000/0000-00' : '000.000.000-00'}
                    inputMode="numeric"
                    maxLength={18}
                  />
                </Field>
                <Field className={ui.col2} label="Telefone">
                  <input
                    value={telefone}
                    onChange={(e) => setValue('telefone', formatTelefone(e.target.value))}
                    placeholder="(00) 00000-0000"
                    inputMode="numeric"
                    maxLength={15}
                  />
                </Field>
                <Field className={ui.col2} label="E-mail" error={errors.email?.message}>
                  <input {...register('email')} placeholder="vendedor@empresa.com.br" />
                </Field>
                <Field className={ui.col2} label="Cidade">
                  <CidadeAutocomplete value={cidade} onChange={(v) => setValue('cidade', v)} placeholder="Digite e escolha a cidade" />
                </Field>
              </div>
            </section>

            <section className={ui.fsection}>
              <div className={ui.grid}>
                <Field className={ui.col4} label="Observação">
                  <input {...register('observacao')} placeholder="Anotações sobre este vendedor" />
                </Field>
              </div>
            </section>
          </>
        )}

        {aba === 'banco' && (
          <section className={ui.fsection}>
            <DadosBancariosFields value={banco} onChange={(v) => setValue('banco', v)} />
          </section>
        )}
      </form>
    </Modal>
  )
}

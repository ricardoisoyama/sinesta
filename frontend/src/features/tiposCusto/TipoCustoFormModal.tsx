import { useEffect } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Coins } from 'lucide-react'
import { Modal } from '@/features/common/Modal'
import { Field } from '@/features/common/Field'
import { StatusToggle } from '@/features/common/StatusToggle'
import { MoneyInput } from '@/features/common/MoneyInput'
import { PercentInput } from '@/features/common/PercentInput'
import ui from '@/features/common/ui.module.css'
import type { BasePercentualCusto, ModoCusto } from '@/features/cadastros/api'
import { tipoCustoSchema, emptyTipoCusto, type TipoCustoForm } from './tipo-custo-schema'

interface Props {
  open: boolean
  initial?: TipoCustoForm | null
  error?: string | null
  onClose: () => void
  onSave: (data: TipoCustoForm) => void
}

export function TipoCustoFormModal({ open, initial, error, onClose, onSave }: Props) {
  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    formState: { errors },
  } = useForm<TipoCustoForm>({
    resolver: zodResolver(tipoCustoSchema),
    defaultValues: emptyTipoCusto,
  })

  const ativo = useWatch({ control, name: 'status' }) !== 'inativo'
  const modo = useWatch({ control, name: 'modo' }) ?? 'valor'
  const valor = useWatch({ control, name: 'valor' }) ?? 0
  const basePercentual = useWatch({ control, name: 'basePercentual' }) ?? 'nf'

  useEffect(() => {
    if (open) reset(initial ? { ...emptyTipoCusto, ...initial } : emptyTipoCusto)
  }, [open, initial, reset])

  const submit = handleSubmit((data) => onSave(data))

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Tipo de Custo"
      subtitle={initial ? 'Editar registro' : 'Novo registro'}
      icon={<Coins />}
      maxWidth={600}
      error={error}
      footer={
        <>
          <button type="button" className={`${ui.btn} ${ui.btnGhost}`} onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" form="tipoCustoForm" className={`${ui.btn} ${ui.btnPrimary}`}>
            Salvar
          </button>
        </>
      }
    >
      <form id="tipoCustoForm" onSubmit={submit} noValidate>
        <div className={ui.topRow}>
          <span className={ui.modalNote}>
            Custo pré-cadastrado: na Precificação, ao escolher o tipo, o valor vem preenchido.
          </span>
          <StatusToggle value={ativo} onChange={(v) => setValue('status', v ? 'ativo' : 'inativo')} />
        </div>

        <section className={ui.fsection}>
          <div className={ui.grid}>
            <Field className={ui.col4} label="Nome" req error={errors.nome?.message}>
              <input {...register('nome')} placeholder="Ex.: Mão de obra" />
            </Field>
            <Field
              className={ui.col2}
              label="Cobrado como"
              req
              hint="Valor: um número em reais. Percentual: uma fração de outra base, como o seguro que é cobrado sobre a NF."
            >
              <select
                value={modo}
                onChange={(e) => {
                  setValue('modo', e.target.value as ModoCusto)
                  setValue('valor', 0)
                }}
              >
                <option value="valor">Valor em reais</option>
                <option value="percentual">Percentual</option>
              </select>
            </Field>
            {modo === 'valor' ? (
              <Field className={ui.col2} label="Valor pré-cadastrado (R$)" error={errors.valor?.message}>
                <MoneyInput value={valor} onChange={(n) => setValue('valor', n, { shouldValidate: true })} />
              </Field>
            ) : (
              <>
                <Field className={ui.col2} label="Percentual" error={errors.valor?.message}>
                  <PercentInput value={valor} onChange={(f) => setValue('valor', f, { shouldValidate: true })} />
                </Field>
                <Field
                  className={ui.col4}
                  label="Percentual sobre"
                  req
                  hint="Valor da NF: usa o valor da nota informado na Precificação. Preço do serviço: usa o próprio preço calculado (o sistema resolve a conta)."
                >
                  <select value={basePercentual} onChange={(e) => setValue('basePercentual', e.target.value as BasePercentualCusto)}>
                    <option value="nf">Valor da NF informado</option>
                    <option value="servico">Preço do serviço</option>
                  </select>
                </Field>
              </>
            )}
          </div>
        </section>
      </form>
    </Modal>
  )
}

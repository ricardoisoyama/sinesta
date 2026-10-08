import { useEffect } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Percent } from 'lucide-react'
import { Modal } from '@/features/common/Modal'
import { Field } from '@/features/common/Field'
import { StatusToggle } from '@/features/common/StatusToggle'
import { PercentInput } from '@/features/common/PercentInput'
import { MoneyInput } from '@/features/common/MoneyInput'
import ui from '@/features/common/ui.module.css'
import { taxaSchema, emptyTaxa, type TaxaForm } from './taxa-schema'

interface Props {
  open: boolean
  initial?: TaxaForm | null
  error?: string | null
  onClose: () => void
  onSave: (data: TaxaForm) => void
}

export function TaxaFormModal({ open, initial, error, onClose, onSave }: Props) {
  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    formState: { errors },
  } = useForm<TaxaForm>({
    resolver: zodResolver(taxaSchema),
    defaultValues: emptyTaxa,
  })

  const ativo = useWatch({ control, name: 'status' }) !== 'inativo'
  const tipo = useWatch({ control, name: 'tipo' })
  const valor = useWatch({ control, name: 'valor' }) ?? 0

  useEffect(() => {
    if (open) reset(initial ?? emptyTaxa)
  }, [open, initial, reset])

  const submit = handleSubmit((data) => onSave(data))

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Taxa / Seguro"
      subtitle={initial ? 'Editar registro' : 'Novo registro'}
      icon={<Percent />}
      maxWidth={620}
      error={error}
      footer={
        <>
          <button type="button" className={`${ui.btn} ${ui.btnGhost}`} onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" form="taxaForm" className={`${ui.btn} ${ui.btnPrimary}`}>
            Salvar
          </button>
        </>
      }
    >
      <form id="taxaForm" onSubmit={submit} noValidate>
        <div className={ui.topRow}>
          <span className={ui.modalNote}>Taxa/seguro ad valorem (% sobre a NF) ou valor fixo.</span>
          <StatusToggle value={ativo} onChange={(v) => setValue('status', v ? 'ativo' : 'inativo')} />
        </div>

        <section className={ui.fsection}>
          <div className={ui.grid}>
            <Field className={ui.col4} label="Nome" req error={errors.nome?.message}>
              <input {...register('nome')} placeholder="Ex.: Seguro (ad valorem)" />
            </Field>
            <Field className={ui.col2} label="Tipo" req error={errors.tipo?.message}>
              <select {...register('tipo')}>
                <option value="percentual">Percentual (% sobre a NF)</option>
                <option value="fixo">Valor fixo (R$)</option>
              </select>
            </Field>
            <Field
              className={ui.col2}
              label={tipo === 'percentual' ? 'Alíquota (% sobre a NF)' : 'Valor fixo (R$)'}
              req
              error={errors.valor?.message}
            >
              {tipo === 'percentual' ? (
                <PercentInput
                  value={valor}
                  onChange={(f) => setValue('valor', f, { shouldValidate: true })}
                  invalid={!!errors.valor}
                />
              ) : (
                <MoneyInput
                  value={valor}
                  onChange={(n) => setValue('valor', n, { shouldValidate: true })}
                  invalid={!!errors.valor}
                />
              )}
            </Field>
          </div>
        </section>
      </form>
    </Modal>
  )
}

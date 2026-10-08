import { useEffect } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Truck } from 'lucide-react'
import { Modal } from '@/features/common/Modal'
import { Field } from '@/features/common/Field'
import { StatusToggle } from '@/features/common/StatusToggle'
import ui from '@/features/common/ui.module.css'
import { servicoSchema, emptyServico, type ServicoForm } from './servico-schema'

interface Props {
  open: boolean
  initial?: ServicoForm | null
  error?: string | null
  busy?: boolean
  onClose: () => void
  onSave: (data: ServicoForm) => void
}

export function ServicoFormModal({ open, initial, error, busy, onClose, onSave }: Props) {
  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    formState: { errors },
  } = useForm<ServicoForm>({
    resolver: zodResolver(servicoSchema),
    defaultValues: emptyServico,
  })

  const ativo = useWatch({ control, name: 'status' }) !== 'inativo'

  useEffect(() => {
    if (open) reset(initial ?? emptyServico)
  }, [open, initial, reset])

  const submit = handleSubmit((data) => onSave(data))

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Serviço"
      subtitle={initial ? 'Editar registro' : 'Novo registro'}
      icon={<Truck />}
      maxWidth={520}
      error={error}
      busy={busy}
      footer={
        <>
          <button type="button" className={`${ui.btn} ${ui.btnGhost}`} onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" form="servicoForm" className={`${ui.btn} ${ui.btnPrimary}`}>
            {busy ? 'Salvando...' : 'Salvar'}
          </button>
        </>
      }
    >
      <form id="servicoForm" onSubmit={submit} noValidate>
        <div className={ui.topRow}>
          <span className={ui.modalNote}>Serviço oferecido que sai na proposta.</span>
          <StatusToggle value={ativo} onChange={(v) => setValue('status', v ? 'ativo' : 'inativo')} />
        </div>

        <section className={ui.fsection}>
          <div className={ui.grid}>
            <Field className={ui.col4} label="Nome" req error={errors.nome?.message}>
              <input {...register('nome')} placeholder="Ex.: Consultoria mensal" />
            </Field>
          </div>
        </section>
      </form>
    </Modal>
  )
}

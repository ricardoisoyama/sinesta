import { useEffect } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Tags } from 'lucide-react'
import { Modal } from '@/features/common/Modal'
import { Field } from '@/features/common/Field'
import { StatusToggle } from '@/features/common/StatusToggle'
import ui from '@/features/common/ui.module.css'
import { usePlanoContas } from '@/features/planoContas/store'
import { PlanoContaBusca } from '@/features/planoContas/PlanoContaBusca'
import type { CategoriaCusto } from './types'

const categoriaSchema = z.object({
  nome: z.string().min(2, 'Informe o nome'),
  planoContaId: z.string(),
  status: z.enum(['ativo', 'inativo']),
})

export type CategoriaForm = z.infer<typeof categoriaSchema>

const emptyCategoria: CategoriaForm = { nome: '', planoContaId: '', status: 'ativo' }

interface Props {
  open: boolean
  initial?: CategoriaCusto | null
  error?: string | null
  onClose: () => void
  onSave: (data: CategoriaForm) => void
}

export function CategoriaFormModal({ open, initial, error, onClose, onSave }: Props) {
  const { contas: planoContas } = usePlanoContas()
  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    formState: { errors },
  } = useForm<CategoriaForm>({
    resolver: zodResolver(categoriaSchema),
    defaultValues: emptyCategoria,
  })

  const ativo = useWatch({ control, name: 'status' }) !== 'inativo'
  const planoContaId = useWatch({ control, name: 'planoContaId' }) ?? ''

  useEffect(() => {
    if (open) reset(initial ? { ...emptyCategoria, ...initial } : emptyCategoria)
  }, [open, initial, reset])

  const submit = handleSubmit((data) => onSave(data))

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Centro de custo"
      subtitle={initial ? 'Editar registro' : 'Novo registro'}
      icon={<Tags />}
      maxWidth={620}
      error={error}
      footer={
        <>
          <button type="button" className={`${ui.btn} ${ui.btnGhost}`} onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" form="categoriaForm" className={`${ui.btn} ${ui.btnPrimary}`}>
            Salvar
          </button>
        </>
      }
    >
      <form id="categoriaForm" onSubmit={submit} noValidate>
        <div className={ui.topRow}>
          <span className={ui.modalNote}>
            Setor que agrupa as despesas e sugere a conta do plano de contas ao lançar um custo.
          </span>
          <StatusToggle value={ativo} onChange={(v) => setValue('status', v ? 'ativo' : 'inativo')} />
        </div>

        <section className={ui.fsection}>
          <div className={ui.grid}>
            <Field className={ui.col4} label="Nome" req error={errors.nome?.message}>
              <input {...register('nome')} placeholder="Ex.: Sistemas/TI" />
            </Field>
            <Field
              className={ui.col4}
              label="Conta padrão do plano de contas"
              hint="Ao lançar um custo neste centro de custo, esta conta vem preenchida automaticamente."
            >
              <PlanoContaBusca value={planoContaId} onChange={(id) => setValue('planoContaId', id, { shouldDirty: true })} contas={planoContas} vazio="Nenhuma" />
            </Field>
          </div>
        </section>
      </form>
    </Modal>
  )
}

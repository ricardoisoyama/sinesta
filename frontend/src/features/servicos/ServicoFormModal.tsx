import { useEffect } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Truck } from 'lucide-react'
import { Modal } from '@/features/common/Modal'
import { Field } from '@/features/common/Field'
import { StatusToggle } from '@/features/common/StatusToggle'
import ui from '@/features/common/ui.module.css'
import { servicoSchema, emptyServico, type ServicoForm } from './servico-schema'
import { useEmpresasQuery } from '@/features/cadastros/hooks'
import { DadosFiscaisServico } from './DadosFiscaisServico'

interface Props {
  open: boolean
  initial?: (Omit<ServicoForm, 'fiscais'> & { fiscais?: ServicoForm['fiscais'] }) | null
  error?: string | null
  busy?: boolean
  /** Já usado em proposta: o nome não muda (os dados fiscais sim). */
  nomeTravado?: boolean
  onClose: () => void
  onSave: (data: ServicoForm) => void
}

export function ServicoFormModal({ open, initial, error, busy, nomeTravado, onClose, onSave }: Props) {
  const { data: empresasData } = useEmpresasQuery()
  const empresas = (empresasData ?? []).filter((e) => e.status === 'ativo')
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
  const fiscais = useWatch({ control, name: 'fiscais' }) ?? []

  useEffect(() => {
    if (open) reset(initial ? { ...emptyServico, ...initial, fiscais: initial.fiscais ?? [] } : emptyServico)
  }, [open, initial, reset])

  const submit = handleSubmit((data) => onSave(data))

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Serviço"
      subtitle={initial ? 'Editar registro' : 'Novo registro'}
      icon={<Truck />}
      maxWidth={900}
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
          <span className={ui.modalNote}>Serviço oferecido que sai na proposta e na NFS-e.</span>
          <StatusToggle value={ativo} onChange={(v) => setValue('status', v ? 'ativo' : 'inativo')} />
        </div>

        <section className={ui.fsection}>
          <div className={ui.grid}>
            <Field className={ui.col4} label="Nome" req error={errors.nome?.message} hint={nomeTravado ? 'Já usado em proposta: o nome não muda (os dados fiscais podem ser ajustados).' : undefined}>
              <input {...register('nome')} placeholder="Ex.: Consultoria mensal" readOnly={nomeTravado} />
            </Field>
          </div>
        </section>

        <section className={ui.fsection}>
          <div className={ui.fsectionTitle}>
            Dados fiscais (NFS-e) <span className={ui.fsectionHint}>um por empresa emitente; ISS e retenções vêm da empresa</span>
          </div>
          <DadosFiscaisServico value={fiscais} onChange={(v) => setValue('fiscais', v, { shouldDirty: true })} empresas={empresas} />
        </section>
      </form>
    </Modal>
  )
}

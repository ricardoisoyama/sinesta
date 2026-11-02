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
import { ImpostosServicoEditor } from './ImpostosServicoEditor'
import { empresaPadrao } from '@/features/unidades/types'
import { useFatorEmpresa } from '@/features/pricing/usePreco'
import { regimeDaTabela, type RegimeTabela } from './impostos'

interface Props {
  open: boolean
  initial?: (Omit<ServicoForm, 'fiscais' | 'impostos'> & { fiscais?: ServicoForm['fiscais']; impostos?: ServicoForm['impostos'] }) | null
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
  const impostos = useWatch({ control, name: 'impostos' }) ?? []
  // O adicional do IRPJ depende do faturamento: mostra com a meta da empresa padrão.
  const padrao = empresaPadrao(empresas)
  const fatorPadrao = useFatorEmpresa(open ? (padrao?.id ?? '') : '')

  const regimePadrao = regimeDaTabela(padrao?.regime ?? 'Lucro Presumido')
  const empresasPorRegime: Partial<Record<RegimeTabela, string[]>> = {}
  for (const e of empresas) (empresasPorRegime[regimeDaTabela(e.regime)] ??= []).push(e.nome)

  useEffect(() => {
    if (!open) return
    // Impostos de antes (sem regime/vigência) passam a ser a tabela do regime da empresa padrão.
    const impostos = (initial?.impostos ?? []).map((i) => ({ ...i, regime: i.regime || regimePadrao, vigenteDesde: i.vigenteDesde ?? '' }))
    reset(initial ? { ...emptyServico, ...initial, fiscais: initial.fiscais ?? [], impostos } : emptyServico)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- o regime padrão só vale na abertura
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
          <span className={ui.modalNote}>Serviço oferecido que sai na proposta e na NFS-e, com os impostos que o Pricing usa.</span>
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
            Impostos <span className={ui.fsectionHint}>uma tabela por regime e vigência; vale a do regime da empresa, em vigor no dia</span>
          </div>
          <ImpostosServicoEditor
            key={`${open}-${regimePadrao}`}
            regimePadrao={regimePadrao}
            empresasPorRegime={empresasPorRegime}
            value={impostos}
            onChange={(v) => setValue('impostos', v, { shouldDirty: true })}
            faturamento={fatorPadrao?.receita ?? 0}
            nomeEmpresa={padrao?.nome ?? 'empresa'}
          />
        </section>

        <section className={ui.fsection}>
          <div className={ui.fsectionTitle}>
            Dados fiscais (NFS-e) <span className={ui.fsectionHint}>um por empresa emitente; as retenções vêm da empresa</span>
          </div>
          <DadosFiscaisServico value={fiscais} onChange={(v) => setValue('fiscais', v, { shouldDirty: true })} empresas={empresas} />
        </section>
      </form>
    </Modal>
  )
}

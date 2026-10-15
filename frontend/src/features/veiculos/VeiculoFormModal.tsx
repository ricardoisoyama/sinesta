import { useEffect } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { FileText, Settings2, Truck, UserRound } from 'lucide-react'
import { Modal } from '@/features/common/Modal'
import { Field } from '@/features/common/Field'
import { StatusToggle } from '@/features/common/StatusToggle'
import ui from '@/features/common/ui.module.css'
import { AnexosTab } from '@/features/anexos/AnexosTab'
import { formatCpfCnpj, formatRg, formatTelefone } from '@/lib/format'
import { UFS } from '@/lib/ufs'
import { TextoComSugestoes } from '@/features/common/TextoComSugestoes'
import {
  CARROCERIAS,
  PERFIS_VEICULO,
  SIM_NAO,
  TIPOS_VEICULO,
  mascaraChassi,
  mascaraPlaca,
  placaFormatada,
  soDigitos,
  sugestoesMarca,
  sugestoesModelo,
  type Veiculo,
} from './types'
import { emptyVeiculo, veiculoSchema, type VeiculoForm } from './veiculo-schema'

interface Props {
  open: boolean
  initial?: (VeiculoForm & { id: string }) | null
  /** Veículos já cadastrados: as marcas e modelos deles entram nas sugestões. */
  cadastrados: Veiculo[]
  error?: string | null
  onClose: () => void
  onSave: (data: VeiculoForm) => void
}

const opcoes = (lista: string[], vazio = 'Selecione') => (
  <>
    <option value="">{vazio}</option>
    {lista.map((o) => (
      <option key={o} value={o}>{o}</option>
    ))}
  </>
)

/** Cadastro de veículo: identificação, características, proprietário e documentos (CRLV). */
export function VeiculoFormModal({ open, initial, cadastrados, error, onClose, onSave }: Props) {
  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    formState: { errors },
  } = useForm<VeiculoForm>({ resolver: zodResolver(veiculoSchema), defaultValues: emptyVeiculo })

  const ativo = useWatch({ control, name: 'status' }) !== 'inativo'
  const placaTracao = useWatch({ control, name: 'placaTracao' }) ?? ''
  const placaReboque = useWatch({ control, name: 'placaReboque' }) ?? ''
  const cpfCnpj = useWatch({ control, name: 'cpfCnpj' }) ?? ''
  const telefone = useWatch({ control, name: 'telefone' }) ?? ''
  const rg = useWatch({ control, name: 'rg' }) ?? ''
  const renavam = useWatch({ control, name: 'renavam' }) ?? ''
  const antt = useWatch({ control, name: 'antt' }) ?? ''
  const chassi = useWatch({ control, name: 'chassi' }) ?? ''
  const marca = useWatch({ control, name: 'marca' }) ?? ''
  const modelo = useWatch({ control, name: 'modelo' }) ?? ''

  useEffect(() => {
    if (open) reset(initial ? { ...emptyVeiculo, ...initial } : emptyVeiculo)
  }, [open, initial, reset])

  const submit = handleSubmit((data) => onSave(data))
  // Placa: guarda sem hífen (ABC1234); mostra com hífen no formato antigo.
  const campoPlaca = (nome: 'placaTracao' | 'placaReboque', valor: string, placeholder: string) => (
    <input
      value={placaFormatada(valor)}
      onChange={(e) => setValue(nome, mascaraPlaca(e.target.value), { shouldValidate: !!errors[nome] })}
      placeholder={placeholder}
      maxLength={8}
    />
  )

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Cadastro de Veículo"
      subtitle={initial ? 'Editar registro' : 'Novo registro'}
      icon={<Truck />}
      maxWidth={860}
      error={error}
      footer={
        <>
          <button type="button" className={`${ui.btn} ${ui.btnGhost}`} onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" form="veiculoForm" className={`${ui.btn} ${ui.btnPrimary}`}>
            Salvar veículo
          </button>
        </>
      }
    >
      <form id="veiculoForm" onSubmit={submit} noValidate>
        <div className={ui.topRow}>
          <span className={ui.modalNote}>Veículo da frota, agregado ou de terceiro habilitado para as operações.</span>
          <StatusToggle value={ativo} onChange={(v) => setValue('status', v ? 'ativo' : 'inativo')} />
        </div>

        <section className={ui.fsection}>
          <div className={ui.fsectionTitle}><Truck /> Identificação</div>
          <div className={ui.grid}>
            <Field label="Placa de tração" req error={errors.placaTracao?.message}>{campoPlaca('placaTracao', placaTracao, 'ABC1D23')}</Field>
            <Field label="Placa do reboque" error={errors.placaReboque?.message}>{campoPlaca('placaReboque', placaReboque, 'XYZ4E56')}</Field>
            <Field label="Renavam" error={errors.renavam?.message}>
              <input value={renavam} onChange={(e) => setValue('renavam', soDigitos(e.target.value, 11), { shouldValidate: !!errors.renavam })} inputMode="numeric" placeholder="11 dígitos" />
            </Field>
            <Field label="RNTRC (ANTT)">
              <input value={antt} onChange={(e) => setValue('antt', soDigitos(e.target.value, 14))} inputMode="numeric" />
            </Field>
            <Field className={ui.col2} label="Chassi" hint="17 letras e números (o padrão não usa I, O e Q).">
              <input value={chassi} onChange={(e) => setValue('chassi', mascaraChassi(e.target.value))} />
            </Field>
          </div>
        </section>

        <section className={ui.fsection}>
          <div className={ui.fsectionTitle}><Settings2 /> Características</div>
          <div className={ui.grid}>
            <Field label="Tipo de veículo" req error={errors.tipoVeiculo?.message}>
              <select {...register('tipoVeiculo')}>{opcoes(TIPOS_VEICULO)}</select>
            </Field>
            <Field label="Tipo de carroceria">
              <select {...register('tipoCarroceria')}>{opcoes(CARROCERIAS)}</select>
            </Field>
            <Field label="Tecnologia (rastreador)">
              <input {...register('tecnologia')} placeholder="Onixsat, Sascar..." />
            </Field>
            <Field label="Perfil">
              <select {...register('perfil')}>{opcoes(PERFIS_VEICULO)}</select>
            </Field>
            <Field label="Trava de 5ª roda">
              <select {...register('travaQuintaRoda')}>{opcoes(SIM_NAO, '—')}</select>
            </Field>
            <Field label="Blindado">
              <select {...register('blindado')}>{opcoes(SIM_NAO, '—')}</select>
            </Field>
            <Field label="Marca">
              <TextoComSugestoes value={marca} onChange={(v) => setValue('marca', v)} sugestoes={sugestoesMarca(cadastrados)} placeholder="Volvo, Scania..." />
            </Field>
            <Field label="Modelo">
              <TextoComSugestoes value={modelo} onChange={(v) => setValue('modelo', v)} sugestoes={sugestoesModelo(marca, cadastrados)} placeholder={marca ? `Modelos ${marca}` : 'Escolha a marca'} />
            </Field>
            <Field label="Cor">
              <input {...register('cor')} />
            </Field>
          </div>
        </section>

        <section className={ui.fsection}>
          <div className={ui.fsectionTitle}><UserRound /> Proprietário</div>
          <div className={ui.grid}>
            <Field label="CPF / CNPJ">
              <input value={cpfCnpj} onChange={(e) => setValue('cpfCnpj', formatCpfCnpj(e.target.value))} inputMode="numeric" />
            </Field>
            <Field className={ui.col3} label="Nome do proprietário">
              <input {...register('nomeProprietario')} />
            </Field>
            <Field label="Data de nascimento">
              <input type="date" {...register('dataNascimento')} />
            </Field>
            <Field label="RG">
              <input value={rg} onChange={(e) => setValue('rg', formatRg(e.target.value))} />
            </Field>
            <Field label="UF do RG">
              <select {...register('ufRg')}>
                <option value="">—</option>
                {UFS.map((u) => (
                  <option key={u.sigla} value={u.sigla}>{u.sigla}</option>
                ))}
              </select>
            </Field>
            <Field label="Telefone">
              <input value={telefone} onChange={(e) => setValue('telefone', formatTelefone(e.target.value))} inputMode="tel" placeholder="(00) 00000-0000" />
            </Field>
            <Field className={ui.col4} label="Nome da mãe">
              <input {...register('nomeMae')} />
            </Field>
          </div>
        </section>

        <section className={ui.fsection}>
          <div className={ui.fsectionTitle}>
            <FileText /> Documentos <span className={ui.fsectionHint}>CRLV, apólice de seguro, laudos</span>
          </div>
          <AnexosTab entidade="veiculo" entidadeId={initial?.id ?? ''} />
        </section>
      </form>
    </Modal>
  )
}

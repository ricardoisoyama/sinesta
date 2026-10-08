import { useEffect, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Target } from 'lucide-react'
import { Modal } from '@/features/common/Modal'
import { Field } from '@/features/common/Field'
import { MoneyInput } from '@/features/common/MoneyInput'
import ui from '@/features/common/ui.module.css'
import { formatBRL } from '@/lib/format'
import { useEmpresasQuery } from '@/features/cadastros/hooks'
import { metaSchema, type MetaForm } from './meta-schema'
import { distribuirIgual, mesesMeta } from './mock'
import m from './metas.module.css'

interface Props {
  open: boolean
  initial?: MetaForm | null
  podeRemover: boolean
  error?: string | null
  onClose: () => void
  onSave: (data: MetaForm) => void
  onRemove: () => void
}

const vazia = (empresaId = ''): MetaForm => ({
  nome: '',
  empresaId,
  ano: new Date().getFullYear(),
  valoresMensais: Array(12).fill(0),
  principal: false,
})

/** Meta da empresa mês a mês. O total do ano é a soma dos meses. */
export function MetaFormModal({ open, initial, podeRemover, error, onClose, onSave, onRemove }: Props) {
  const { data: empresasData } = useEmpresasQuery()
  const empresas = (empresasData ?? []).filter((e) => e.status === 'ativo')
  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    formState: { errors },
  } = useForm<MetaForm>({ resolver: zodResolver(metaSchema), defaultValues: vazia() })
  const valores = useWatch({ control, name: 'valoresMensais' }) ?? Array(12).fill(0)
  const empresaId = useWatch({ control, name: 'empresaId' })
  const principal = useWatch({ control, name: 'principal' })
  const total = valores.reduce((a, v) => a + (v || 0), 0)
  const [anualRapido, setAnualRapido] = useState(0)
  // Ao reabrir, o atalho do valor anual volta a zero (ajuste na renderização, sem efeito).
  const [abriuEm, setAbriuEm] = useState(open)
  if (open !== abriuEm) {
    setAbriuEm(open)
    if (open) setAnualRapido(0)
  }

  useEffect(() => {
    // Meta nova já vem na empresa padrão (ou na única empresa); dá para trocar no campo.
    if (open) reset(initial ?? vazia((empresas.length === 1 ? empresas[0] : empresas.find((e) => e.padrao))?.id ?? ''))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial, reset])

  const setMes = (i: number, v: number) =>
    setValue('valoresMensais', valores.map((x, j) => (j === i ? v : x)), { shouldValidate: true })
  const submit = handleSubmit((d) => onSave(d))

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Meta de Faturamento"
      subtitle={initial ? 'Editar meta' : 'Nova meta'}
      icon={<Target />}
      maxWidth={760}
      error={error}
      footer={
        <>
          {initial && podeRemover && (
            <button type="button" className={`${ui.btn} ${ui.btnGhost}`} style={{ marginRight: 'auto' }} onClick={onRemove} title="A meta sai da tela; o histórico fica guardado">
              Inativar
            </button>
          )}
          <button type="button" className={`${ui.btn} ${ui.btnGhost}`} onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" form="metaForm" className={`${ui.btn} ${ui.btnPrimary}`}>
            Salvar
          </button>
        </>
      }
    >
      <form id="metaForm" onSubmit={submit} noValidate>
        <section className={ui.fsection}>
          <div className={ui.grid}>
            <Field className={ui.col2} label="Empresa" req error={errors.empresaId?.message} hint="A meta compõe o fator desta empresa: o DF% é a despesa fixa dividida pela meta do mês corrente, então o preço muda a cada mês (como as linhas G58:G69 da planilha).">
              <select value={empresaId} onChange={(e) => setValue('empresaId', e.target.value, { shouldValidate: true })}>
                <option value="">Selecione</option>
                {empresas.map((e) => (
                  <option key={e.id} value={e.id}>{e.nome}</option>
                ))}
              </select>
            </Field>
            <Field className={ui.col2} label="Nome" req error={errors.nome?.message}>
              <input {...register('nome')} placeholder="Ex.: Meta 2027" />
            </Field>
            <Field label="Ano" req error={errors.ano?.message}>
              <input type="number" {...register('ano', { valueAsNumber: true })} min={2000} max={2100} />
            </Field>
            <Field className={ui.col3} label="Esta meta compõe o fator" hint="Só importa quando a empresa tem mais de uma meta ativa no mesmo ano (cenários). A marcada é a usada no Pricing.">
              <label className={m.principal}>
                <input type="checkbox" checked={principal} onChange={(e) => setValue('principal', e.target.checked)} />
                Usar esta meta no cálculo do fator
              </label>
            </Field>
          </div>
        </section>

        <section className={ui.fsection}>
          <div className={ui.fsectionTitle}>
            Meta por mês <span className={ui.fsectionHint}>digite o valor de cada mês; o total do ano é a soma</span>
          </div>
          <div className={m.mesesGrid}>
            {mesesMeta.map((mes, i) => (
              <Field key={mes} label={mes}>
                <MoneyInput value={valores[i] || 0} onChange={(n) => setMes(i, n)} />
              </Field>
            ))}
          </div>
          <div className={m.totalLinha}>
            <span>
              Total do ano <b>{formatBRL(total)}</b> · média mensal <b>{formatBRL(total / 12)}</b>
            </span>
            {errors.valoresMensais && <span className={ui.errMsg}>{errors.valoresMensais.message ?? 'Confira os meses'}</span>}
          </div>
          <div className={m.distribuir}>
            <span>Tem só o valor do ano?</span>
            <div style={{ width: 180 }}>
              <MoneyInput value={anualRapido} onChange={setAnualRapido} placeholder="Valor anual" />
            </div>
            <button type="button" className={`${ui.btn} ${ui.btnGhost}`} disabled={!(anualRapido > 0)} onClick={() => setValue('valoresMensais', distribuirIgual(anualRapido), { shouldValidate: true })}>
              Dividir igual pelos 12 meses
            </button>
          </div>
        </section>
      </form>
    </Modal>
  )
}

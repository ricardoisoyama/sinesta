import { useEffect } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { FolderTree } from 'lucide-react'
import { Modal } from '@/features/common/Modal'
import { Field } from '@/features/common/Field'
import { StatusToggle } from '@/features/common/StatusToggle'
import { MoneyInput } from '@/features/common/MoneyInput'
import ui from '@/features/common/ui.module.css'
import { usePlanoContas } from './store'
import { planoContaSchema, emptyPlanoConta, type PlanoContaForm } from './plano-conta-schema'
import {
  TIPOS_CONTA,
  CONTAS_DRE,
  contaContabilDoCodigo,
  sugerirCodigoConta,
  type GrupoDre,
  type PlanoConta,
  type TipoConta,
} from './types'

interface Props {
  open: boolean
  /** Conta em edição (null = nova conta). */
  initial?: PlanoConta | null
  /** Pai pré-selecionado ao criar "subconta" (ignorado quando editando). */
  paiInicial?: string | null
  error?: string | null
  onClose: () => void
  onSave: (data: PlanoContaForm) => void
}

export function PlanoContaFormModal({ open, initial, paiInicial, error, onClose, onSave }: Props) {
  const { contas, descendentes } = usePlanoContas()
  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<PlanoContaForm>({
    resolver: zodResolver(planoContaSchema),
    defaultValues: emptyPlanoConta,
  })

  const ativo = useWatch({ control, name: 'status' }) !== 'inativo'
  const paiId = useWatch({ control, name: 'paiId' }) ?? ''
  const grupoDre = useWatch({ control, name: 'grupoDre' }) ?? 'Despesa'
  const tipo = useWatch({ control, name: 'tipo' }) ?? ''
  const limite = useWatch({ control, name: 'limiteGasto' }) ?? 0
  const codigo = useWatch({ control, name: 'codigo' }) ?? ''

  // Ao criar, o código e a conta contábil são gerados; o usuário pode ajustar se quiser.
  const aplicarSugestao = (novoPaiId: string, grupo: GrupoDre) => {
    const cod = sugerirCodigoConta(contas, novoPaiId || null, grupo)
    setValue('codigo', cod, { shouldValidate: true })
    setValue('contaContabil', contaContabilDoCodigo(cod))
  }

  useEffect(() => {
    if (!open) return
    if (initial) {
      reset({
        codigo: initial.codigo,
        nome: initial.nome,
        paiId: initial.paiId ?? '',
        grupoDre: initial.grupoDre,
        contaContabil: initial.contaContabil ?? '',
        contaDre: initial.contaDre ?? '',
        limiteGasto: initial.limiteGasto ?? 0,
        tipo: initial.tipo ?? '',
        status: initial.status,
      })
    } else {
      const pai = paiInicial ? contas.find((c) => c.id === paiInicial) : null
      const grupo = pai?.grupoDre ?? 'Despesa'
      const cod = sugerirCodigoConta(contas, paiInicial ?? null, grupo)
      reset({
        ...emptyPlanoConta,
        paiId: paiInicial ?? '',
        codigo: cod,
        contaContabil: contaContabilDoCodigo(cod),
        grupoDre: grupo,
        tipo: pai?.tipo ?? '',
      })
    }
    // contas propositalmente fora das deps: só re-seedar ao (re)abrir.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial, paiInicial, reset])

  const trocarPai = (novoPaiId: string) => {
    setValue('paiId', novoPaiId)
    if (initial) return // ao editar, não mexe no código nem no grupo
    const pai = contas.find((c) => c.id === novoPaiId)
    const grupo = pai?.grupoDre ?? getValues('grupoDre')
    if (pai) {
      setValue('grupoDre', pai.grupoDre)
      if (pai.tipo) setValue('tipo', pai.tipo)
    }
    aplicarSugestao(novoPaiId, grupo)
  }

  const trocarGrupo = (grupo: GrupoDre) => {
    setValue('grupoDre', grupo)
    // Conta raiz nova: o grupo define o primeiro dígito (Receita 1, Despesa 2).
    if (!initial && !paiId) aplicarSugestao('', grupo)
  }

  // Opções de conta-pai: todas, menos a própria e suas descendentes (evita ciclo).
  const bloqueados = initial ? new Set(descendentes(initial.id)) : new Set<string>()
  const opcoesPai = contas
    .filter((c) => !bloqueados.has(c.id))
    .sort((a, b) => a.codigo.localeCompare(b.codigo, undefined, { numeric: true }))

  const ehRaiz = !paiId
  const submit = handleSubmit((data) => onSave(data))

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Conta / Categoria"
      subtitle={initial ? 'Editar conta' : 'Nova conta'}
      icon={<FolderTree />}
      maxWidth={640}
      error={error}
      footer={
        <>
          <button type="button" className={`${ui.btn} ${ui.btnGhost}`} onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" form="planoContaForm" className={`${ui.btn} ${ui.btnPrimary}`}>
            Salvar
          </button>
        </>
      }
    >
      <form id="planoContaForm" onSubmit={submit} noValidate>
        <div className={ui.topRow}>
          <span className={ui.modalNote}>
            {ehRaiz
              ? 'Sem conta-pai, esta conta é um grupo principal (ex.: 1 Receitas, 2 Despesas).'
              : 'O código é gerado a partir da conta-pai: 2.01 abaixo de 2, 2.01.01 abaixo de 2.01.'}
          </span>
          <StatusToggle value={ativo} onChange={(v) => setValue('status', v ? 'ativo' : 'inativo')} />
        </div>

        <section className={ui.fsection}>
          <div className={ui.grid}>
            <Field
              className={ui.col4}
              label="Conta-pai"
              error={errors.paiId?.message}
              hint="Escolha abaixo de qual conta esta entra. Deixe em branco para criar um grupo principal, como Receitas ou Despesas."
            >
              <select value={paiId} onChange={(e) => trocarPai(e.target.value)}>
                <option value="">Nenhuma: criar como grupo principal (raiz)</option>
                {opcoesPai.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.codigo} · {c.nome}
                  </option>
                ))}
              </select>
            </Field>

            <Field
              label="Código"
              req
              error={errors.codigo?.message}
              hint="Gerado automaticamente em sequência. Receita começa em 1, Despesa em 2. Pode ser ajustado."
            >
              <input {...register('codigo')} placeholder="2.01.01" />
            </Field>
            <Field className={ui.col3} label="Nome" req error={errors.nome?.message}>
              <input {...register('nome')} placeholder="Ex.: Material de escritório" />
            </Field>

            <Field
              className={ui.col2}
              label="Grupo DRE"
              req
              error={errors.grupoDre?.message}
              hint="Receita ou Despesa. Nas subcontas vem herdado da conta-pai."
            >
              <select
                value={grupoDre}
                onChange={(e) => trocarGrupo(e.target.value as GrupoDre)}
                disabled={!ehRaiz}
              >
                <option value="Despesa">Despesa</option>
                <option value="Receita">Receita</option>
              </select>
            </Field>
            <Field
              className={ui.col2}
              label="Tipo"
              hint="Fixa: não muda com o volume da operação (aluguel, salários). Variável: acompanha a operação (materiais, comissões)."
            >
              <select value={tipo} onChange={(e) => setValue('tipo', e.target.value as TipoConta)}>
                {TIPOS_CONTA.map((t) => (
                  <option key={t.valor} value={t.valor}>
                    {t.label}
                  </option>
                ))}
              </select>
            </Field>

            <Field
              className={ui.col2}
              label="Conta contábil"
              hint="Código na contabilidade. Sugerido a partir do código, sem os pontos."
            >
              <input {...register('contaContabil')} placeholder={contaContabilDoCodigo(codigo) || '20101'} />
            </Field>
            <Field className={ui.col2} label="Limite de gasto (R$)">
              <MoneyInput value={limite} onChange={(n) => setValue('limiteGasto', n)} />
            </Field>
            <Field
              className={ui.col4}
              label="Conta do DRE"
              hint="Linha do demonstrativo de resultado em que esta conta entra (ex.: Receita Bruta de Vendas, Despesas com Pessoal). Escolha da lista ou digite outra."
            >
              <input {...register('contaDre')} list="contas-dre" placeholder="Ex.: Despesas Administrativas" />
              <datalist id="contas-dre">
                {CONTAS_DRE.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </Field>
          </div>
        </section>
      </form>
    </Modal>
  )
}

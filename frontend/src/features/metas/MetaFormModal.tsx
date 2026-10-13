import { useEffect, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { CheckCircle2, Target } from 'lucide-react'
import { Modal } from '@/features/common/Modal'
import { Field } from '@/features/common/Field'
import { MoneyInput } from '@/features/common/MoneyInput'
import { PercentInput } from '@/features/common/PercentInput'
import ui from '@/features/common/ui.module.css'
import { formatBRL, formatPct } from '@/lib/format'
import { useEmpresasQuery } from '@/features/cadastros/hooks'
import { metaSchema, type MetaForm } from './meta-schema'
import { distribuirIgual, mesesDaMeta, mesesMeta, type CenarioMeta } from './mock'
import { metaDoAno } from './realizado'
import { anualSobreAnterior, conferirValores, diferencaMeses, mesesPorPercentual, participacoes, somaMeses } from './regras'
import m from './metas.module.css'

interface Props {
  open: boolean
  initial?: MetaForm | null
  /** Id da meta em edição (fica de fora da busca da meta do ano anterior). */
  editandoId?: string
  /** Todas as metas ativas: a do ano anterior serve de base para "% sobre o ano anterior". */
  metas: CenarioMeta[]
  podeRemover: boolean
  error?: string | null
  onClose: () => void
  onSave: (data: MetaForm) => void
  onRemove: () => void
}

const MESES_EXTENSO = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']

const vazia = (empresaId = ''): MetaForm => ({
  nome: '',
  empresaId,
  ano: new Date().getFullYear(),
  metaAnual: 0,
  valoresMensais: Array(12).fill(0),
  principal: false,
  // Meta nova: preço pela média do ano (a meta do mês fazia o preço flutuar).
  basePreco: 'media',
  entradaMeses: 'valor',
  origemAnual: 'valor',
  crescimentoAnoAnterior: 0,
})

/**
 * Meta da empresa. O valor anual manda: os 12 meses (em R$ ou em % do anual) precisam fechar
 * exatamente ele. A base do preço (média do ano ou meta do mês) vai para o motor do fator.
 */
export function MetaFormModal({ open, initial, editandoId, metas, podeRemover, error, onClose, onSave, onRemove }: Props) {
  const { data: empresasData } = useEmpresasQuery()
  const empresas = (empresasData ?? []).filter((e) => e.status === 'ativo')
  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<MetaForm>({ resolver: zodResolver(metaSchema), defaultValues: vazia() })
  const valores = useWatch({ control, name: 'valoresMensais' }) ?? Array(12).fill(0)
  const empresaId = useWatch({ control, name: 'empresaId' })
  const ano = useWatch({ control, name: 'ano' }) || 0
  const principal = useWatch({ control, name: 'principal' })
  const anual = useWatch({ control, name: 'metaAnual' }) || 0
  const basePreco = useWatch({ control, name: 'basePreco' })
  const entrada = useWatch({ control, name: 'entradaMeses' })
  const origem = useWatch({ control, name: 'origemAnual' })
  const crescimento = useWatch({ control, name: 'crescimentoAnoAnterior' }) || 0

  // Percentuais digitados no modo "%" (o formulário guarda sempre os R$).
  const [pcts, setPcts] = useState<number[]>(Array(12).fill(0))
  const [aviso, setAviso] = useState<string | null>(null)
  // Ao reabrir, os percentuais partem da meta aberta (ajuste na renderização, sem efeito).
  const [abriuEm, setAbriuEm] = useState(open)
  if (open !== abriuEm) {
    setAbriuEm(open)
    if (open) {
      setPcts(initial ? participacoes(initial.metaAnual, initial.valoresMensais) : Array(12).fill(0))
      setAviso(null)
    }
  }

  useEffect(() => {
    // Meta nova já vem na empresa padrão (ou na única empresa); dá para trocar no campo.
    if (open) reset(initial ?? vazia((empresas.length === 1 ? empresas[0] : empresas.find((e) => e.padrao))?.id ?? ''))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial, reset])

  // Meta do ano anterior da mesma empresa (a mesma regra do fator: única ou principal).
  const outras = metas.filter((x) => x.id !== editandoId)
  const anterior = empresaId && ano ? metaDoAno(outras, empresaId, ano - 1) : undefined
  const mesesAnterior = anterior ? mesesDaMeta(anterior) : []
  const totalAnterior = somaMeses(mesesAnterior)
  const temAnterior = !!anterior && totalAnterior > 0

  /**
   * Troca o anual. No modo "%" e no "% sobre o ano anterior" os meses acompanham, mantendo
   * o peso de cada mês; digitando o anual em R$, os meses ficam e o rodapé mostra a diferença.
   */
  const aplicarAnual = (novo: number) => {
    setValue('metaAnual', novo, { shouldValidate: true })
    if (getValues('entradaMeses') === 'percentual' || getValues('origemAnual') === 'anoAnterior')
      setValue('valoresMensais', mesesPorPercentual(novo, pcts), { shouldValidate: true })
  }

  // Escolher "% sobre o ano anterior" traz a meta histórica para a grade: o anual com o
  // crescimento e cada mês com o mesmo peso (R$ e %) que teve no ano anterior.
  const trocarOrigem = (nova: MetaForm['origemAnual']) => {
    setValue('origemAnual', nova)
    if (nova !== 'anoAnterior' || !temAnterior) return
    const pesos = participacoes(totalAnterior, mesesAnterior)
    const novoAnual = anualSobreAnterior(totalAnterior, getValues('crescimentoAnoAnterior') || 0)
    setPcts(pesos)
    setValue('metaAnual', novoAnual, { shouldValidate: true })
    setValue('valoresMensais', mesesPorPercentual(novoAnual, pesos), { shouldValidate: true })
  }

  // "% sobre o ano anterior": o anual segue a meta do ano anterior (e trava se ela sumir ao trocar empresa/ano).
  useEffect(() => {
    if (!open || origem !== 'anoAnterior') return
    if (!temAnterior) setValue('origemAnual', 'valor')
    else if (anualSobreAnterior(totalAnterior, crescimento) !== getValues('metaAnual')) aplicarAnual(anualSobreAnterior(totalAnterior, crescimento))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, origem, temAnterior, totalAnterior, crescimento])

  const trocarEntrada = (nova: MetaForm['entradaMeses']) => {
    if (nova === entrada) return
    if (nova === 'percentual') setPcts(participacoes(anual, valores))
    setValue('entradaMeses', nova)
  }

  // Digitar em R$ também atualiza os pesos (para o anual "sobre o ano anterior" escalar a partir deles).
  const setMesValor = (i: number, v: number) => {
    const novos = valores.map((x, j) => (j === i ? v : x))
    setValue('valoresMensais', novos, { shouldValidate: true })
    setPcts(participacoes(anual, novos))
  }
  const setMesPct = (i: number, p: number) => {
    const novos = pcts.map((x, j) => (j === i ? p : x))
    setPcts(novos)
    setValue('valoresMensais', mesesPorPercentual(anual, novos), { shouldValidate: true })
  }
  const dividirIgual = () => {
    setPcts(Array(12).fill(1 / 12))
    setValue('valoresMensais', distribuirIgual(anual), { shouldValidate: true })
  }
  // Mesma sazonalidade do ano anterior: cada mês com o peso que teve lá.
  const copiarSazonalidade = () => {
    const pesos = participacoes(totalAnterior, mesesAnterior)
    setPcts(pesos)
    setValue('valoresMensais', mesesPorPercentual(anual, pesos), { shouldValidate: true })
  }

  const naoSalvou = () => {
    const v = getValues()
    setAviso(`Não dá para salvar: ${conferirValores(v.metaAnual, v.valoresMensais) ?? 'confira os campos destacados.'}`)
  }
  const submit = handleSubmit((d) => {
    setAviso(null)
    onSave(d)
  }, naoSalvou)
  const fechar = () => {
    setAviso(null)
    onClose()
  }

  // Situação dos meses x anual (rodapé da grade).
  const soma = somaMeses(valores)
  const dif = diferencaMeses(anual, valores)
  const fechou = anual > 0 && dif === 0
  const maiorMes = Math.max(...valores, 0)
  const hoje = new Date()
  const mesHoje = ano === hoje.getFullYear() ? hoje.getMonth() : -1

  const explicaBase =
    basePreco === 'media'
      ? anual > 0
        ? `DF ÷ ${formatBRL(anual / 12)} (média mensal) o ano todo: o preço não muda de um mês para o outro.`
        : 'DF ÷ a média mensal do ano: o preço não muda de um mês para o outro.'
      : mesHoje >= 0
        ? `DF ÷ a meta de cada mês: em ${MESES_EXTENSO[mesHoje]} usa ${formatBRL(valores[mesHoje] || 0)}; o preço muda a cada mês, como na planilha.`
        : 'DF ÷ a meta de cada mês: o preço muda a cada mês, como na planilha.'

  const linhaMes = (i: number) => {
    const v = valores[i] || 0
    const parte = anual > 0 ? v / anual : 0
    const ehHoje = i === mesHoje
    return (
      <div key={i} className={`${m.mesLinha} ${ehHoje ? m.mesHoje : ''}`}>
        <span className={m.mesNome} title={ehHoje ? 'Mês corrente' : undefined}>
          {mesesMeta[i]}
          {ehHoje && <i className={m.mesHojePonto} />}
        </span>
        {entrada === 'valor' ? (
          <MoneyInput value={v} onChange={(n) => setMesValor(i, n)} />
        ) : (
          <PercentInput value={pcts[i] || 0} onChange={(p) => setMesPct(i, p)} />
        )}
        <span className={m.mesOutro}>{entrada === 'valor' ? formatPct(parte) : formatBRL(v)}</span>
        <span className={m.barra} aria-hidden>
          <span style={{ width: `${maiorMes > 0 ? (v / maiorMes) * 100 : 0}%` }} />
        </span>
      </div>
    )
  }

  return (
    <Modal
      open={open}
      onClose={fechar}
      title="Meta de Faturamento"
      subtitle={initial ? 'Editar meta' : 'Nova meta'}
      icon={<Target />}
      maxWidth={820}
      error={error ?? aviso}
      footer={
        <>
          {initial && podeRemover && (
            <button type="button" className={`${ui.btn} ${ui.btnGhost}`} style={{ marginRight: 'auto' }} onClick={onRemove} title="A meta sai da tela; o histórico fica guardado">
              Inativar
            </button>
          )}
          <button type="button" className={`${ui.btn} ${ui.btnGhost}`} onClick={fechar}>
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
            <Field className={ui.col2} label="Empresa" req error={errors.empresaId?.message} hint="A meta compõe o fator desta empresa: o DF% é a despesa fixa dividida pela base escolhida em “Base do preço”.">
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
            Valor anual <span className={ui.fsectionHint}>é ele que manda: os meses precisam fechar este total</span>
          </div>
          <div className={ui.grid}>
            <Field label="Como definir">
              <select value={origem} onChange={(e) => trocarOrigem(e.target.value as MetaForm['origemAnual'])}>
                <option value="valor">Digitar o valor</option>
                <option value="anoAnterior" disabled={!temAnterior}>
                  % sobre {ano ? ano - 1 : 'o ano anterior'}
                  {!temAnterior ? ' (sem meta)' : ''}
                </option>
              </select>
            </Field>
            {origem === 'anoAnterior' && anterior ? (
              <>
                <Field label={`Crescimento sobre ${ano - 1}`}>
                  <PercentInput value={crescimento} onChange={(p) => setValue('crescimentoAnoAnterior', p)} />
                </Field>
                <Field className={ui.col2} label="Valor anual" req error={errors.metaAnual?.message}>
                  <div className={m.anualCalc}>
                    <b>{formatBRL(anual)}</b>
                    <small>
                      {anterior.nome} ({ano - 1}): {formatBRL(totalAnterior)} + {formatPct(crescimento)}
                    </small>
                  </div>
                </Field>
              </>
            ) : (
              <Field className={ui.col3} label="Valor anual" req error={errors.metaAnual?.message}>
                <div style={{ maxWidth: 240 }}>
                  <MoneyInput value={anual} onChange={aplicarAnual} invalid={!!errors.metaAnual} />
                </div>
              </Field>
            )}
          </div>
          {!temAnterior && empresaId && ano > 0 && (
            <div className={m.semAnterior}>
              Sem meta ativa de {ano - 1} para esta empresa: a opção “% sobre {ano - 1}” fica bloqueada até existir uma.
            </div>
          )}

          <div className={m.baseLinha}>
            <Field label="Base do preço (DF% no markup)">
              <select value={basePreco} onChange={(e) => setValue('basePreco', e.target.value as MetaForm['basePreco'])}>
                <option value="media">Média mensal do ano (recomendado)</option>
                <option value="mes">Meta do mês corrente</option>
              </select>
            </Field>
            <p className={m.baseExplica}>{explicaBase}</p>
          </div>
        </section>

        <section className={ui.fsection}>
          <div className={ui.fsectionTitle}>Distribuição pelos meses</div>
          <div className={m.distribuirTopo}>
            <div className={m.alterna} role="group" aria-label="Digitar os meses em">
              <button type="button" className={entrada === 'valor' ? m.alternaOn : ''} onClick={() => trocarEntrada('valor')} aria-pressed={entrada === 'valor'}>
                Em R$
              </button>
              <button type="button" className={entrada === 'percentual' ? m.alternaOn : ''} onClick={() => trocarEntrada('percentual')} aria-pressed={entrada === 'percentual'}>
                Em % do ano
              </button>
            </div>
            <span className={m.espaco} />
            <button type="button" className={`${ui.btn} ${ui.btnGhost}`} disabled={!(anual > 0)} onClick={dividirIgual}>
              Dividir igual pelos 12 meses
            </button>
            {temAnterior && (
              <button type="button" className={`${ui.btn} ${ui.btnGhost}`} disabled={!(anual > 0)} onClick={copiarSazonalidade} title={`Cada mês com o mesmo peso que teve na meta de ${ano - 1}`}>
                Sazonalidade de {ano - 1}
              </button>
            )}
          </div>

          <div className={m.mesesTabela}>
            <div className={m.mesesColuna}>{[0, 1, 2, 3, 4, 5].map(linhaMes)}</div>
            <div className={m.mesesColuna}>{[6, 7, 8, 9, 10, 11].map(linhaMes)}</div>
          </div>

          <div className={`${m.totalLinha} ${anual > 0 && !fechou ? m.totalRuim : ''}`}>
            <span>
              Distribuído <b>{formatBRL(soma)}</b> de <b>{formatBRL(anual)}</b>
              {anual > 0 && <> ({formatPct(soma / anual)})</>}
            </span>
            {!(anual > 0) ? (
              <span>Informe o valor anual para distribuir.</span>
            ) : fechou ? (
              <span className={m.fechou}>
                <CheckCircle2 size={15} /> Fechou o valor anual
              </span>
            ) : dif > 0 ? (
              <span>Faltam <b>{formatBRL(dif)}</b></span>
            ) : (
              <span>Passou <b>{formatBRL(-dif)}</b></span>
            )}
          </div>
        </section>
      </form>
    </Modal>
  )
}

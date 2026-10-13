import { useEffect, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { Wallet } from 'lucide-react'
import { Modal } from '@/features/common/Modal'
import { Field } from '@/features/common/Field'
import { StatusToggle } from '@/features/common/StatusToggle'
import { MoneyInput } from '@/features/common/MoneyInput'
import ui from '@/features/common/ui.module.css'
import { useEmpresasQuery } from '@/features/cadastros/hooks'
import { listCategoriasCusto, listFornecedores } from '@/features/cadastros/api'
import { usePlanoContas } from '@/features/planoContas/store'
import { useUsuarios } from '@/features/usuarios/store'
import { formatCpfCnpj } from '@/lib/format'
import { CadastroBusca } from '@/features/camposOperacao/CadastroBusca'
import { empresaPadrao } from '@/features/unidades/types'
import { custoFixoSchema, emptyCustoFixo, type CustoFixoForm } from './custo-fixo-schema'
import { DATA_FIM_SEM_PRAZO, TIPOS_CUSTO_FIXO, type CustoFixo } from './types'
import { RateioEmpresas } from './RateioEmpresas'
import { conferirRateio } from './regras'
import { confirmar } from '@/features/common/dialogo/dialogo'

const dataBR = (iso: string) => iso.split('-').reverse().join('/')

interface Props {
  open: boolean
  initial?: CustoFixo | null
  error?: string | null
  onClose: () => void
  onSave: (data: CustoFixoForm) => void
}

/** Prefixo dos funcionários no combo de fornecedor (salário, pró-labore, reembolso...). */
const FUNC = 'func-'
const ID_RATEIO = 'custo-fixo-rateio'

export function CustoFixoFormModal({ open, initial, error, onClose, onSave }: Props) {
  const { analiticas } = usePlanoContas()
  const { data: empresasData, isLoading: carregandoEmpresas } = useEmpresasQuery()
  const empresasAtivas = (empresasData ?? []).filter((u) => u.status === 'ativo')
  const semEmpresa = !carregandoEmpresas && empresasAtivas.length === 0

  const { data: categoriasData } = useQuery({ queryKey: ['categorias-custo'], queryFn: listCategoriasCusto })
  const categorias = (categoriasData ?? []).filter((c) => c.status === 'ativo')
  const { data: fornecedoresData } = useQuery({ queryKey: ['fornecedores'], queryFn: listFornecedores })
  const fornecedores = (fornecedoresData ?? []).filter((f) => f.status === 'ativo')
  const { usuarios } = useUsuarios()
  const funcionarios = usuarios.filter((u) => u.status === 'ativo')
  // Só contas de Despesa (raiz 2) e analíticas: é isso que uma despesa classifica.
  const contasDespesa = analiticas().filter((c) => c.grupoDre === 'Despesa' && c.status === 'ativo')

  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<CustoFixoForm>({
    resolver: zodResolver(custoFixoSchema),
    defaultValues: emptyCustoFixo,
  })

  const ativo = useWatch({ control, name: 'status' }) !== 'inativo'
  const valor = useWatch({ control, name: 'valorMensal' }) ?? 0
  const tipo = useWatch({ control, name: 'tipo' })
  const recorrente = tipo === 'recorrente'
  const ajudaTipo = TIPOS_CUSTO_FIXO.find((t) => t.valor === tipo)?.ajuda ?? ''

  const [avisoRateio, setAvisoRateio] = useState<string | null>(null)
  useEffect(() => {
    if (!open) return
    reset(
        initial
          ? { ...emptyCustoFixo, ...initial, planoContaId: initial.planoContaId ?? '', diaVencimento: initial.diaVencimento ?? 0, rateio: initial.rateio ?? [] }
          : emptyCustoFixo,
      )
  }, [open, initial, reset])

  const rateio = useWatch({ control, name: 'rateio' }) ?? []
  // Trocar quem paga com o rateio ligado: a nova pagadora entra na grade (com 0%, para a pessoa ajustar).
  const trocarPagadora = (empresaId: string) => {
    setValue('unidadeId', empresaId, { shouldValidate: true })
    if (rateio.length > 0 && empresaId && !rateio.some((r) => r.empresaId === empresaId))
      setValue('rateio', [...rateio, { empresaId, percentual: 0 }], { shouldValidate: true })
  }

  // Novo registro: pré-seleciona a empresa padrão (ou a primeira ativa) assim que a lista chegar.
  const unidadeSel = useWatch({ control, name: 'unidadeId' })
  useEffect(() => {
    if (!open || initial) return
    if (empresasAtivas.length && !empresasAtivas.some((u) => u.id === unidadeSel))
      setValue('unidadeId', (empresaPadrao(empresasAtivas) ?? empresasAtivas[0]).id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial, empresasAtivas.length, unidadeSel])

  const fornecedorSel = useWatch({ control, name: 'fornecedorId' })
  const categoriaSel = useWatch({ control, name: 'categoriaId' })
  const fornecedor = fornecedores.find((f) => f.id === fornecedorSel)
  const funcionario = fornecedorSel.startsWith(FUNC) ? funcionarios.find((u) => `${FUNC}${u.id}` === fornecedorSel) : undefined

  // Escolher o fornecedor puxa a conta do plano e o centro de custo cadastrados nele (pedido da homologação).
  const trocarFornecedor = (id: string) => {
    setValue('fornecedorId', id)
    const f = fornecedores.find((x) => x.id === id)
    if (!f) return
    if (f.planoContaId) setValue('planoContaId', f.planoContaId)
    if (f.centroCustoId && categorias.some((c) => c.id === f.centroCustoId)) setValue('categoriaId', f.centroCustoId, { shouldValidate: true })
  }
  // Trocar a categoria sugere a conta padrão dela (quando o fornecedor não trouxe uma).
  const trocarCategoria = (categoriaId: string) => {
    setValue('categoriaId', categoriaId, { shouldValidate: true })
    const c = categorias.find((x) => x.id === categoriaId)?.planoContaId
    if (c && !fornecedor?.planoContaId) setValue('planoContaId', c)
  }

  // Rateio que não fecha: diz o motivo na faixa de erro do modal e rola até o rateio (antes o
  // salvar só não acontecia, sem aviso).
  const naoSalvou = () => {
    const motivo = conferirRateio(getValues('rateio'), getValues('unidadeId'))
    setAvisoRateio(motivo ? `Não dá para salvar: ${motivo}` : null)
    if (motivo) document.getElementById(ID_RATEIO)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }
  const fechar = () => {
    setAvisoRateio(null)
    onClose()
  }

  // Recorrente sem término: grava a data "sem prazo" (31/12/9999) para o campo nunca ficar vazio
  // (exportação para planilha, filtros), mas só depois de a pessoa confirmar.
  const submit = handleSubmit(async (data) => {
    setAvisoRateio(null)
    if (data.tipo === 'recorrente' && !data.dataFim) {
      const ok = await confirmar({
        titulo: 'Despesa sem data de término',
        mensagem: `A data de término não foi preenchida.\n\nA despesa será gravada sem prazo final, com término em ${dataBR(DATA_FIM_SEM_PRAZO)}. Deseja continuar?`,
        confirmar: 'Gravar sem prazo',
      })
      if (!ok) return
      onSave({ ...data, dataFim: DATA_FIM_SEM_PRAZO })
      return
    }
    onSave(data)
  }, naoSalvou)

  return (
    <Modal
      open={open}
      onClose={fechar}
      title="Despesa Fixa (DF)"
      subtitle={initial ? 'Editar registro' : 'Novo registro'}
      icon={<Wallet />}
      maxWidth={760}
      error={error ?? avisoRateio}
      footer={
        <>
          <button type="button" className={`${ui.btn} ${ui.btnGhost}`} onClick={fechar}>
            Cancelar
          </button>
          <button type="submit" form="custoForm" className={`${ui.btn} ${ui.btnPrimary}`}>
            Salvar custo
          </button>
        </>
      }
    >
      <form id="custoForm" onSubmit={submit} noValidate>
        <div className={ui.topRow}>
          <span className={ui.modalNote}>{ajudaTipo}</span>
          <StatusToggle value={ativo} onChange={(v) => setValue('status', v ? 'ativo' : 'inativo')} />
        </div>

        <section className={ui.fsection}>
          <div className={ui.fsectionTitle}>
            Quem cobra <span className={ui.fsectionHint}>fornecedor ou funcionário; o cadastro dele preenche conta e centro de custo</span>
          </div>
          <div className={ui.grid}>
            <Field className={ui.col2} label="Fornecedor / funcionário" hint="Digite o nome ou o CNPJ/CPF e escolha da lista (↓ ↑ e Enter também funcionam).">
              <CadastroBusca
                opcoes={[
                  ...fornecedores.map((f) => ({ id: f.id, nome: f.nomeFantasia || f.nome, doc: f.cpfCnpj })),
                  ...funcionarios.map((u) => ({ id: `${FUNC}${u.id}`, nome: `${u.nome} (funcionário)`, doc: u.cpf })),
                ]}
                value={fornecedorSel}
                onChange={trocarFornecedor}
                placeholder="Nome, CNPJ ou CPF"
              />
            </Field>
            <Field label="CNPJ / CPF">
              <input value={fornecedor?.cpfCnpj ? formatCpfCnpj(fornecedor.cpfCnpj) : funcionario?.cpf ? formatCpfCnpj(funcionario.cpf) : '—'} readOnly />
            </Field>
            <Field label="Razão social">
              <input value={fornecedor ? fornecedor.nome : funcionario ? funcionario.cargo || 'Funcionário' : '—'} readOnly title={fornecedor?.nome} />
            </Field>
            <Field
              className={ui.col2}
              label="Empresa que paga"
              req
              hint="Recebe a cobrança e paga a conta inteira. Para dividir o custo com outras empresas, use o rateio abaixo."
              error={
                errors.unidadeId?.message ??
                (semEmpresa ? 'Nenhuma empresa ativa. Cadastre uma empresa primeiro.' : undefined)
              }
            >
              <select value={unidadeSel} onChange={(e) => trocarPagadora(e.target.value)} disabled={semEmpresa}>
                <option value="" disabled>
                  {carregandoEmpresas ? 'Carregando...' : 'Selecione'}
                </option>
                {empresasAtivas.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nome}
                  </option>
                ))}
              </select>
            </Field>
            <Field
              className={ui.col2}
              label="Centro de custo"
              req
              hint="Setor que absorve a despesa. Vem do fornecedor quando cadastrado; senão, sugere a conta do plano."
              error={errors.categoriaId?.message}
            >
              <select value={categoriaSel} onChange={(e) => trocarCategoria(e.target.value)}>
                <option value="">Selecione</option>
                {categorias.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </section>

        <section className={ui.fsection}>
          <div className={ui.grid}>
            <Field className={ui.col4} label="Descrição" req error={errors.descricao?.message}>
              <input {...register('descricao')} placeholder="Ex.: Pro Labore" />
            </Field>
            <Field className={ui.col2} label="Valor mensal (R$)" req error={errors.valorMensal?.message}>
              <MoneyInput
                value={valor}
                onChange={(n) => setValue('valorMensal', n, { shouldValidate: true })}
                invalid={!!errors.valorMensal}
              />
            </Field>
            <Field className={ui.col2} label="Plano de contas" hint="Só contas de Despesa. Vem do cadastro do fornecedor quando ele tem uma.">
              <select {...register('planoContaId')}>
                <option value="">Nenhuma</option>
                {contasDespesa.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.codigo} · {p.nome}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </section>

        <div id={ID_RATEIO}>
          <RateioEmpresas
            rateio={rateio}
            onChange={(r) => {
              setValue('rateio', r, { shouldValidate: true })
              // Corrigiu? O aviso do salvar some junto.
              if (avisoRateio && !conferirRateio(r, getValues('unidadeId'))) setAvisoRateio(null)
            }}
            pagadoraId={unidadeSel}
            empresas={empresasAtivas.map((e) => ({ id: e.id, nome: e.nome }))}
            valorMensal={valor}
          />
        </div>

        <section className={ui.fsection}>
          <div className={ui.fsectionTitle}>
            Recorrência <span className={ui.fsectionHint}>define se a despesa é projetada</span>
          </div>
          <div className={ui.grid}>
            <Field
              className={ui.col2}
              label="Tipo"
              req
              hint="Recorrente repete todo mês e entra na base do markup. Spot é despesa única e fica fora do cálculo do preço."
            >
              <select {...register('tipo')}>
                {TIPOS_CUSTO_FIXO.map((t) => (
                  <option key={t.valor} value={t.valor}>
                    {t.label}
                  </option>
                ))}
              </select>
            </Field>
            {recorrente && (
              <>
                <Field label="Início">
                  <input type="date" {...register('dataInicio')} />
                </Field>
                <Field label="Término" error={errors.dataFim?.message}>
                  <input type="date" {...register('dataFim')} />
                </Field>
              </>
            )}
            <Field
              label="Dia de vencimento"
              hint="Dia do mês em que a conta vence (1 a 31). Mês mais curto vence no último dia. Em branco = não informado."
              error={errors.diaVencimento?.message}
            >
              <input
                type="number"
                min={1}
                max={31}
                inputMode="numeric"
                placeholder="Ex.: 10"
                {...register('diaVencimento', { setValueAs: (v) => (v === '' || v == null ? 0 : Number(v)) })}
              />
            </Field>
          </div>
        </section>
      </form>
    </Modal>
  )
}

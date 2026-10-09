import { useEffect, useState, type ReactNode } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { Modal } from '@/features/common/Modal'
import { Field } from '@/features/common/Field'
import { StatusToggle } from '@/features/common/StatusToggle'
import { CidadeAutocomplete } from '@/features/common/CidadeAutocomplete'
import ui from '@/features/common/ui.module.css'
import { formatCpfCnpj } from '@/lib/format'
import { Loader2 } from 'lucide-react'
import { mesclar } from '@/lib/mesclar'
import { listCategoriasCusto, listVendedores } from '@/features/cadastros/api'
import { usePlanoContas } from '@/features/planoContas/store'
import { parceiroSchema, emptyParceiro, type ParceiroForm } from './parceiro-schema'
import {
  FORMAS_PAGAMENTO,
  MOEDAS,
  PERFIS_NEGOCIO,
  PRAZOS_PAGAMENTO,
  SEGMENTOS,
  TIPOS_PESSOA,
  contatosDoParceiro,
  novoContato,
  type NaturezaCusto,
  type Parceiro,
  type PerfilNegocio,
  type TipoFornecimento,
} from './types'
import { ContatosEditor } from './ContatosEditor'
import { DadosBancariosFields } from './DadosBancariosFields'
import { PaisAutocomplete } from '@/features/common/PaisAutocomplete'
import { paisPorNome } from '@/lib/paises'
import { getErrorMessage } from '@/lib/api'
import { consultarCnpj, resumoCnpj, type CepConsulta } from '@/features/common/consultas'
import { CampoCep } from '@/features/common/CampoCep'
import { AnexosTab } from '@/features/anexos/AnexosTab'
import s from './parceiros.module.css'

type Aba = 'dados' | 'contatos' | 'comercial' | 'banco' | 'documentos'

interface Props {
  open: boolean
  /** "Cliente" ou "Fornecedor" (título do modal). */
  titulo: string
  /** Muda os campos da aba comercial/financeira. */
  tipoParceiro: 'cliente' | 'fornecedor'
  icon: ReactNode
  initial?: Parceiro | null
  /** Nome já preenchido num cadastro novo (vindo da Precificação). */
  nomeInicial?: string
  /** Grupos econômicos já usados (sugestão no campo). */
  grupos?: string[]
  error?: string | null
  busy?: boolean
  onClose: () => void
  onSave: (data: ParceiroForm) => void
}

/** Formulário compartilhado por Clientes e Fornecedores (base igual, aba comercial diferente). */
export function ParceiroFormModal({
  open,
  titulo,
  tipoParceiro,
  icon,
  initial,
  nomeInicial = '',
  grupos = [],
  error,
  busy,
  onClose,
  onSave,
}: Props) {
  const ehCliente = tipoParceiro === 'cliente'
  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<ParceiroForm>({
    resolver: zodResolver(parceiroSchema),
    defaultValues: emptyParceiro,
  })
  const [aba, setAba] = useState<Aba>('dados')
  // Ao (re)abrir o modal, volta para a primeira aba (padrão "ajustar estado quando a prop muda").
  const [abriuEm, setAbriuEm] = useState(open)
  // CNPJ já consultado (ou o do cadastro aberto): sair do campo sem mudar o CNPJ não busca de novo.
  const [cnpjConsultado, setCnpjConsultado] = useState('')
  const [infoCnpj, setInfoCnpj] = useState<{ texto: string; alerta: boolean } | null>(null)
  if (open !== abriuEm) {
    setAbriuEm(open)
    if (open) {
      setAba('dados')
      setCnpjConsultado((initial?.cpfCnpj ?? '').replace(/\D/g, ''))
      setInfoCnpj(null)
    }
  }

  const ativo = useWatch({ control, name: 'status' }) !== 'inativo'
  const tipo = useWatch({ control, name: 'tipo' })
  const cpfCnpj = useWatch({ control, name: 'cpfCnpj' }) ?? ''
  const cidade = useWatch({ control, name: 'cidade' }) ?? ''
  const cep = useWatch({ control, name: 'endereco.cep' }) ?? ''
  const contatos = useWatch({ control, name: 'contatos' }) ?? []
  const banco = useWatch({ control, name: 'banco' }) ?? emptyParceiro.banco
  const segmento = useWatch({ control, name: 'segmento' }) ?? ''
  const perfil = useWatch({ control, name: 'perfil' }) ?? ''
  const centroCustoId = useWatch({ control, name: 'centroCustoId' }) ?? ''
  const planoContaId = useWatch({ control, name: 'planoContaId' }) ?? ''
  const tipoFornecimento = useWatch({ control, name: 'tipoFornecimento' }) ?? ''
  const naturezaCusto = useWatch({ control, name: 'naturezaCusto' }) ?? ''
  const vendedorSdrId = useWatch({ control, name: 'vendedorSdrId' }) ?? ''
  const vendedorSalesId = useWatch({ control, name: 'vendedorSalesId' }) ?? ''
  const vendedorCsId = useWatch({ control, name: 'vendedorCsId' }) ?? ''
  const formaPagamento = useWatch({ control, name: 'formaPagamento' }) ?? ''
  const prazoPagamentoDias = useWatch({ control, name: 'prazoPagamentoDias' }) ?? 0
  const externo = useWatch({ control, name: 'externo' }) ?? false
  const pais = useWatch({ control, name: 'pais' }) ?? ''
  const moeda = useWatch({ control, name: 'moeda' }) ?? ''
  const juridica = tipo === 'juridica'

  // ── Consulta pública: CNPJ (Receita) preenche o cadastro; CEP preenche o endereço ──
  const [buscandoCnpj, setBuscandoCnpj] = useState(false)
  // Ao sair do campo com os 14 números de um CNPJ novo: preenche com os dados da Receita.
  const buscarCnpj = async () => {
    const digitos = cpfCnpj.replace(/\D/g, '')
    if (!juridica || externo || digitos.length !== 14 || digitos === cnpjConsultado) return
    setCnpjConsultado(digitos)
    setBuscandoCnpj(true)
    setInfoCnpj(null)
    try {
      const c = await consultarCnpj(digitos)
      const v = getValues()
      setValue('nome', c.razaoSocial, { shouldValidate: true })
      setValue('nomeFantasia', c.nomeFantasia)
      setValue('endereco', { ...mesclar(emptyParceiro.endereco, v.endereco), cep: c.cep, logradouro: c.logradouro, numero: c.numero, complemento: c.complemento, bairro: c.bairro })
      if (c.cidade) setValue('cidade', c.cidade)
      // Telefone e e-mail da Receita entram no primeiro contato (sem apagar o que já tinha).
      if (c.telefone || c.email) {
        const lista = v.contatos ?? []
        if (lista.length === 0) setValue('contatos', [{ ...novoContato(), telefone: c.telefone, email: c.email }])
        else setValue('contatos', lista.map((ct, i) => (i === 0 ? { ...ct, telefone: ct.telefone || c.telefone, email: ct.email || c.email } : ct)))
      }
      setInfoCnpj({ texto: resumoCnpj(c), alerta: c.situacao.toLowerCase() !== 'ativa' })
    } catch (err) {
      setInfoCnpj({ texto: getErrorMessage(err).replace(/^Não foi possível salvar \(\d+\)\. /, ''), alerta: true })
      // Falhou: o próximo Tab tenta de novo.
      setCnpjConsultado('')
    } finally {
      setBuscandoCnpj(false)
    }
  }
  // CEP encontrado → rua, bairro e cidade (número e complemento ficam como estão: o CEP não sabe deles).
  const aplicarCep = (c: CepConsulta) => {
    const v = getValues()
    setValue('endereco', { ...mesclar(emptyParceiro.endereco, v.endereco), cep: c.cep, logradouro: c.logradouro || v.endereco?.logradouro || '', bairro: c.bairro || v.endereco?.bairro || '' })
    if (c.cidade) setValue('cidade', c.cidade)
  }

  // Cadastros de apoio das abas.
  const { data: categorias } = useQuery({ queryKey: ['categorias-custo'], queryFn: listCategoriasCusto })
  const { data: vendedores } = useQuery({ queryKey: ['vendedores'], queryFn: listVendedores, enabled: ehCliente })
  const { analiticas } = usePlanoContas()
  const centros = (categorias ?? []).filter((c) => c.status === 'ativo')
  const vendedoresAtivos = (vendedores ?? []).filter((v) => v.status === 'ativo')

  useEffect(() => {
    if (!open) return
    if (initial) {
      reset({
        ...emptyParceiro,
        ...initial,
        banco: mesclar(emptyParceiro.banco, initial.banco),
        endereco: {
          ...mesclar(emptyParceiro.endereco, initial.endereco),
          // Cadastro antigo do exterior tinha o endereço numa linha só: vira a rua do endereço novo.
          logradouro: initial.endereco?.logradouro || (initial.externo ? (initial.enderecoExterior ?? '') : ''),
        },
        contatos: contatosDoParceiro(initial),
        aprovadores: initial.aprovadores ?? [],
        limiteCompra: initial.limiteCompra ?? 0,
        perfil: initial.perfil ?? '',
        vendedorSdrId: initial.vendedorSdrId ?? '',
        vendedorSalesId: initial.vendedorSalesId ?? '',
        vendedorCsId: initial.vendedorCsId ?? '',
        tipoFornecimento: initial.tipoFornecimento ?? '',
        naturezaCusto: initial.naturezaCusto ?? '',
        planoContaId: initial.planoContaId ?? '',
        compradorId: initial.compradorId ?? '',
        segmento: initial.segmento ?? '',
        grupoEconomico: initial.grupoEconomico ?? '',
        centroCustoId: initial.centroCustoId ?? '',
        formaPagamento: initial.formaPagamento ?? '',
        prazoPagamentoDias: initial.prazoPagamentoDias ?? 0,
        externo: initial.externo ?? false,
        pais: initial.pais ?? '',
        taxId: initial.taxId ?? '',
        moeda: initial.moeda ?? '',
        enderecoExterior: initial.enderecoExterior ?? '',
        site: initial.site ?? '',
      })
    } else {
      reset({ ...emptyParceiro, nome: nomeInicial })
    }
  }, [open, initial, nomeInicial, reset])

  // O contato principal (legado) espelha o primeiro contato da lista.
  const submit = handleSubmit(
    (data) => {
      if (data.externo && !data.pais.trim()) {
        setAba('dados')
        return
      }
      const principal = data.contatos[0]
      const end = data.endereco
      onSave({
        ...data,
        contato: principal?.nome ?? '',
        telefone: principal?.telefone ?? '',
        email: principal?.email ?? '',
        // Exterior: o endereço também vai numa linha só (onde a tela mostra resumido).
        enderecoExterior: data.externo
          ? [end.logradouro, end.complemento, data.cidade, [end.estado, end.cep].filter(Boolean).join(' '), data.pais].filter((x) => x?.trim()).join(', ')
          : data.enderecoExterior,
      })
    },
    (errs) => {
      // Leva o usuário para a aba onde está o erro.
      if (errs.contatos) setAba('contatos')
      else setAba('dados')
    },
  )

  const errosEmailContatos: Record<number, string | undefined> = {}
  if (Array.isArray(errors.contatos))
    errors.contatos.forEach((e, i) => {
      if (e?.email?.message) errosEmailContatos[i] = e.email.message
    })
  const abaComErro: Aba | null = errors.contatos ? 'contatos' : errors.nome ? 'dados' : null

  const tabBtn = (id: Aba, label: string, badge?: number) => (
    <button
      type="button"
      className={`${s.tab} ${aba === id ? s.tabActive : ''} ${abaComErro === id ? s.tabErro : ''}`}
      onClick={() => setAba(id)}
    >
      {label}
      {badge !== undefined && badge > 0 && <span className={s.tabBadge}>{badge}</span>}
    </button>
  )

  const nomeVendedor = (v: { nome: string; tipoVendedor?: string }) => v.nome

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={titulo}
      subtitle={initial ? 'Editar registro' : 'Novo registro'}
      icon={icon}
      maxWidth={800}
      error={error}
      busy={busy}
      footer={
        <>
          <button type="button" className={`${ui.btn} ${ui.btnGhost}`} onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" form="parceiroForm" className={`${ui.btn} ${ui.btnPrimary}`}>
            {busy ? 'Salvando...' : 'Salvar'}
          </button>
        </>
      }
    >
      <form id="parceiroForm" onSubmit={submit} noValidate>
        <div className={ui.topRow}>
          <span className={ui.modalNote}>
            {ehCliente
              ? 'Dados usados nas propostas, no CRM e no envio de documentos.'
              : 'Dados usados no vínculo com as despesas e na classificação do plano de contas.'}
          </span>
          <StatusToggle value={ativo} onChange={(v) => setValue('status', v ? 'ativo' : 'inativo')} />
        </div>

        <div className={s.tabs}>
          {tabBtn('dados', 'Dados')}
          {tabBtn('contatos', 'Contatos', contatos.length)}
          {tabBtn('comercial', ehCliente ? 'Comercial' : 'Compras e financeiro')}
          {tabBtn('banco', 'Dados bancários')}
          {tabBtn('documentos', 'Documentos')}
        </div>

        {aba === 'dados' && (
          <section className={ui.fsection}>
            {!ehCliente && (
              <label className={`${ui.checkItem} ${s.externoCheck}`}>
                <input
                  type="checkbox"
                  checked={externo}
                  onChange={(e) => {
                    setValue('externo', e.target.checked)
                    if (e.target.checked) {
                      setValue('cpfCnpj', '')
                      setValue('inscricaoEstadual', '')
                      setValue('inscricaoMunicipal', '')
                      // Cidade do Brasil ("Campinas - SP") não vale para o exterior.
                      if (/ - [A-Z]{2}$/.test(cidade)) setValue('cidade', '')
                      if (!moeda) setValue('moeda', 'USD')
                    }
                  }}
                />
                Fornecedor do exterior (sem CNPJ)
              </label>
            )}
            <div className={ui.grid}>
              <Field className={ui.col2} label="Tipo" req>
                <select {...register('tipo')}>
                  {TIPOS_PESSOA.map((t) => (
                    <option key={t.valor} value={t.valor}>
                      {/* No exterior não existe "pessoa jurídica/física" (CNPJ/CPF): é empresa ou pessoa. */}
                      {externo ? (t.valor === 'juridica' ? 'Empresa' : 'Pessoa') : t.label}
                    </option>
                  ))}
                </select>
              </Field>
              {externo ? (
                <Field
                  className={ui.col2}
                  label="Identificação fiscal"
                  hint="Número fiscal no país de origem: Tax ID ou EIN (EUA), VAT (Europa), CUIT (Argentina), RUT (Chile)."
                >
                  <input {...register('taxId')} placeholder="Ex.: EIN 12-3456789" />
                </Field>
              ) : (
                <Field
                  className={ui.col2}
                  label={juridica ? 'CNPJ' : 'CPF'}
                  hint={juridica ? 'Digite os 14 números e saia do campo (Tab): razão social, fantasia, endereço, telefone e e-mail vêm da Receita Federal (base aberta). Inscrição estadual não vem.' : undefined}
                >
                  <div className={ui.comLoader}>
                    <input
                      value={cpfCnpj}
                      onChange={(e) => setValue('cpfCnpj', formatCpfCnpj(e.target.value))}
                      onBlur={buscarCnpj}
                      placeholder={juridica ? '00.000.000/0000-00' : '000.000.000-00'}
                      inputMode="numeric"
                      maxLength={18}
                      aria-busy={buscandoCnpj}
                    />
                    {buscandoCnpj && <Loader2 className={ui.loaderCampo} aria-label="Consultando a Receita Federal" />}
                  </div>
                  {!buscandoCnpj && infoCnpj && <span className={infoCnpj.alerta ? ui.errMsg : ui.okMsg} style={{ fontSize: 12 }}>{infoCnpj.texto}</span>}
                </Field>
              )}
              <Field
                className={ui.col2}
                label={externo ? (juridica ? 'Nome legal da empresa' : 'Nome completo') : juridica ? 'Razão social' : 'Nome'}
                req
                error={errors.nome?.message}
                hint={externo && juridica ? 'Como aparece na invoice (legal name), com o tipo de sociedade: Inc., LLC, Ltd., PBC, GmbH...' : undefined}
              >
                <input {...register('nome')} placeholder={externo ? (juridica ? 'Ex.: Anthropic, PBC' : 'Ex.: John Smith') : juridica ? 'Ex.: Alfa Serviços Ltda' : 'Ex.: João da Silva'} />
              </Field>
              <Field className={ui.col2} label={externo ? 'Nome comercial' : 'Nome fantasia'}>
                <input {...register('nomeFantasia')} placeholder={externo ? 'Ex.: Anthropic' : 'Como é conhecido'} />
              </Field>
              {juridica && !externo && (
                <>
                  <Field className={ui.col2} label="Inscrição estadual">
                    <input {...register('inscricaoEstadual')} placeholder="Isento, se não houver" />
                  </Field>
                  <Field className={ui.col2} label="Inscrição municipal">
                    <input {...register('inscricaoMunicipal')} />
                  </Field>
                </>
              )}
              {externo ? (
                <>
                  <Field className={ui.col2} label="País" req hint="Digite o nome, o código (US) ou o DDI (+44) e escolha na lista. A moeda e o DDI dos contatos vêm do país.">
                    <PaisAutocomplete
                      value={pais}
                      invalid={!pais.trim()}
                      onChange={(nome, dados) => {
                        setValue('pais', nome)
                        if (dados?.moeda) setValue('moeda', dados.moeda)
                      }}
                    />
                  </Field>
                  <Field className={ui.col2} label="Moeda de cobrança" hint="Moeda em que este fornecedor cobra. A despesa fixa continua lançada em reais, pelo valor convertido.">
                    <select value={moeda} onChange={(e) => setValue('moeda', e.target.value)}>
                      <option value="">Não informada</option>
                      {[...new Set([...MOEDAS, moeda].filter(Boolean))].map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field className={ui.col4} label="Endereço" hint="Rua e número, no formato do país (ex.: 548 Market Street).">
                    <input {...register('endereco.logradouro')} placeholder="Ex.: 548 Market Street" />
                  </Field>
                  <Field className={ui.col2} label="Complemento">
                    <input {...register('endereco.complemento')} placeholder="Suite, floor, unit..." />
                  </Field>
                  <Field className={ui.col2} label="Cidade">
                    <input value={cidade} onChange={(e) => setValue('cidade', e.target.value)} placeholder="Ex.: San Francisco" />
                  </Field>
                  <Field className={ui.col2} label="Estado / província">
                    <input {...register('endereco.estado')} placeholder="Ex.: CA, Ontario, Bavaria" />
                  </Field>
                  <Field className={ui.col2} label="Código postal" hint="ZIP code, postcode... cada país tem o seu formato.">
                    <input {...register('endereco.cep')} placeholder="Ex.: 94104" maxLength={12} />
                  </Field>
                  <Field className={ui.col2} label="Site">
                    <input {...register('site')} placeholder="https://" />
                  </Field>
                </>
              ) : (
                <>
                  <Field label="CEP" hint="Com os 8 números, rua, bairro e cidade são preenchidos sozinhos.">
                    <CampoCep value={cep} onChange={(v) => setValue('endereco.cep', v)} onEncontrado={aplicarCep} />
                  </Field>
                  <Field className={ui.col2} label="Endereço">
                    <input {...register('endereco.logradouro')} placeholder="Rua, avenida..." />
                  </Field>
                  <Field label="Número">
                    <input {...register('endereco.numero')} placeholder="Ex.: 45" />
                  </Field>
                  <Field label="Complemento">
                    <input {...register('endereco.complemento')} placeholder="Sala, bloco..." />
                  </Field>
                  <Field label="Bairro">
                    <input {...register('endereco.bairro')} />
                  </Field>
                  <Field className={ui.col2} label="Cidade">
                    <CidadeAutocomplete value={cidade} onChange={(v) => setValue('cidade', v)} placeholder="Digite e escolha a cidade" />
                  </Field>
                </>
              )}
              {externo && !pais.trim() && <div className={`${ui.col4} ${ui.errMsg}`}>Informe o país do fornecedor.</div>}
              <Field className={ui.col2} label="Segmento">
                <select value={segmento} onChange={(e) => setValue('segmento', e.target.value)}>
                  <option value="">Não informado</option>
                  {SEGMENTOS.map((sg) => (
                    <option key={sg} value={sg}>
                      {sg}
                    </option>
                  ))}
                </select>
              </Field>
              <Field
                className={ui.col2}
                label="Grupo econômico"
                hint="Empresas com o mesmo nome de grupo ficam vinculadas (ex.: matriz e filiais do cliente)."
              >
                <input {...register('grupoEconomico')} list="grupos-economicos" placeholder="Ex.: Grupo Alfa" />
                <datalist id="grupos-economicos">
                  {grupos.map((g) => (
                    <option key={g} value={g} />
                  ))}
                </datalist>
              </Field>
              <Field className={ui.col2} label="Centro de custo" hint="Setor interno responsável por este cadastro.">
                <select value={centroCustoId} onChange={(e) => setValue('centroCustoId', e.target.value)}>
                  <option value="">Não informado</option>
                  {centros.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome}
                    </option>
                  ))}
                </select>
              </Field>
              <Field className={ui.col4} label="Observação">
                <input {...register('observacao')} placeholder="Anotações internas" />
              </Field>
            </div>
          </section>
        )}

        {aba === 'contatos' && (
          <section className={ui.fsection}>
            <div className={ui.fsectionTitle}>
              Contatos <span className={ui.fsectionHint}>o primeiro é o contato principal</span>
            </div>
            <ContatosEditor
              value={contatos}
              onChange={(v) => setValue('contatos', v, { shouldValidate: !!errors.contatos })}
              cliente={ehCliente}
              errosEmail={errosEmailContatos}
              ddi={externo ? (paisPorNome(pais)?.ddi ?? '') : undefined}
            />
          </section>
        )}

        {aba === 'comercial' && ehCliente && (
          <section className={ui.fsection}>
            <div className={ui.grid}>
              <Field className={ui.col2} label="Perfil" hint="B2B vende para empresas, B2C para pessoas, B2G para governo.">
                <select value={perfil} onChange={(e) => setValue('perfil', e.target.value as PerfilNegocio)}>
                  <option value="">Não informado</option>
                  {PERFIS_NEGOCIO.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </Field>
              <Field className={ui.col2} label="Forma de pagamento" hint="Vai preenchida para a proposta e o CRM. Na proposta só muda com a permissão especial.">
                <select value={formaPagamento} onChange={(e) => setValue('formaPagamento', e.target.value)}>
                  <option value="">Não combinada</option>
                  {FORMAS_PAGAMENTO.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              </Field>
              <Field className={ui.col2} label="Prazo de pagamento (dias)" error={errors.prazoPagamentoDias?.message} hint="0 = à vista. Aceita qualquer número; os atalhos são os prazos mais usados.">
                <input
                  type="number"
                  min={0}
                  value={prazoPagamentoDias}
                  onChange={(e) => setValue('prazoPagamentoDias', Math.max(0, Math.trunc(Number(e.target.value) || 0)))}
                  list="prazos-pagamento"
                />
                <datalist id="prazos-pagamento">
                  {PRAZOS_PAGAMENTO.map((p) => (
                    <option key={p} value={p} />
                  ))}
                </datalist>
              </Field>
              <div className={ui.col2} />
              <div className={ui.col4}>
                <div className={ui.fsectionTitle}>
                  Vendedores <span className={ui.fsectionHint}>a mesma pessoa pode ocupar as três funções</span>
                </div>
              </div>
              {(
                [
                  ['vendedorSdrId', 'SDR (pré-venda)', vendedorSdrId],
                  ['vendedorSalesId', 'Sales (fechamento)', vendedorSalesId],
                  ['vendedorCsId', 'CS (pós-venda)', vendedorCsId],
                ] as const
              ).map(([campo, label, valor]) => (
                <Field key={campo} className={ui.col2} label={label}>
                  <select value={valor} onChange={(e) => setValue(campo, e.target.value)}>
                    <option value="">Não definido</option>
                    {vendedoresAtivos.map((v) => (
                      <option key={v.id} value={v.id}>
                        {nomeVendedor(v)}
                      </option>
                    ))}
                  </select>
                </Field>
              ))}
              {vendedoresAtivos.length === 0 && (
                <div className={`${ui.col4} ${ui.modalNote}`}>Cadastre vendedores em Cadastros &gt; Vendedores.</div>
              )}
            </div>
          </section>
        )}

        {aba === 'comercial' && !ehCliente && (
          <section className={ui.fsection}>
            <div className={ui.grid}>
              <Field className={ui.col2} label="Fornece">
                <select value={tipoFornecimento} onChange={(e) => setValue('tipoFornecimento', e.target.value as TipoFornecimento)}>
                  <option value="">Não informado</option>
                  <option value="produto">Produto</option>
                  <option value="servico">Serviço</option>
                </select>
              </Field>
              <Field className={ui.col2} label="Natureza do custo" hint="Fixo: recorrente e independente do volume. Variável: acompanha a operação.">
                <select value={naturezaCusto} onChange={(e) => setValue('naturezaCusto', e.target.value as NaturezaCusto)}>
                  <option value="">Não informado</option>
                  <option value="fixo">Fixo</option>
                  <option value="variavel">Variável</option>
                </select>
              </Field>
              <Field
                className={ui.col4}
                label="Conta do plano de contas"
                hint="As despesas deste fornecedor entram automaticamente nesta conta."
              >
                <select value={planoContaId} onChange={(e) => setValue('planoContaId', e.target.value)}>
                  <option value="">Não definida</option>
                  {analiticas().map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.codigo} · {c.nome}
                    </option>
                  ))}
                </select>
              </Field>
              <div className={`${ui.col4} ${ui.modalNote}`}>
                Limite de compra por comprador e aprovadores ficam em <b>Parametrizações &gt; Aprovadores e Regras</b> (Regra de
                Compras), onde este fornecedor pode entrar como exceção.
              </div>
            </div>
          </section>
        )}

        {aba === 'banco' && (
          <section className={ui.fsection}>
            <DadosBancariosFields value={banco} onChange={(v) => setValue('banco', v)} internacional={externo} />
          </section>
        )}

        {aba === 'documentos' && (
          <section className={ui.fsection}>
            <div className={ui.fsectionTitle}>
              Documentos <span className={ui.fsectionHint}>contratos, certidões, propostas assinadas</span>
            </div>
            <AnexosTab entidade={tipoParceiro} entidadeId={initial?.id ?? ''} />
          </section>
        )}
      </form>
    </Modal>
  )
}

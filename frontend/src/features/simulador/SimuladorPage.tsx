import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  Calculator,
  Receipt,
  Plus,
  X,
  FileText,
  Trash2,
  Pencil,
  RotateCcw,
  ShieldCheck,
  AlertTriangle,
  UserPlus,
  Undo2,
  Check,
} from 'lucide-react'
import ui from '@/features/common/ui.module.css'
import { PageHeader } from '@/features/common/PageHeader'
import { MoneyInput } from '@/features/common/MoneyInput'
import { PercentInput } from '@/features/common/PercentInput'
import { Hint } from '@/features/common/Hint'
import { formatBRL, formatPct, formatNumberBRL } from '@/lib/format'
import { getErrorMessage } from '@/lib/api'
import { avisar } from '@/features/common/dialogo/dialogo'
import { useQuery } from '@tanstack/react-query'
import { nomeUnidade } from '@/features/unidades/mock'
import { aliquotaSeguro } from '@/features/taxas/mock'
import { useCustosFixosQuery, useEmpresasQuery, useTaxasQuery } from '@/features/cadastros/hooks'
import { empresaPadrao } from '@/features/unidades/types'
import {
  listClientes,
  listServicos,
  listTiposCusto,
  listValidades,
  listVendedores,
  type BasePercentualCusto,
  type ModoCusto,
} from '@/features/cadastros/api'
import { usePropostas } from '@/features/propostas/store'
import { useModelosProposta } from '@/features/modelosProposta/store'
import type { CustoItemProposta, ItemProposta } from '@/features/propostas/types'
import { useFator, usePrecoServidor } from '@/features/pricing/usePreco'
import { useAuth } from '@/features/auth/auth-context'
import { temPoderDeGestor } from '@/features/usuarios/types'
import { useUsuarios } from '@/features/usuarios/store'
import { ClienteAutocomplete } from '@/features/parceiros/ClienteAutocomplete'
import { FORMAS_PAGAMENTO, type Parceiro } from '@/features/parceiros/types'
import { bloqueioDeRegiao, descreverRegiao } from '@/features/parceiros/regiao'
import {
  precoVenda,
  precoVendaComCustoPercentual,
  margem,
  precoParaMargem,
  markup,
  fator as calcFator,
  seguroAdValorem,
  cotacaoFiscal,
  FORMAS_COBRANCA,
  type FormaCobranca,
} from '@/features/pricing/engine'
import s from './simulador.module.css'

const fator4 = (n: number) =>
  n.toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 })
const round2 = (n: number) => Math.round(n * 100) / 100

/** Uma linha de custo da operação: tipo do cadastro + o valor desta operação. */
interface CustoExtra {
  id: string
  tipoId: string
  label: string
  modo: ModoCusto
  base: BasePercentualCusto
  /** Fração quando percentual (0,02 = 2%). */
  percentual: number
  /** Reais quando modo = valor. */
  valor: number
  /** Valor pré-cadastrado no tipo (para saber se o usuário alterou). */
  valorPre: number
}

export function SimuladorPage() {
  const navigate = useNavigate()
  // Vindo do CRM ("Gerar proposta" no card): ?cliente=... pré-preenche o cliente.
  const [searchParams] = useSearchParams()
  const { propostas, criarProposta, atualizarProposta } = usePropostas()
  // Vindo de Propostas ("Editar"): ?proposta=<id> reabre um rascunho aqui.
  const propostaParam = searchParams.get('proposta') ?? ''
  const [propostaEditandoId, setPropostaEditandoId] = useState('')
  const [carregouProposta, setCarregouProposta] = useState('')
  // O preço negociado só "vale" depois de "Usar este preço"; até lá fica em edição.
  const [editandoPreco, setEditandoPreco] = useState(false)
  // Só modelos ativos entram na escolha (inativos ficam para as propostas antigas).
  const { ativos: modelos } = useModelosProposta()
  const [modeloId, setModeloId] = useState('')
  // Empresas/taxas/custos vêm do react-query (re-renderiza quando os dados chegam).
  const { data: empresasData, isLoading: carregandoEmpresas } = useEmpresasQuery()
  useTaxasQuery()
  useCustosFixosQuery()
  const unidades = (empresasData ?? []).filter((u) => u.status === 'ativo')

  const { user } = useAuth()
  const ehGestor = temPoderDeGestor(user?.perfil)
  const perms = user?.permissoes ?? []
  // Permissões especiais (desligadas por padrão para todo mundo, inclusive gestor).
  const podeVerCalculo = perms.includes('/simulador/calculo')
  const podeAlterarValorCusto = perms.includes('/cadastros/tipos-custo/alterar-valor')
  const podeAlterarPagamento = perms.includes('/propostas/alterar-pagamento')

  const [unidadeId, setUnidadeId] = useState('')
  // Os custos entram só pelos tipos cadastrados (não existe "custo base" fixo).
  const [custosExtras, setCustosExtras] = useState<CustoExtra[]>([])
  // Marcam que o usuário tentou avançar: a partir daí os campos que faltam ficam em vermelho.
  const [tentouAdicionar, setTentouAdicionar] = useState(false)
  const [tentouGerar, setTentouGerar] = useState(false)
  const [desconto, setDesconto] = useState(0)
  const [valorNf, setValorNf] = useState(0)
  const [aplicaIcms, setAplicaIcms] = useState(false)
  const [ufOrigem, setUfOrigem] = useState('sp')
  const [ufDestino, setUfDestino] = useState('sp')
  // NFS-e é o documento mais usado pelo cliente; as outras formas continuam disponíveis.
  const [forma, setForma] = useState<FormaCobranca>('nfse')
  const [servicoId, setServicoId] = useState('')
  // null = usa o preço calculado; número = preço negociado com o cliente.
  const [precoEditado, setPrecoEditado] = useState<number | null>(null)
  const [justificativa, setJustificativa] = useState('')
  const [descricaoItem, setDescricaoItem] = useState('')
  const [itens, setItens] = useState<ItemProposta[]>([])
  const [prazoEntrega, setPrazoEntrega] = useState('')
  const [validadeId, setValidadeId] = useState('')
  const [gerando, setGerando] = useState(false)

  // ── Cliente: só do cadastro (a região do vendedor e o pagamento dependem dele) ──
  const { data: clientesData } = useQuery({ queryKey: ['clientes'], queryFn: listClientes })
  const clientes = (clientesData ?? []).filter((c) => c.status === 'ativo')
  const [clienteTexto, setClienteTexto] = useState(() => searchParams.get('cliente') ?? '')
  const [clienteId, setClienteId] = useState('')
  // Nome vindo do CRM casa com o cadastro sem precisar escolher de novo.
  const clienteAtual: Parceiro | undefined =
    clientes.find((c) => c.id === clienteId) ??
    (!clienteId && clienteTexto
      ? clientes.find((c) => c.nome === clienteTexto || c.nomeFantasia === clienteTexto)
      : undefined)
  const escolherCliente = (c: Parceiro) => {
    setClienteId(c.id)
    setClienteTexto(c.nomeFantasia || c.nome)
    setPagamentoEditado(null)
  }
  const digitarCliente = (texto: string) => {
    setClienteTexto(texto)
    if (clienteId) setClienteId('')
  }

  // Forma e prazo de pagamento vêm do cadastro do cliente; só mudam com a permissão.
  const [pagamentoEditado, setPagamentoEditado] = useState<{ forma: string; prazo: number } | null>(
    null,
  )
  const formaPagamento = pagamentoEditado?.forma ?? clienteAtual?.formaPagamento ?? ''
  const prazoPagamento = pagamentoEditado?.prazo ?? clienteAtual?.prazoPagamentoDias ?? 0

  // ── Vendedor: o usuário logado, pelo elo Vendedor → Funcionário ──────────────
  const { usuarios } = useUsuarios()
  const meuUsuarioId = usuarios.find((u) => u.email === user?.email)?.id ?? ''
  const { data: vendedoresData } = useQuery({ queryKey: ['vendedores'], queryFn: listVendedores })
  const vendedores = (vendedoresData ?? []).filter((v) => v.status === 'ativo')
  const meuVendedor = vendedores.find((v) => v.usuarioId && v.usuarioId === meuUsuarioId)
  const [vendedorEscolhido, setVendedorEscolhido] = useState('')
  const vendedorId = vendedorEscolhido || meuVendedor?.id || ''
  const vendedorSel = vendedores.find((v) => v.id === vendedorId)

  // Cadastros de apoio (serviços, tipos de custo e validades pré-cadastrados).
  const { data: servicosData } = useQuery({ queryKey: ['servicos'], queryFn: listServicos })
  const { data: tiposCustoData } = useQuery({ queryKey: ['tipos-custo'], queryFn: listTiposCusto })
  const { data: validadesData } = useQuery({
    queryKey: ['validades-proposta'],
    queryFn: listValidades,
  })
  const servicos = (servicosData ?? []).filter((x) => x.status === 'ativo')
  const tiposCusto = (tiposCustoData ?? []).filter((x) => x.status === 'ativo')
  const validades = (validadesData ?? []).filter((x) => x.status === 'ativo')

  // Reabre a proposta em rascunho: itens, cliente, vendedor e condições voltam para a tela.
  useEffect(() => {
    if (!propostaParam || carregouProposta === propostaParam) return
    const p = propostas.find((x) => x.id === propostaParam)
    if (!p || clientes.length === 0) return
    /* eslint-disable react-hooks/set-state-in-effect */
    setCarregouProposta(propostaParam)
    if (p.status !== 'rascunho') {
      void avisar({ titulo: 'Proposta não editável', mensagem: `A proposta ${p.numero} está "${p.status}" e não pode ser editada. Só rascunho é editável.` })
      navigate('/propostas', { replace: true })
      return
    }
    setPropostaEditandoId(p.id)
    // Propostas antigas podem vir sem serviço/custos: o servidor exige as listas presentes.
    setItens(p.itens.map((it) => ({ ...it, servicoId: it.servicoId ?? '', custos: it.custos ?? [] })))
    const c = clientes.find((x) => x.id === p.clienteId)
    if (c) {
      setClienteId(c.id)
      setClienteTexto(c.nomeFantasia || c.nome)
    } else setClienteTexto(p.cliente)
    if (p.vendedorId) setVendedorEscolhido(p.vendedorId)
    setPrazoEntrega(p.prazoEntrega ?? '')
    setValidadeId(validades.find((v) => v.descricao === p.validade)?.id ?? '')
    if (p.modeloId) setModeloId(p.modeloId)
    if (p.formaPagamento || p.prazoPagamentoDias)
      setPagamentoEditado({ forma: p.formaPagamento ?? '', prazo: p.prazoPagamentoDias ?? 0 })
    setJustificativa(p.justificativa ?? '')
    /* eslint-enable react-hooks/set-state-in-effect */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propostaParam, propostas, clientes.length, validades.length])

  // Seleciona a empresa padrão (ou a primeira ativa) quando a lista chega ou quando a atual sai da lista.
  useEffect(() => {
    if (unidades.length && !unidades.some((u) => u.id === unidadeId)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setUnidadeId((empresaPadrao(unidades) ?? unidades[0]).id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unidades.map((u) => u.id).join(','), unidadeId])

  // Fator da empresa pelo motor do servidor (custos fixos, meta, impostos, DV e lucro, sempre
  // atualizados). A comissão é a do vendedor/empresa, ajustável nesta operação sem mexer no lucro.
  const [comissaoEditada, setComissaoEditada] = useState<number | null>(null)
  const fatorEmpresa = useFator({ empresaId: unidadeId, vendedorId: vendedorId || null, comissoes: comissaoEditada, servicoId: servicoId || null, precificar: true }, !!unidadeId)
  const fr = fatorEmpresa.fator
  const semFator = !!fr && !fr.pronto
  const base = fr?.pronto
    ? {
        dfPct: fr.dfPct,
        dvSem: fr.dvSemLucro,
        dvCom: fr.dvSemLucro + fr.lucro,
        markup: fr.markup,
        fator: fr.fator,
        impostos: fr.impostos,
        impostosDoCadastro: fr.impostosDoCadastro,
      }
    : null
  // O lucro é sempre o da empresa: o vendedor não vê nem altera.
  const lucroDesejado = fr?.lucro ?? 0
  const comissaoAtual = comissaoEditada ?? fr?.comissoesPadrao ?? 0

  const addCusto = () =>
    setCustosExtras((l) => [
      ...l,
      {
        id: crypto.randomUUID(),
        tipoId: '',
        label: '',
        modo: 'valor',
        base: 'nf',
        percentual: 0,
        valor: 0,
        valorPre: 0,
      },
    ])
  const updCusto = (id: string, patch: Partial<CustoExtra>) =>
    setCustosExtras((l) => l.map((c) => (c.id === id ? { ...c, ...patch } : c)))
  const rmCusto = (id: string) => setCustosExtras((l) => l.filter((c) => c.id !== id))
  /** Ao escolher o tipo, o valor pré-cadastrado vem junto. */
  const escolherTipo = (id: string, tipoId: string) => {
    const t = tiposCusto.find((x) => x.id === tipoId)
    if (!t)
      return updCusto(id, {
        tipoId: '',
        label: '',
        modo: 'valor',
        base: 'nf',
        percentual: 0,
        valor: 0,
        valorPre: 0,
      })
    updCusto(id, {
      tipoId: t.id,
      label: t.nome,
      modo: t.modo === 'percentual' ? 'percentual' : 'valor',
      base: t.basePercentual === 'servico' ? 'servico' : 'nf',
      percentual: t.modo === 'percentual' ? t.valor : 0,
      valor: t.modo === 'percentual' ? 0 : t.valor,
      valorPre: t.valor,
    })
  }

  const dfPct = base?.dfPct ?? 0
  const dvSem = base?.dvSem ?? 0

  // Custos em reais: valores fixos + percentuais sobre a NF informada.
  const valorDaLinha = (c: CustoExtra) =>
    c.modo === 'percentual' ? (c.base === 'nf' ? c.percentual * valorNf : 0) : c.valor
  const custoReais = custosExtras.reduce((a, c) => a + valorDaLinha(c), 0)
  // Custos em % do preço do serviço: entram na conta algébrica do PV.
  const custoPctServico = custosExtras
    .filter((c) => c.modo === 'percentual' && c.base === 'servico')
    .reduce((a, c) => a + c.percentual, 0)
  const temCusto = custoReais > 0 || custoPctServico > 0

  const aliqSeg = aliquotaSeguro()
  const empresa = (empresasData ?? []).find((u) => u.id === unidadeId)
  const icmsAtivoEmpresa = !!empresa?.icmsAtivo
  const ufs = [...(empresa?.icms ?? [])].sort((a, b) => a.uf.localeCompare(b.uf))
  const icmsItem = empresa?.icms.find((i) => i.id === ufDestino)
  const aplicaIcmsEfetivo = aplicaIcms && icmsAtivoEmpresa
  const aliqIcms = aplicaIcmsEfetivo ? (icmsItem?.aliquota ?? 0) : 0

  // Preview instantâneo (engine local) — fallback enquanto o servidor responde ou se a API cair.
  const localFator = base ? calcFator(markup(dfPct, dvSem + lucroDesejado)) : 0
  const localPv = round2(
    custoPctServico > 0
      ? precoVendaComCustoPercentual(custoReais, custoPctServico, localFator)
      : precoVenda(custoReais, 0, localFator),
  )
  const localPvComDesc = round2(localPv * (1 - desconto))
  const localCustoPctReais = round2(localPvComDesc * custoPctServico)
  const localCustoTotal = custoReais + localCustoPctReais
  const localSeguro = seguroAdValorem(valorNf, aliqSeg)
  const localFiscal = cotacaoFiscal(localPvComDesc, localSeguro, aliqIcms, aplicaIcmsEfetivo)
  const localMargem = margem(localPvComDesc, localCustoTotal, dfPct, dvSem)

  // Fonte da verdade: motor no .NET. Usa o local até responder (debounce).
  const srv = usePrecoServidor(
    {
      empresaId: unidadeId,
      custo: custoReais,
      lucroDesejado: null,
      desconto,
      valorNf,
      aplicaIcms: aplicaIcmsEfetivo,
      ufDestinoId: aplicaIcmsEfetivo ? ufDestino : null,
      custoPercentualServico: custoPctServico,
      comissoes: comissaoEditada,
      vendedorId: vendedorId || null,
      servicoId: servicoId || null,
    },
    temCusto && !!unidadeId && !!fr?.pronto,
  )

  const fatorVal = srv?.fator ?? localFator
  const pv = srv?.pv ?? localPv
  const pvComDesconto = srv?.pvComDesconto ?? localPvComDesc
  const descontoValor = srv?.descontoValor ?? localPv - localPvComDesc
  const seguro = srv?.seguro ?? localSeguro
  const fiscal = srv?.fiscal ?? localFiscal
  const mEfetiva = srv?.margem ?? localMargem
  const custoPctReais = srv?.custoPercentualReais ?? localCustoPctReais
  const custoTotal = srv?.custoTotal ?? localCustoTotal
  // O mínimo é o próprio fator: a margem não pode ficar abaixo do lucro da empresa.
  const markupMinimo = srv?.markupMinimo ?? lucroDesejado

  const formaInfo = FORMAS_COBRANCA.find((f) => f.valor === forma)
  const precoCalculado = round2(fiscal.precoFinal)

  // Preço negociado: o cliente chega com um valor menor e o sistema volta até a margem,
  // sem mexer em custo e desconto (cálculo reverso).
  const precoNegociado = precoEditado !== null && precoEditado > 0
  const reverso = precoNegociado
    ? precoParaMargem(
        precoEditado,
        seguro,
        aliqIcms,
        aplicaIcmsEfetivo,
        pv,
        custoTotal,
        dfPct,
        dvSem,
      )
    : null
  const precoFinal = precoNegociado ? round2(precoEditado) : precoCalculado
  const margemVigente = reverso?.margem ?? mEfetiva

  // Piso do markup da empresa: gestor recebe alerta; vendedor vai para aprovação.
  const abaixoDoMinimo = markupMinimo > 0 && temCusto && margemVigente.ml < markupMinimo - 0.00005

  // O que falta para o item poder entrar na proposta. Em vez de só desabilitar o
  // botão, o sistema diz o motivo e marca o campo (o cliente travou aqui no teste).
  const faltaServico = !servicoId
  const faltaCusto = !temCusto
  const faltaDescricao = !descricaoItem.trim()
  const faltasItem = [
    semFator && (fr?.aviso ?? 'o fator da empresa não pôde ser calculado'),
    faltaServico && 'escolha o serviço',
    faltaCusto && 'lance ao menos um custo com valor',
    faltaDescricao && 'descreva o item',
  ].filter((f): f is string => !!f)
  const podeAdicionar = faltasItem.length === 0

  const adicionarItem = () => {
    if (!podeAdicionar) {
      setTentouAdicionar(true)
      return
    }
    setTentouAdicionar(false)
    const servicoNome = servicos.find((sv) => sv.id === servicoId)?.nome
    const custos: CustoItemProposta[] = custosExtras
      .filter((c) => c.tipoId)
      .map((c) => ({
        tipoCustoId: c.tipoId,
        nome: c.label,
        modo: c.modo,
        base: c.modo === 'percentual' ? c.base : '',
        percentual: c.modo === 'percentual' ? c.percentual : 0,
        valor: round2(
          c.modo === 'percentual' && c.base === 'servico'
            ? pvComDesconto * c.percentual
            : valorDaLinha(c),
        ),
      }))
    setItens((l) => [
      ...l,
      {
        id: crypto.randomUUID(),
        descricao: servicoNome ? `${servicoNome} · ${descricaoItem.trim()}` : descricaoItem.trim(),
        servicoId,
        empresaId: unidadeId,
        custoTotal: round2(custoTotal),
        lucro: lucroDesejado,
        desconto,
        pv,
        precoFinal,
        // Guarda o preço do motor quando o vendedor digitou outro (rastro para a alçada).
        precoCalculado: precoNegociado ? precoCalculado : 0,
        ml: margemVigente.ml,
        comissao: comissaoAtual,
        dfPct,
        dvSem,
        custos,
        abaixoMinimo: abaixoDoMinimo,
      },
    ])
    setDescricaoItem('')
    setPrecoEditado(null)
    setEditandoPreco(false)
  }
  const rmItem = (id: string) => setItens((l) => l.filter((i) => i.id !== id))

  /**
   * Devolve um item da proposta para o cálculo (seta "voltar"): sai do grid de itens e os
   * custos, o desconto e o preço negociado voltam para os campos. Ajusta e readiciona.
   */
  const editarItem = (it: ItemProposta) => {
    rmItem(it.id)
    setUnidadeId(it.empresaId)
    setServicoId(it.servicoId ?? '')
    setCustosExtras(
      (it.custos ?? []).map((c) => {
        const tipo = tiposCusto.find((t) => t.id === c.tipoCustoId)
        return {
          id: crypto.randomUUID(),
          tipoId: c.tipoCustoId,
          label: c.nome,
          modo: c.modo === 'percentual' ? 'percentual' : 'valor',
          base: c.base === 'servico' ? 'servico' : 'nf',
          percentual: c.percentual,
          valor: c.modo === 'percentual' ? 0 : c.valor,
          valorPre: tipo?.valor ?? 0,
        }
      }),
    )
    setDesconto(it.desconto)
    const servicoNome = servicos.find((sv) => sv.id === it.servicoId)?.nome
    setDescricaoItem(servicoNome && it.descricao.startsWith(`${servicoNome} · `) ? it.descricao.slice(servicoNome.length + 3) : it.descricao)
    const negociado = (it.precoCalculado ?? 0) > 0
    setPrecoEditado(negociado ? it.precoFinal : null)
    setEditandoPreco(false)
    setTentouAdicionar(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const totalItens = itens.reduce((a, i) => a + i.precoFinal, 0)
  // Total que o motor tinha calculado (só difere quando algum item teve o preço editado).
  const totalCalculado = itens.reduce((a, i) => a + (i.precoCalculado || i.precoFinal), 0)
  const temPrecoEditado = itens.some((i) => (i.precoCalculado ?? 0) > 0)
  const temAbaixoMinimo = itens.some((i) => i.abaixoMinimo)
  // Vendedor abaixo do piso pede aprovação; gestor só é avisado.
  const precisaAprovacao = temPrecoEditado || (temAbaixoMinimo && !ehGestor)
  const modeloSel = modeloId || modelos[0]?.id || ''

  // Região do vendedor (lista de exclusão): avisa aqui; o servidor confere de novo ao gerar.
  const bloqueioRegiao =
    clienteAtual && vendedorSel
      ? bloqueioDeRegiao(vendedorSel.regioesBloqueadas ?? [], clienteAtual.cidade)
      : null

  const faltaCliente = !clienteAtual
  const faltaValidade = !validadeId
  const faltaModelo = !modeloSel
  const faltaJustificativa = precisaAprovacao && !justificativa.trim()
  const faltasProposta = [
    faltaCliente &&
      (clienteTexto.trim() ? 'escolha o cliente na lista (ou cadastre-o)' : 'informe o cliente'),
    faltaValidade && 'escolha a validade',
    faltaModelo && 'escolha o modelo da proposta',
    faltaJustificativa && 'escreva a justificativa para pedir a aprovação',
    bloqueioRegiao &&
      `o vendedor ${vendedorSel?.nome} não atende a região do cliente (${descreverRegiao(bloqueioRegiao)})`,
  ].filter((f): f is string => !!f)

  const gerarProposta = async () => {
    if (!itens.length) return
    if (faltasProposta.length > 0 || !clienteAtual) {
      setTentouGerar(true)
      return
    }
    setTentouGerar(false)
    const validadeDesc = validades.find((v) => v.id === validadeId)?.descricao ?? ''
    setGerando(true)
    try {
      const salvar = propostaEditandoId
        ? (dados: Parameters<typeof criarProposta>[0]) => atualizarProposta(propostaEditandoId, dados)
        : criarProposta
      await salvar({
        cliente: clienteAtual.nomeFantasia || clienteAtual.nome,
        clienteId: clienteAtual.id,
        vendedorId,
        vendedorNome: vendedorSel?.nome ?? '',
        itens,
        total: round2(totalItens),
        modeloId: modeloSel || null,
        prazoEntrega: prazoEntrega.trim(),
        validade: validadeDesc,
        formaPagamento,
        prazoPagamentoDias: prazoPagamento,
        precoOriginal: temPrecoEditado ? round2(totalCalculado) : 0,
        justificativa: precisaAprovacao ? justificativa.trim() : '',
      })
    } catch (err) {
      void avisar({ titulo: 'Não foi possível concluir', mensagem: getErrorMessage(err) })
      return
    } finally {
      setGerando(false)
    }
    setItens([])
    setClienteTexto('')
    setClienteId('')
    setJustificativa('')
    setPagamentoEditado(null)
    setPropostaEditandoId('')
    navigate('/propostas')
  }
  const propostaEditando = propostaEditandoId ? propostas.find((p) => p.id === propostaEditandoId) : undefined
  // Diferença do preço negociado sobre o calculado (positiva = acréscimo, negativa = desconto).
  const diferencaPct = precoNegociado && precoCalculado > 0 ? (precoFinal - precoCalculado) / precoCalculado : 0
  /** Parcela do preço de venda que cada custo "puxa" (custo × fator): a leitura por linha pedida na homologação. */
  const composicao = custosExtras
    .filter((c) => c.tipoId)
    .map((c) => {
      const custo = c.modo === 'percentual' && c.base === 'servico' ? round2(pvComDesconto * c.percentual) : round2(valorDaLinha(c))
      return { id: c.id, label: c.label, custo, preco: round2(custo * fatorVal) }
    })

  if (!carregandoEmpresas && unidades.length === 0) {
    return (
      <div>
        <PageHeader
          breadcrumb="Comercial"
          title="Pricing"
          subtitle="Informe os custos; veja o preço, a margem e os impostos."
        />
        <div className={s.card}>
          <div className={s.cardTitle}>
            <Calculator /> Nenhuma empresa ativa
          </div>
          <p style={{ fontSize: 13.5, color: '#6b7b72', lineHeight: 1.6 }}>
            Para precificar, cadastre primeiro uma empresa em <b>Cadastros &gt; Empresas</b> (com a
            aba Markup preenchida: impostos, comissão, despesa financeira e lucro). O preço é calculado a partir dos
            dados da empresa.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        breadcrumb="Comercial"
        title="Pricing"
        subtitle={
          propostaEditando
            ? `Editando a proposta ${propostaEditando.numero} (${propostaEditando.cliente}). Devolva um item ao cálculo com a seta, ajuste e readicione; ao gerar, a proposta é reescrita.`
            : 'Escolha o serviço, lance os custos e o sistema calcula o preço com o markup da empresa.'
        }
        compacto
      />

      <div className={s.layout}>
        {/* Inputs */}
        <div className={s.card}>
          <div className={s.cardTitle}>
            <Receipt /> Dados da operação
          </div>

          <div className={s.inputBlock}>
            <label className={s.inputLabel}>Empresa</label>
            <select
              className={s.select}
              value={unidadeId}
              onChange={(e) => setUnidadeId(e.target.value)}
            >
              {unidades.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nome}
                </option>
              ))}
            </select>
          </div>

          <div className={s.inputBlock}>
            <label className={s.inputLabel}>
              Serviço <span className={s.obrig}>*</span>
              <Hint text="O que está sendo vendido nesta linha da proposta. Vem do cadastro de Serviços." />
            </label>
            <select
              className={`${s.select} ${tentouAdicionar && faltaServico ? s.campoErro : ''}`}
              value={servicoId}
              onChange={(e) => setServicoId(e.target.value)}
            >
              <option value="">Selecione o serviço</option>
              {servicos.map((sv) => (
                <option key={sv.id} value={sv.id}>
                  {sv.nome}
                </option>
              ))}
            </select>
            {servicos.length === 0 && (
              <div className={s.inputHint}>
                Cadastre um serviço em <Link to="/cadastros/servicos">Cadastros &gt; Serviços</Link>
                .
              </div>
            )}
          </div>

          {semFator && (
            <div className={s.alertaPiso}>
              <AlertTriangle size={15} />
              <span>
                O Pricing desta empresa está bloqueado: {fr?.aviso}{' '}
                <Link to="/analises/metas">Abrir Metas</Link>
              </span>
            </div>
          )}

          <div className={s.inputBlock}>
            <label className={s.inputLabel}>
              Comissão (%)
              <Hint text="Vem da regra de comissão do vendedor ou, sem regra, da empresa. Dá para baixar nesta operação para chegar num preço competitivo sem mexer no lucro." />
            </label>
            <PercentInput value={comissaoAtual} onChange={(n) => setComissaoEditada(n)} />
            {comissaoEditada !== null && fr && comissaoEditada !== fr.comissoesPadrao && (
              <div className={s.inputHint}>
                Padrão {formatPct(fr.comissoesPadrao)}.{' '}
                <button type="button" className={s.linkBtn} onClick={() => setComissaoEditada(null)}>
                  Voltar ao padrão
                </button>
              </div>
            )}
          </div>

          {base && podeVerCalculo && (
            <div className={s.dvInfo}>
              <span>
                DF <b>{formatPct(base.dfPct)}</b>
              </span>
              <span
                title={
                  base.impostosDoCadastro
                    ? `Inclui ${formatPct(base.impostos)} de impostos do cadastro da empresa`
                    : `Inclui ${formatPct(base.impostos)} de impostos informados na DV`
                }
              >
                DV <b>{formatPct(base.dvCom)}</b>
              </span>
              <span>
                Markup <b>{formatPct(base.markup)}</b>
              </span>
              <span>
                Fator base <b>{fator4(base.fator)}</b>
              </span>
              {markupMinimo > 0 && (
                <span>
                  Lucro <b>{formatPct(markupMinimo)}</b>
                </span>
              )}
            </div>
          )}

          <div className={`${s.inputBlock} ${tentouAdicionar && faltaCusto ? s.blocoErro : ''}`}>
            <label className={s.inputLabel}>
              Custos da operação <span className={s.obrig}>*</span>
              <Hint text="Cada linha é um tipo de custo do cadastro. O valor pré-cadastrado vem preenchido; custos em percentual são calculados sobre a NF ou sobre o próprio preço do serviço." />
            </label>
            {custosExtras.map((c) => {
              const travado = !!c.tipoId && c.valorPre > 0 && !podeAlterarValorCusto
              return (
                <div key={c.id} className={s.extraRow}>
                  <select
                    className={`${s.select} ${s.extraInput}`}
                    value={c.tipoId}
                    onChange={(e) => escolherTipo(c.id, e.target.value)}
                  >
                    <option value="">Tipo de custo</option>
                    {tiposCusto.map((tc) => (
                      <option key={tc.id} value={tc.id}>
                        {tc.nome}
                      </option>
                    ))}
                  </select>
                  <div
                    className={s.extraMoney}
                    title={
                      travado
                        ? 'Valor pré-cadastrado; alterar exige a permissão especial'
                        : undefined
                    }
                  >
                    {c.modo === 'percentual' ? (
                      <fieldset className={s.fsetInline} disabled={travado}>
                        <PercentInput
                          value={c.percentual}
                          onChange={(f) => updCusto(c.id, { percentual: f })}
                        />
                      </fieldset>
                    ) : (
                      <fieldset className={s.fsetInline} disabled={travado}>
                        <MoneyInput
                          value={c.valor}
                          onChange={(n) => updCusto(c.id, { valor: n })}
                        />
                      </fieldset>
                    )}
                  </div>
                  <button
                    type="button"
                    className={s.rmBtn}
                    onClick={() => rmCusto(c.id)}
                    title="Remover"
                  >
                    <X size={15} />
                  </button>
                  {c.modo === 'percentual' && (
                    <div className={s.extraNota}>
                      {c.base === 'servico'
                        ? `${formatPct(c.percentual)} do preço do serviço = ${formatBRL(round2(pvComDesconto * c.percentual))}`
                        : `${formatPct(c.percentual)} da NF (${formatBRL(valorNf)}) = ${formatBRL(round2(c.percentual * valorNf))}`}
                    </div>
                  )}
                </div>
              )
            })}
            <button
              type="button"
              className={s.addBtn}
              onClick={addCusto}
              disabled={tiposCusto.length === 0}
            >
              <Plus /> Adicionar custo
            </button>
            {tiposCusto.length === 0 ? (
              <div className={s.inputHint}>
                Cadastre os tipos em{' '}
                <Link to="/cadastros/tipos-custo">Cadastros &gt; Tipos de Custo</Link> para lançar
                os custos.
              </div>
            ) : (
              custosExtras.length === 0 && (
                <div className={s.inputHint}>
                  Lance ao menos um custo para o sistema calcular o preço.
                </div>
              )
            )}
          </div>

          <div className={s.divider} />

          <div className={s.dupla}>
            <div className={s.inputBlock}>
              <label className={s.inputLabel}>
                Desconto (%)
                <Hint text="Abatimento sobre o preço de venda deste serviço. Se derrubar a margem abaixo do markup mínimo da empresa, o gestor é avisado e o vendedor precisa pedir aprovação." />
              </label>
              <PercentInput value={desconto} onChange={setDesconto} />
            </div>
            <div className={s.inputBlock}>
              <label className={s.inputLabel}>
                Valor da NF (R$)
                <Hint text="Valor da mercadoria ou do documento. Serve de base para o seguro, para o ICMS e para os custos cobrados em % da NF." />
              </label>
              <MoneyInput value={valorNf} onChange={setValorNf} />
              <div className={s.inputHint}>Base do seguro ({formatPct(aliqSeg)}) e do ICMS.</div>
            </div>
          </div>

          <div className={s.dupla}>
            <div className={s.inputBlock}>
              <label className={s.inputLabel}>ICMS</label>
              {icmsAtivoEmpresa ? (
                <>
                  <button
                    type="button"
                    className={s.swWrap}
                    onClick={() => setAplicaIcms((v) => !v)}
                  >
                    <span className={`${s.sw} ${aplicaIcms ? s.swOn : ''}`}>
                      <span className={s.swDot} />
                    </span>
                    <span className={s.swLbl}>
                      {aplicaIcms ? 'Aplicar ICMS' : 'Não aplicar ICMS'}
                    </span>
                  </button>
                  {aplicaIcms && (
                    <div className={s.ufGrid}>
                      <div>
                        <span className={s.ufMini}>UF origem</span>
                        <select
                          className={s.select}
                          value={ufOrigem}
                          onChange={(e) => setUfOrigem(e.target.value)}
                        >
                          {ufs.map((i) => (
                            <option key={i.id} value={i.id}>
                              {i.uf}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <span className={s.ufMini}>UF destino</span>
                        <select
                          className={s.select}
                          value={ufDestino}
                          onChange={(e) => setUfDestino(e.target.value)}
                        >
                          {ufs.map((i) => (
                            <option key={i.id} value={i.id}>
                              {i.uf} (ICMS {formatPct(i.aliquota)})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className={s.mutedNote}>ICMS desativado no cadastro desta empresa.</div>
              )}
            </div>
            <div className={s.inputBlock}>
              <label className={s.inputLabel}>
                Forma de cobrança
                <Hint text="Documento que será emitido. Sai impresso na proposta e não altera o cálculo do preço." />
              </label>
              <select
                className={s.select}
                value={forma}
                onChange={(e) => setForma(e.target.value as FormaCobranca)}
              >
                {FORMAS_COBRANCA.map((f) => (
                  <option key={f.valor} value={f.valor}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {podeVerCalculo && (
            <div className={s.memRow} style={{ marginTop: 4 }}>
              <span className={s.memLabel}>Custo total da operação</span>
              <span className={s.memVal}>{formatBRL(custoTotal)}</span>
            </div>
          )}
        </div>

        {/* Resultado */}
        <div className={s.card}>
          <div className={s.cardTitle}>
            <Calculator /> Resultado
          </div>

          <div className={s.finalBox}>
            <div>
              <div className={s.finalLabel}>
                Preço final (com impostos)
                {precoNegociado && <span className={s.negociadoTag}>negociado</span>}
              </div>
              {precoNegociado && editandoPreco ? (
                <div className={s.finalEdit}>
                  <MoneyInput value={precoEditado ?? 0} onChange={(v) => setPrecoEditado(v)} />
                  <button
                    type="button"
                    className={s.finalEditBtn}
                    onClick={() => setEditandoPreco(false)}
                    disabled={(precoEditado ?? 0) <= 0}
                    title="Confirmar o preço negociado (vale ao adicionar o item à proposta)"
                  >
                    <Check size={14} /> Usar este preço
                  </button>
                  <button
                    type="button"
                    className={s.finalEditBtn}
                    onClick={() => {
                      setPrecoEditado(null)
                      setEditandoPreco(false)
                      setJustificativa('')
                    }}
                    title="Voltar ao preço calculado"
                  >
                    <RotateCcw size={14} /> Voltar ao calculado
                  </button>
                </div>
              ) : precoNegociado ? (
                <div className={s.finalVal}>
                  {formatBRL(precoFinal)}
                  <button type="button" className={s.finalEditBtn} onClick={() => setEditandoPreco(true)} title="Alterar o preço negociado">
                    <Pencil size={14} /> Alterar
                  </button>
                  <button
                    type="button"
                    className={s.finalEditBtn}
                    onClick={() => {
                      setPrecoEditado(null)
                      setJustificativa('')
                    }}
                    title="Voltar ao preço calculado"
                  >
                    <RotateCcw size={14} /> Voltar ao calculado
                  </button>
                </div>
              ) : (
                <div className={s.finalVal}>
                  {formatBRL(precoCalculado)}
                  <button
                    type="button"
                    className={s.finalEditBtn}
                    onClick={() => {
                      setPrecoEditado(precoCalculado)
                      setEditandoPreco(true)
                    }}
                    disabled={precoCalculado <= 0}
                    title="Informar o preço fechado com o cliente"
                  >
                    <Pencil size={14} /> Editar preço
                  </button>
                </div>
              )}
            </div>
            <div className={s.finalMeta}>
              {nomeUnidade(unidadeId)} · {formaInfo?.label}
              <br />
              {aplicaIcmsEfetivo ? (
                <>
                  ICMS {icmsItem?.uf} <b>{formatPct(aliqIcms)}</b>
                </>
              ) : (
                <b>sem ICMS</b>
              )}
            </div>
          </div>

          {abaixoDoMinimo && (
            <div className={`${s.alertaPiso} ${ehGestor ? s.alertaPisoGestor : ''}`} role="alert">
              <AlertTriangle size={16} />
              <span>
                {ehGestor
                  ? `Atenção: o preço ficou abaixo do fator da empresa (margem abaixo do lucro de ${formatPct(markupMinimo)}). Como gestor, você pode seguir.`
                  : `O preço ficou abaixo do fator da empresa (margem abaixo do lucro de ${formatPct(markupMinimo)}). Ao gerar, a proposta vai para aprovação com a sua justificativa.`}
              </span>
            </div>
          )}

          {precoNegociado && reverso && (
            <div className={s.reverso}>
              <div className={s.reversoLinha}>
                <span>Preço calculado</span>
                <b>{formatBRL(precoCalculado)}</b>
              </div>
              <div className={s.reversoLinha}>
                <span>Diferença sobre o calculado</span>
                <b className={diferencaPct < 0 ? s.reversoRuim : ''}>
                  {diferencaPct >= 0 ? '+' : '−'}
                  {formatPct(Math.abs(diferencaPct))} ({diferencaPct >= 0 ? 'acréscimo' : 'desconto'})
                </b>
              </div>
              {podeVerCalculo && (
                <div className={s.reversoLinha}>
                  <span>Margem líquida com este preço</span>
                  <b className={reverso.margem.ml < 0 ? s.reversoRuim : ''}>
                    {formatPct(reverso.margem.ml)}
                  </b>
                </div>
              )}
            </div>
          )}

          {podeVerCalculo ? (
            <>
              <div className={s.memTitle}>Cálculo do preço</div>
              {composicao.length > 1 &&
                composicao.map((l) => (
                  <div key={l.id} className={s.memRow}>
                    <span>
                      <span className={s.memLabel}>{l.label}</span>
                      <div className={s.memSub}>
                        custo {formatBRL(l.custo)} × fator {fator4(fatorVal)}
                      </div>
                    </span>
                    <span className={s.memVal}>{formatBRL(l.preco)}</span>
                  </div>
                ))}
              <div className={s.memRow}>
                <span className={s.memLabel}>{composicao.length > 1 ? 'Custos em reais (total)' : 'Custos em reais'}</span>
                <span className={s.memVal}>{formatBRL(custoReais)}</span>
              </div>
              {custoPctServico > 0 && (
                <div className={s.memRow}>
                  <span className={s.memLabel}>
                    Custos em % do serviço ({formatPct(custoPctServico)})
                  </span>
                  <span className={s.memVal}>{formatBRL(custoPctReais)}</span>
                </div>
              )}
              <div className={s.memRow}>
                <span className={s.memLabel}>× Fator (lucro {formatPct(lucroDesejado)})</span>
                <span className={s.memVal}>{fator4(fatorVal)}</span>
              </div>
              <div className={`${s.memRow} ${desconto > 0 ? '' : s.memTotal}`}>
                <span className={s.memLabel}>
                  {desconto > 0 ? 'Preço de venda (PV)' : '= Preço de venda (PV)'}
                </span>
                <span className={s.memVal}>{formatBRL(pv)}</span>
              </div>
              {desconto > 0 && (
                <>
                  <div className={`${s.memRow} ${s.memDesc}`}>
                    <span className={s.memLabel}>(−) Desconto {formatPct(desconto)}</span>
                    <span className={s.memVal}>{formatBRL(descontoValor)}</span>
                  </div>
                  <div className={`${s.memRow} ${s.memTotal}`}>
                    <span className={s.memLabel}>= Preço com desconto</span>
                    <span className={s.memVal}>{formatBRL(pvComDesconto)}</span>
                  </div>
                </>
              )}

              <div className={s.memTitle} style={{ marginTop: 12 }}>
                Impostos
              </div>
              <div className={s.memRow}>
                <span className={s.memLabel}>Seguro (NF × {formatPct(aliqSeg)})</span>
                <span className={s.memVal}>{formatBRL(seguro)}</span>
              </div>
              {aplicaIcmsEfetivo ? (
                <>
                  <div className={s.memRow}>
                    <span>
                      <span className={s.memLabel}>Gross-up ICMS ({icmsItem?.uf})</span>
                      <div className={s.memSub}>
                        ÷ {formatNumberBRL(1 - aliqIcms)} (1 − {formatPct(aliqIcms)})
                      </div>
                    </span>
                    <span className={s.memVal}>{formatBRL(fiscal.freteComIcms)}</span>
                  </div>
                  <div className={s.memRow}>
                    <span className={s.memLabel}>ICMS embutido</span>
                    <span className={s.memVal}>{formatBRL(fiscal.icmsValor)}</span>
                  </div>
                </>
              ) : (
                <div className={s.memRow}>
                  <span className={s.memLabel}>ICMS</span>
                  <span className={s.memVal}>não aplicado</span>
                </div>
              )}
              <div className={`${s.memRow} ${s.memTotal}`}>
                <span className={s.memLabel}>= Preço final</span>
                <span className={s.memVal}>{formatBRL(round2(fiscal.precoFinal))}</span>
              </div>

              <div className={s.memTitle} style={{ marginTop: 12 }}>
                Resultado efetivo
              </div>
              <div className={s.memRow}>
                <span className={s.memLabel}>Margem de Contribuição (MCU)</span>
                <span className={s.memVal}>{formatBRL(margemVigente.mcu)}</span>
              </div>
              <div className={s.memRow} style={{ borderBottom: 'none', paddingTop: 6 }}>
                <span className={s.memLabel}>Margem Líquida efetiva (ML)</span>
                <span className={`${s.mlBadge} ${abaixoDoMinimo ? s.mlBadgeRuim : ''}`}>
                  {formatPct(margemVigente.ml)}
                </span>
              </div>
            </>
          ) : (
            <div className={s.mutedNote}>
              O preço já inclui custos, impostos e o markup da empresa.
            </div>
          )}

          <div className={s.divider} />
          <div className={s.inputBlock}>
            <label className={s.inputLabel}>
              Descrição do item <span className={s.obrig}>*</span>
              <Hint text="Como este serviço vai aparecer na proposta. Ex.: unidade atendida, quantidade, período." />
            </label>
            <input
              className={`${s.select} ${tentouAdicionar && faltaDescricao ? s.campoErro : ''}`}
              value={descricaoItem}
              onChange={(e) => setDescricaoItem(e.target.value)}
              placeholder="Ex.: 2 postos, unidade Centro, 12 meses"
            />
          </div>
          <button
            type="button"
            className={`${ui.btn} ${ui.btnPrimary}`}
            style={{ width: '100%', justifyContent: 'center' }}
            onClick={adicionarItem}
          >
            <Plus /> Adicionar à proposta
          </button>
          {tentouAdicionar && faltasItem.length > 0 && (
            <div className={s.faltas} role="alert">
              Para adicionar o item: {faltasItem.join(', ')}.
            </div>
          )}
        </div>
      </div>

      {itens.length > 0 && (
        <div className={s.itensCard}>
          <div className={s.cardTitle}>
            <FileText /> Itens da proposta ({itens.length})
          </div>
          <table className={ui.table}>
            <thead>
              <tr>
                <th>Serviço / descrição</th>
                <th>Empresa</th>
                {podeVerCalculo && <th className={ui.right}>Custo</th>}
                <th className={ui.right}>Desconto</th>
                <th className={ui.right}>Preço final</th>
                {podeVerCalculo && <th className={ui.right}>ML</th>}
                <th className={ui.colActions} />
              </tr>
            </thead>
            <tbody>
              {itens.map((it) => (
                <tr key={it.id}>
                  <td className={ui.cellStrong}>
                    {it.descricao}
                    {it.abaixoMinimo && <div className={s.itemAviso}>abaixo do markup mínimo</div>}
                  </td>
                  <td className={ui.cellMut}>{nomeUnidade(it.empresaId)}</td>
                  {podeVerCalculo && <td className={ui.right}>{formatBRL(it.custoTotal)}</td>}
                  <td className={ui.right}>{it.desconto > 0 ? formatPct(it.desconto) : '—'}</td>
                  <td className={`${ui.right} ${ui.cellStrong}`}>
                    {formatBRL(it.precoFinal)}
                    {(it.precoCalculado ?? 0) > 0 && (
                      <div className={s.precoOriginal}>
                        calculado {formatBRL(it.precoCalculado ?? 0)}
                      </div>
                    )}
                  </td>
                  {podeVerCalculo && <td className={ui.right}>{formatPct(it.ml)}</td>}
                  <td className={ui.colActions}>
                    <button
                      type="button"
                      className={s.rmBtn}
                      onClick={() => editarItem(it)}
                      title="Voltar para o cálculo: ajuste custos, desconto ou preço e readicione"
                    >
                      <Undo2 size={15} />
                    </button>
                    <button
                      type="button"
                      className={s.rmBtn}
                      onClick={() => rmItem(it.id)}
                      title="Remover"
                    >
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className={s.gerarGrid}>
            <div className={s.gerarCampo}>
              <label className={s.inputLabel}>
                Cliente <span className={s.obrig}>*</span>
                <Hint text="Só cliente do cadastro: a forma de pagamento, o prazo e a região vêm de lá. Se não existir, cadastre antes." />
              </label>
              <ClienteAutocomplete
                clientes={clientes}
                value={clienteTexto}
                clienteId={clienteAtual?.id ?? ''}
                onChange={digitarCliente}
                onSelect={escolherCliente}
                className={`${s.select} ${tentouGerar && faltaCliente ? s.campoErro : ''}`}
              />
              {!clienteAtual && clienteTexto.trim() && (
                <div className={s.clienteNovo}>
                  <span>Este cliente não está no cadastro.</span>
                  <Link
                    to={`/cadastros/clientes?novo=${encodeURIComponent(clienteTexto.trim())}`}
                    className={`${ui.btn} ${ui.btnGhost}`}
                  >
                    <UserPlus /> Cadastrar cliente
                  </Link>
                </div>
              )}
            </div>

            <div className={s.gerarCampo}>
              <label className={s.inputLabel}>
                Vendedor
                <Hint text="Vem do seu usuário (elo no cadastro de Vendedores). Troque só quando estiver precificando em nome de um representante." />
              </label>
              <select
                className={`${s.select} ${bloqueioRegiao ? s.campoErro : ''}`}
                value={vendedorId}
                onChange={(e) => setVendedorEscolhido(e.target.value)}
              >
                <option value="">
                  {meuVendedor ? 'Selecione' : 'Seu usuário não está ligado a um vendedor'}
                </option>
                {vendedores.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.nome}
                  </option>
                ))}
              </select>
              {bloqueioRegiao && (
                <div className={s.inputHint} style={{ color: '#c0392b' }}>
                  Bloqueado: {descreverRegiao(bloqueioRegiao)} (cliente em {clienteAtual?.cidade}).
                </div>
              )}
            </div>

            <div className={s.gerarCampo}>
              <label className={s.inputLabel}>
                Forma de pagamento
                <Hint text="Vem do cadastro do cliente. Alterar aqui exige a permissão especial." />
              </label>
              <select
                className={s.select}
                value={formaPagamento}
                disabled={!podeAlterarPagamento}
                onChange={(e) =>
                  setPagamentoEditado({ forma: e.target.value, prazo: prazoPagamento })
                }
              >
                <option value="">Não combinada</option>
                {FORMAS_PAGAMENTO.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>

            <div className={s.gerarCampo}>
              <label className={s.inputLabel}>Prazo de pagamento (dias)</label>
              <input
                type="number"
                min={0}
                className={s.select}
                value={prazoPagamento}
                disabled={!podeAlterarPagamento}
                onChange={(e) =>
                  setPagamentoEditado({
                    forma: formaPagamento,
                    prazo: Math.max(0, Math.trunc(Number(e.target.value) || 0)),
                  })
                }
              />
            </div>

            <div className={s.gerarCampo}>
              <label className={s.inputLabel}>Prazo de entrega</label>
              <input
                className={s.select}
                value={prazoEntrega}
                onChange={(e) => setPrazoEntrega(e.target.value)}
                placeholder="Ex.: 3 dias úteis"
              />
            </div>

            <div className={s.gerarCampo}>
              <label className={s.inputLabel}>
                Validade <span className={s.obrig}>*</span>
              </label>
              <select
                className={`${s.select} ${tentouGerar && faltaValidade ? s.campoErro : ''}`}
                value={validadeId}
                onChange={(e) => setValidadeId(e.target.value)}
              >
                <option value="">{validades.length ? 'Selecione' : 'Nenhuma cadastrada'}</option>
                {validades.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.descricao}
                  </option>
                ))}
              </select>
              {validades.length === 0 && (
                <div className={s.inputHint}>
                  Cadastre em{' '}
                  <Link to="/cadastros/validades">Configurações &gt; Validades de Proposta</Link>.
                </div>
              )}
            </div>

            <div className={s.gerarCampo}>
              <label className={s.inputLabel}>
                Modelo da proposta <span className={s.obrig}>*</span>
                <Hint text="Layout do PDF, por empresa. Cadastrado em Configurações > Modelos de Proposta." />
              </label>
              <select
                className={`${s.select} ${tentouGerar && faltaModelo ? s.campoErro : ''}`}
                value={modeloSel}
                onChange={(e) => setModeloId(e.target.value)}
              >
                {modelos.length === 0 && <option value="">Nenhum cadastrado</option>}
                {modelos.map((m) => (
                  <option key={m.id} value={m.id}>
                    {nomeUnidade(m.empresaId)} · {m.nome}
                  </option>
                ))}
              </select>
              {modelos.length === 0 && (
                <div className={s.inputHint}>
                  Cadastre em{' '}
                  <Link to="/cadastros/modelos-proposta">
                    Configurações &gt; Modelos de Proposta
                  </Link>
                  .
                </div>
              )}
            </div>
          </div>

          <div className={s.gerarRow}>
            <span className={s.itensTotal}>Total: {formatBRL(totalItens)}</span>
            <div style={{ flex: 1 }} />
            <button
              type="button"
              className={`${ui.btn} ${ui.btnPrimary}`}
              onClick={gerarProposta}
              disabled={gerando}
            >
              {gerando ? (
                'Salvando...'
              ) : precisaAprovacao ? (
                <>
                  <ShieldCheck /> Solicitar aprovação
                </>
              ) : propostaEditando ? (
                <>
                  <FileText /> Salvar proposta {propostaEditando.numero}
                </>
              ) : (
                <>
                  <FileText /> Gerar proposta
                </>
              )}
            </button>
          </div>
          {tentouGerar && faltasProposta.length > 0 && (
            <div className={s.faltas} role="alert">
              Para {precisaAprovacao ? 'solicitar a aprovação' : 'gerar a proposta'}:{' '}
              {faltasProposta.join(', ')}.
            </div>
          )}

          {precisaAprovacao && (
            <div className={s.justificativaBox}>
              <label className={s.inputLabel}>
                {temPrecoEditado
                  ? 'Justificativa do preço negociado'
                  : 'Justificativa da margem abaixo do mínimo'}{' '}
                <span className={s.obrig}>*</span>
                <Hint text="Fica registrada na proposta junto com o preço calculado, para a alçada avaliar." />
              </label>
              <textarea
                className={`${s.justificativa} ${tentouGerar && faltaJustificativa ? s.campoErro : ''}`}
                value={justificativa}
                onChange={(e) => setJustificativa(e.target.value)}
                placeholder="Ex.: cliente apresentou proposta concorrente de R$ 1.500,00 e temos volume recorrente."
                rows={2}
              />
              {temPrecoEditado && (
                <div className={s.justificativaNota}>
                  Preço calculado: <b>{formatBRL(round2(totalCalculado))}</b> · Preço solicitado:{' '}
                  <b>{formatBRL(round2(totalItens))}</b>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

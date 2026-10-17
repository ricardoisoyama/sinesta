import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, Calculator, Check, ClipboardList, Eye, FileText, Pencil, Plus, Receipt, RotateCcw, Settings2, ShieldCheck, Trash2, Undo2, UserPlus } from 'lucide-react'
import ui from '@/features/common/ui.module.css'
import { PageHeader } from '@/features/common/PageHeader'
import { Hint } from '@/features/common/Hint'
import { MoneyInput } from '@/features/common/MoneyInput'
import { PercentInput } from '@/features/common/PercentInput'
import { formatBRL, formatNumberBRL, formatPct } from '@/lib/format'
import { getErrorMessage } from '@/lib/api'
import { avisar } from '@/features/common/dialogo/dialogo'
import { useCustosFixosQuery, useTaxasQuery } from '@/features/cadastros/hooks'
import { listClientes, listFornecedores, listServicos, listVeiculos, listVendedores } from '@/features/cadastros/api'
import { nomeVeiculo } from '@/features/veiculos/types'
import { margem as calcMargem, precoParaMargem, precoVenda } from '@/features/pricing/engine'
import { useFator, usePrecoServidor } from '@/features/pricing/usePreco'
import { useAuth } from '@/features/auth/auth-context'
import { temPoderDeGestor } from '@/features/usuarios/types'
import { useUsuarios } from '@/features/usuarios/store'
import { usePropostas } from '@/features/propostas/store'
import { useModelosProposta } from '@/features/modelosProposta/store'
import type { CustoItemProposta, DadoOperacaoItem, FichaItemProposta, ItemProposta } from '@/features/propostas/types'
import { ClienteAutocomplete } from '@/features/parceiros/ClienteAutocomplete'
import { FORMAS_PAGAMENTO, type Parceiro } from '@/features/parceiros/types'
import { bloqueioDeRegiao, descreverRegiao } from '@/features/parceiros/regiao'
import { useEmpresaAtiva } from '@/features/camposOperacao/useEmpresaAtiva'
import { useDadosOperacaoDaEmpresa } from '@/features/camposOperacao/api'
import { BlocoDadosOperacao } from '@/features/camposOperacao/BlocoDadosOperacao'
import { efeitoDe, efeitosDosCampos, numeroDe, type ValoresOperacao } from '@/features/camposOperacao/types'
import { adValoremDosCampos } from '@/features/camposOperacao/advalorem'
import { useFichasDaEmpresa } from '@/features/fichaTecnica/api'
import { calcularFicha } from '@/features/fichaTecnica/calculo'
import { TIPOS_NUMERICOS } from '@/features/fichaTecnica/types'
import base from './simulador.module.css'
import s from './precificacaoNova.module.css'

const round2 = (n: number) => Math.round(n * 100) / 100
const fator4 = (n: number) => n.toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 })

/** Uma linha de custo: item de uma ficha × quantidade (a quantidade é por custo). */
interface LinhaCusto {
  id: string
  fichaId: string
  quantidade: number
}

/**
 * Pricing: Dados da operação na faixa de cima (campos parametrizados da empresa), custos pela
 * Ficha Técnica (cada linha com a sua quantidade) e o Resultado embaixo. Cada serviço vira um
 * item da proposta com o próprio custo, fator e desconto. O item guarda o retrato dos campos e
 * das fichas do dia, então mudar o cadastro depois não altera propostas já feitas.
 */
export function PricingPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { empresas, empresa, empresaId, setEmpresaId, carregando } = useEmpresaAtiva()
  useCustosFixosQuery()
  useTaxasQuery()
  // Cada empresa tem os seus tipos de operação (Transporte, Armazenagem...) e cada tipo os seus campos.
  const { tipos: tiposOperacao, camposDo, todosCampos } = useDadosOperacaoDaEmpresa(empresaId)
  const [tipoEscolhido, setTipoEscolhido] = useState('')
  const tipoOperacaoId = tiposOperacao.some((t) => t.id === tipoEscolhido) ? tipoEscolhido : (tiposOperacao[0]?.id ?? '')
  const tipoOperacao = tiposOperacao.find((t) => t.id === tipoOperacaoId)
  // Empresa do Simples (sem ICMS): o campo ICMS nem aparece no Pricing.
  const campos = camposDo(tipoOperacaoId).filter((c) => c.tipo !== 'icms' || !!empresa?.icmsAtivo)
  const { grupos, fichas, colunasDe, formulaDe, nomeGrupo } = useFichasDaEmpresa(empresaId)
  const { user } = useAuth()
  const ehGestor = temPoderDeGestor(user?.perfil)
  const perms = user?.permissoes ?? []
  const podeVerCalculo = perms.includes('/simulador/calculo')
  const podeAlterarPagamento = perms.includes('/propostas/alterar-pagamento')
  const { propostas, criarProposta, atualizarProposta } = usePropostas()
  const { ativos: modelos } = useModelosProposta()

  // ── operação em edição ──
  const [valores, setValores] = useState<ValoresOperacao>({})
  const [linhas, setLinhas] = useState<LinhaCusto[]>([])
  const [aberta, setAberta] = useState('')
  const [desconto, setDesconto] = useState(0)
  const [comissaoEditada, setComissaoEditada] = useState<number | null>(null)
  const [lucroEditado, setLucroEditado] = useState<number | null>(null)
  const [precoEditado, setPrecoEditado] = useState<number | null>(null)
  const [editandoPreco, setEditandoPreco] = useState(false)
  const [descricao, setDescricao] = useState('')
  const [tentou, setTentou] = useState(false)

  // ── proposta ──
  const [itens, setItens] = useState<ItemProposta[]>([])
  const [justificativa, setJustificativa] = useState('')
  const [prazoEntrega, setPrazoEntrega] = useState('')
  /** Validade escolhida (o texto, ex.: "15 dias"); vazio = a padrão da empresa. */
  const [validade, setValidade] = useState('')
  const [modeloId, setModeloId] = useState('')
  const [gerando, setGerando] = useState(false)
  const [tentouGerar, setTentouGerar] = useState(false)
  const [propostaEditandoId, setPropostaEditandoId] = useState('')
  const [carregouProposta, setCarregouProposta] = useState('')
  const propostaParam = searchParams.get('proposta') ?? ''

  const [tipoVisto, setTipoVisto] = useState(tipoOperacaoId)
  if (tipoVisto !== tipoOperacaoId) {
    // Trocou o tipo de operação: os campos são outros, então os valores recomeçam.
    setTipoVisto(tipoOperacaoId)
    setValores({})
  }

  const [empresaVista, setEmpresaVista] = useState(empresaId)
  if (empresaVista !== empresaId) {
    // Trocou de empresa: tipos, campos e fichas são outros, então a operação recomeça.
    setEmpresaVista(empresaId)
    setTipoEscolhido('')
    setValores({})
    setLinhas([])
    setAberta('')
    setComissaoEditada(null)
    setLucroEditado(null)
    setPrecoEditado(null)
    setEditandoPreco(false)
  }

  // ── cadastros ──
  const { data: clientesData } = useQuery({ queryKey: ['clientes'], queryFn: listClientes })
  const clientes = (clientesData ?? []).filter((c) => c.status === 'ativo')
  const { data: fornecedoresData } = useQuery({ queryKey: ['fornecedores'], queryFn: listFornecedores })
  const { data: servicosData } = useQuery({ queryKey: ['servicos'], queryFn: listServicos })
  const { data: veiculosData } = useQuery({ queryKey: ['veiculos'], queryFn: listVeiculos })
  const { data: vendedoresData } = useQuery({ queryKey: ['vendedores'], queryFn: listVendedores })
  const vendedores = (vendedoresData ?? []).filter((v) => v.status === 'ativo')
  // Validades: as da empresa que emite a proposta (a do 1º item; sem itens, a selecionada).
  const empresaEmissora = empresas.find((e) => e.id === (itens[0]?.empresaId || empresaId))
  const validades = (empresaEmissora?.validadesProposta ?? []).map((v) => v.descricao).filter((v) => v.trim())
  // Rascunho reaberto com uma validade que a empresa não oferece mais: continua valendo.
  if (validade && !validades.includes(validade) && propostaEditandoId) validades.push(validade)
  const validadeSel = validades.includes(validade)
    ? validade
    : (empresaEmissora?.validadesProposta?.find((v) => v.padrao)?.descricao ?? (validades.length === 1 ? validades[0] : ''))

  // ── cliente (só do cadastro) ──
  const [clienteTexto, setClienteTexto] = useState(() => searchParams.get('cliente') ?? '')
  const [clienteId, setClienteId] = useState('')
  const clienteAtual: Parceiro | undefined =
    clientes.find((c) => c.id === clienteId) ??
    (!clienteId && clienteTexto ? clientes.find((c) => c.nome === clienteTexto || c.nomeFantasia === clienteTexto) : undefined)
  const [pagamentoEditado, setPagamentoEditado] = useState<{ forma: string; prazo: number } | null>(null)
  const escolherCliente = (c: Parceiro) => {
    setClienteId(c.id)
    setClienteTexto(c.nomeFantasia || c.nome)
    setPagamentoEditado(null)
  }
  const digitarCliente = (t: string) => {
    setClienteTexto(t)
    if (clienteId) setClienteId('')
  }
  const formaPagamento = pagamentoEditado?.forma ?? clienteAtual?.formaPagamento ?? ''
  const prazoPagamento = pagamentoEditado?.prazo ?? clienteAtual?.prazoPagamentoDias ?? 0

  // ── vendedor: o usuário logado, pelo elo Vendedor → Funcionário ──
  const { usuarios } = useUsuarios()
  const meuUsuarioId = usuarios.find((u) => u.email === user?.email)?.id ?? ''
  const meuVendedor = vendedores.find((v) => v.usuarioId && v.usuarioId === meuUsuarioId)
  const [vendedorEscolhido, setVendedorEscolhido] = useState('')
  const vendedorId = vendedorEscolhido || meuVendedor?.id || ''
  const vendedorSel = vendedores.find((v) => v.id === vendedorId)

  // ── fator da empresa (motor do servidor) ──
  const fatorEmpresa = useFator({ empresaId, vendedorId: vendedorId || null, comissoes: comissaoEditada, lucro: lucroEditado }, !!empresaId)
  const fr = fatorEmpresa.fator
  const semFator = !!fr && !fr.pronto
  const dfPct = fr?.pronto ? fr.dfPct : 0
  const dvSem = fr?.pronto ? fr.dvSemLucro : 0
  // Lucro da linha (ajustável) e o da empresa, que é o piso: abaixo dele vai para aprovação.
  const lucroEmpresa = fr?.lucroPadrao ?? 0
  const lucro = lucroEditado ?? lucroEmpresa
  const comissaoAtual = comissaoEditada ?? fr?.comissoesPadrao ?? 0

  // ── custos da operação ──
  const totalFicha = (fichaId: string) => {
    const f = fichas.find((x) => x.id === fichaId)
    return f ? calcularFicha(colunasDe(f), f.valores, formulaDe(f)).total : 0
  }
  const addLinha = () => setLinhas((l) => [...l, { id: crypto.randomUUID(), fichaId: '', quantidade: 1 }])
  const updLinha = (id: string, p: Partial<LinhaCusto>) => setLinhas((l) => l.map((x) => (x.id === id ? { ...x, ...p } : x)))
  /**
   * Escolha no combo: um item, ou "todos os itens" de uma ficha. A ficha inteira troca esta
   * linha por uma linha para cada item dela (mesma quantidade); itens já lançados não repetem.
   */
  const escolherNaLinha = (linha: LinhaCusto, valor: string) => {
    if (!valor.startsWith('grupo:')) return updLinha(linha.id, { fichaId: valor })
    const grupoId = valor.slice('grupo:'.length)
    setLinhas((atuais) => {
      const jaLancados = new Set(atuais.filter((x) => x.id !== linha.id).map((x) => x.fichaId))
      const novas = fichas
        .filter((x) => x.grupoId === grupoId && !jaLancados.has(x.id))
        .map((x) => ({ id: crypto.randomUUID(), fichaId: x.id, quantidade: linha.quantidade || 1 }))
      const i = atuais.findIndex((x) => x.id === linha.id)
      return [...atuais.slice(0, i), ...novas, ...atuais.slice(i + 1)]
    })
  }
  // Itens agrupados por ficha no combo (como o plano de contas); item sem ficha vai no fim.
  const gruposDoCombo = [
    ...grupos.map((g) => ({ id: g.id, nome: g.nome, itens: fichas.filter((x) => x.grupoId === g.id) })),
    { id: '', nome: 'Sem ficha', itens: fichas.filter((x) => !grupos.some((g) => g.id === x.grupoId)) },
  ].filter((g) => g.itens.length > 0)
  const rmLinha = (id: string) => setLinhas((l) => l.filter((x) => x.id !== id))
  const custoFichas = linhas.reduce((a, l) => a + totalFicha(l.fichaId) * Math.max(0, l.quantidade), 0)
  const efeitos = efeitosDosCampos(campos, valores)
  // Custo total da operação: fichas + campos que somam ao custo, com o % sobre o custo, vezes o
  // campo que multiplica (quando a empresa configurou um).
  const custoOperacao = round2((custoFichas + efeitos.custoExtra) * (1 + efeitos.pctCusto) * efeitos.multiplicador)
  const temCusto = custoOperacao > 0

  // ── ICMS: o campo ICMS dos Dados da Operação (origem × destino), só em empresa contribuinte ──
  const campoIcms = campos.find((c) => c.tipo === 'icms')
  const aliqIcms = campoIcms ? Math.min(0.5, Math.max(0, numeroDe(valores[campoIcms.chave]))) : 0
  const aplicaIcmsEfetivo = aliqIcms > 0

  // ── preço: servidor é a fonte da verdade; o local só cobre o instante até responder ──
  const srv = usePrecoServidor(
    {
      empresaId,
      custo: custoOperacao,
      lucroDesejado: lucroEditado,
      desconto,
      valorNf: 0,
      aplicaIcms: aplicaIcmsEfetivo,
      ufDestinoId: null,
      aliquotaIcms: aliqIcms,
      custoPercentualServico: 0,
      comissoes: comissaoEditada,
      vendedorId: vendedorId || null,
    },
    temCusto && !!empresaId && !!fr?.pronto,
  )
  const fatorVal = srv?.fator ?? (fr?.pronto ? fr.fator : 0)
  const localPv = round2(precoVenda(custoOperacao, 0, fatorVal))
  const pv = srv?.pv ?? localPv
  const pvComDesconto = srv?.pvComDesconto ?? round2(localPv * (1 - desconto))
  const precoCalculado = round2(srv?.fiscal.precoFinal ?? (aplicaIcmsEfetivo && aliqIcms < 1 ? pvComDesconto / (1 - aliqIcms) : pvComDesconto))
  const margemCalculada = srv?.margem ?? calcMargem(pvComDesconto, custoOperacao, dfPct, dvSem)
  const precoNegociado = precoEditado !== null && precoEditado > 0
  const reverso = precoNegociado ? precoParaMargem(precoEditado, 0, aliqIcms, aplicaIcmsEfetivo, pv, custoOperacao, dfPct, dvSem) : null
  const precoFinal = precoNegociado ? round2(precoEditado) : precoCalculado
  const margemVigente = reverso?.margem ?? margemCalculada
  // O mínimo é o fator com o lucro da empresa: margem abaixo dele (lucro da linha menor, desconto ou
  // preço negociado) vai para alerta (gestor) ou aprovação (vendedor).
  const abaixoDoMinimo = lucroEmpresa > 0 && temCusto && margemVigente.ml < lucroEmpresa - 0.00005
  const diferencaPct = precoNegociado && precoCalculado > 0 ? (precoFinal - precoCalculado) / precoCalculado : 0
  // Ad valorem: fora do markup, soma ao frete peso (o preço acima) e compõe o frete total.
  const temAdValorem = campos.some((c) => c.tipo === 'advalorem')
  const adValorem = adValoremDosCampos(campos, valores)
  const freteTotal = round2(precoFinal + adValorem.total)

  // ── retrato do item ──
  const nomeCadastro = (origem: string, id: string): string => {
    if (!id) return ''
    if (origem === 'cliente') return clientes.find((x) => x.id === id)?.nomeFantasia || clientes.find((x) => x.id === id)?.nome || ''
    if (origem === 'fornecedor') {
      const f = (fornecedoresData ?? []).find((x) => x.id === id)
      return f?.nomeFantasia || f?.nome || ''
    }
    if (origem === 'vendedor') return vendedores.find((x) => x.id === id)?.nome ?? ''
    if (origem === 'servico') return (servicosData ?? []).find((x) => x.id === id)?.nome ?? ''
    if (origem === 'veiculo') {
      const v = (veiculosData ?? []).find((x) => x.id === id)
      return v ? nomeVeiculo(v) : ''
    }
    return ''
  }
  const retratoDados = (): DadoOperacaoItem[] =>
    campos.map((c) => {
      const v = valores[c.chave]
      const numerico = c.tipo === 'numero' || c.tipo === 'valor' || c.tipo === 'percentual' || c.tipo === 'advalorem' || c.tipo === 'icms'
      const texto =
        c.tipo === 'cadastro'
          ? nomeCadastro(c.cadastro, String(v ?? ''))
          : c.tipo === 'valor'
            ? (v ? formatBRL(Number(v)) : '')
            : c.tipo === 'percentual' || c.tipo === 'advalorem' || c.tipo === 'icms'
              ? (v ? formatPct(Number(v)) : '')
              : String(v ?? '')
      return { campoId: c.id, chave: c.chave, nome: c.nome, tipo: c.tipo, efeito: efeitoDe(c), texto, numero: numerico ? numeroDe(v) : 0 }
    })
  const retratoFichas = (): FichaItemProposta[] =>
    linhas
      .filter((l) => l.fichaId)
      .map((l) => {
        const f = fichas.find((x) => x.id === l.fichaId)
        const colunasItem = colunasDe(f)
        const calc = f ? calcularFicha(colunasItem, f.valores, formulaDe(f)) : null
        const unit = calc?.total ?? 0
        return {
          fichaId: l.fichaId,
          nome: f?.nome ?? '',
          grupo: f ? nomeGrupo(f.grupoId) : '',
          quantidade: l.quantidade,
          custoUnitario: unit,
          total: round2(unit * l.quantidade),
          composicao: (calc?.colunas ?? []).map((cc) => {
            const col = colunasItem.find((x) => x.chave === cc.chave)
            const numerica = !!col && TIPOS_NUMERICOS.includes(col.tipo)
            return { nome: cc.nome, tipo: col?.tipo ?? '', valor: numerica ? cc.valor : 0, texto: numerica ? '' : String(f?.valores[col?.id ?? ''] ?? ''), compoeTotal: cc.compoeTotal }
          }),
        }
      })

  // Serviço do item: o campo de cadastro "Serviço" dos Dados da operação, quando a empresa tem um.
  const campoServico = campos.find((c) => c.tipo === 'cadastro' && c.cadastro === 'servico')
  const servicoId = campoServico ? String(valores[campoServico.chave] ?? '') : ''
  const campoCliente = campos.find((c) => c.tipo === 'cadastro' && c.cadastro === 'cliente')

  // ── validação do item ──
  const obrigatoriosFaltando = campos.filter(
    (c) => c.obrigatorio && (valores[c.chave] === undefined || valores[c.chave] === '' || (efeitoDe(c) === 'multiplica' && numeroDe(valores[c.chave]) <= 0)),
  )
  const faltasItem = [
    semFator && (fr?.aviso ?? 'o fator da empresa não pôde ser calculado'),
    obrigatoriosFaltando.length > 0 && `preencha ${obrigatoriosFaltando.map((c) => c.nome).join(', ')}`,
    adValorem.linhas.some((l) => l.base <= 0) && 'informe o valor da mercadoria (o ad valorem incide sobre ele)',
    linhas.some((l) => !l.fichaId) && 'escolha o item de cada custo (ou remova a linha)',
    !temCusto && 'lance ao menos um custo pela ficha técnica',
    !descricao.trim() && 'descreva o item',
    editandoPreco && 'confirme o preço negociado ("Usar este preço") ou volte ao calculado',
  ].filter((f): f is string => !!f)

  const limparOperacao = () => {
    setLinhas([])
    setDescricao('')
    setPrecoEditado(null)
    setEditandoPreco(false)
    setDesconto(0)
    setTentou(false)
  }

  const adicionarItem = () => {
    if (faltasItem.length) {
      setTentou(true)
      return
    }
    const fichasItem = retratoFichas()
    // Compatível com o RPO e o PDF: cada ficha também vira uma linha de custo do item.
    const custos: CustoItemProposta[] = fichasItem.map((f) => ({
      tipoCustoId: f.fichaId,
      nome: f.quantidade !== 1 ? `${f.nome} × ${formatNumberBRL(f.quantidade).replace(/,00$/, '')}` : f.nome,
      modo: 'valor',
      base: '',
      percentual: 0,
      valor: f.total,
    }))
    setItens((l) => [
      ...l,
      {
        id: crypto.randomUUID(),
        descricao: descricao.trim(),
        servicoId,
        empresaId,
        custoTotal: custoOperacao,
        lucro,
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
        dadosOperacao: retratoDados(),
        adValorem: adValorem.total,
        tipoOperacaoId: tipoOperacao?.id ?? null,
        tipoOperacao: tipoOperacao?.nome ?? null,
        fichas: fichasItem,
      },
    ])
    // O cliente informado nos Dados da operação já vale para a proposta.
    if (!clienteAtual && campoCliente) {
      const c = clientes.find((x) => x.id === String(valores[campoCliente.chave] ?? ''))
      if (c) escolherCliente(c)
    }
    limparOperacao()
  }
  const rmItem = (id: string) => setItens((l) => l.filter((i) => i.id !== id))

  /** Devolve o item para o cálculo: campos, custos, desconto, comissão e preço voltam para a tela. */
  const editarItem = (it: ItemProposta) => {
    if (!it.fichas) return
    rmItem(it.id)
    setEmpresaId(it.empresaId)
    setEmpresaVista(it.empresaId)
    // Volta para o tipo de operação do item (sem recomeçar os valores que vêm a seguir).
    const tipoDoItem = tiposOperacao.some((t) => t.id === it.tipoOperacaoId) ? (it.tipoOperacaoId ?? '') : tipoOperacaoId
    setTipoEscolhido(tipoDoItem)
    setTipoVisto(tipoDoItem)
    const v: ValoresOperacao = {}
    for (const d of it.dadosOperacao ?? []) {
      const campo = todosCampos.find((c) => c.id === d.campoId)
      if (!campo) continue // campo removido depois: sai do item
      const atual = campo.tipo === 'cadastro' ? '' : undefined
      if (campo.tipo === 'cadastro') {
        // O retrato guarda o nome; procura o registro pelo nome para voltar ao campo.
        const origem = campo.cadastro
        const lista: { id: string; nome: string }[] =
          origem === 'cliente' ? clientes.map((x) => ({ id: x.id, nome: x.nomeFantasia || x.nome })) :
          origem === 'vendedor' ? vendedores.map((x) => ({ id: x.id, nome: x.nome })) :
          origem === 'servico' ? (servicosData ?? []).map((x) => ({ id: x.id, nome: x.nome })) :
          origem === 'veiculo' ? (veiculosData ?? []).map((x) => ({ id: x.id, nome: nomeVeiculo(x) })) :
          (fornecedoresData ?? []).map((x) => ({ id: x.id, nome: x.nomeFantasia || x.nome }))
        v[campo.chave] = lista.find((x) => x.nome === d.texto)?.id ?? atual ?? ''
      } else if (['numero', 'valor', 'percentual', 'advalorem', 'icms'].includes(campo.tipo)) v[campo.chave] = d.numero
      else v[campo.chave] = d.texto
    }
    setValores(v)
    setLinhas(it.fichas.map((f) => ({ id: crypto.randomUUID(), fichaId: f.fichaId, quantidade: f.quantidade })))
    setDesconto(it.desconto)
    setComissaoEditada(it.comissao ?? null)
    setLucroEditado(it.lucro ?? null)
    setDescricao(it.descricao)
    setPrecoEditado((it.precoCalculado ?? 0) > 0 ? it.precoFinal : null)
    setEditandoPreco(false)
    setTentou(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // ── proposta: totais e regras ──
  // Total da proposta = frete total de cada item (frete peso + ad valorem).
  const totalItens = itens.reduce((a, i) => a + i.precoFinal + (i.adValorem ?? 0), 0)
  const totalCalculado = itens.reduce((a, i) => a + (i.precoCalculado || i.precoFinal) + (i.adValorem ?? 0), 0)
  const temPrecoEditado = itens.some((i) => (i.precoCalculado ?? 0) > 0)
  const temAbaixoMinimo = itens.some((i) => i.abaixoMinimo)
  const precisaAprovacao = temPrecoEditado || (temAbaixoMinimo && !ehGestor)
  const modeloSel = modeloId || modelos[0]?.id || ''
  const bloqueioRegiao = clienteAtual && vendedorSel ? bloqueioDeRegiao(vendedorSel.regioesBloqueadas ?? [], clienteAtual.cidade) : null
  const faltaCliente = !clienteAtual
  const faltaValidade = !validadeSel
  const faltaModelo = !modeloSel
  const faltaJustificativa = precisaAprovacao && !justificativa.trim()
  const faltasProposta = [
    faltaCliente && (clienteTexto.trim() ? 'escolha o cliente na lista (ou cadastre-o)' : 'informe o cliente'),
    faltaValidade && 'escolha a validade',
    faltaModelo && 'escolha o modelo da proposta',
    faltaJustificativa && 'escreva a justificativa para pedir a aprovação',
    bloqueioRegiao && `o vendedor ${vendedorSel?.nome} não atende a região do cliente (${descreverRegiao(bloqueioRegiao)})`,
  ].filter((f): f is string => !!f)

  // Reabre uma proposta em rascunho (Propostas › lápis): itens e condições voltam para a tela.
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
    // Itens antigos podem vir sem serviço/custos: o servidor exige as listas presentes.
    setItens(p.itens.map((it) => ({ ...it, servicoId: it.servicoId ?? '', custos: it.custos ?? [] })))
    const c = clientes.find((x) => x.id === p.clienteId)
    if (c) {
      setClienteId(c.id)
      setClienteTexto(c.nomeFantasia || c.nome)
    } else setClienteTexto(p.cliente)
    if (p.vendedorId) setVendedorEscolhido(p.vendedorId)
    setPrazoEntrega(p.prazoEntrega ?? '')
    setValidade(p.validade ?? '')
    if (p.modeloId) setModeloId(p.modeloId)
    if (p.formaPagamento || p.prazoPagamentoDias) setPagamentoEditado({ forma: p.formaPagamento ?? '', prazo: p.prazoPagamentoDias ?? 0 })
    setJustificativa(p.justificativa ?? '')
    /* eslint-enable react-hooks/set-state-in-effect */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propostaParam, propostas, clientes.length])

  const gerarProposta = async () => {
    if (!itens.length) return
    if (faltasProposta.length > 0 || !clienteAtual) {
      setTentouGerar(true)
      return
    }
    setTentouGerar(false)
    setGerando(true)
    try {
      const dados = {
        cliente: clienteAtual.nomeFantasia || clienteAtual.nome,
        clienteId: clienteAtual.id,
        vendedorId,
        vendedorNome: vendedorSel?.nome ?? '',
        itens,
        total: round2(totalItens),
        modeloId: modeloSel || null,
        prazoEntrega: prazoEntrega.trim(),
        validade: validadeSel,
        formaPagamento,
        prazoPagamentoDias: prazoPagamento,
        precoOriginal: temPrecoEditado ? round2(totalCalculado) : 0,
        justificativa: precisaAprovacao ? justificativa.trim() : '',
      }
      if (propostaEditandoId) await atualizarProposta(propostaEditandoId, dados)
      else await criarProposta(dados)
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
  const nomeEmpresa = (id: string) => empresas.find((e) => e.id === id)?.nome ?? ''

  if (!carregando && empresas.length === 0) {
    return (
      <div>
        <PageHeader breadcrumb="Comercial" title="Pricing" subtitle="Cadastre uma empresa para precificar." />
        <div className={base.card}>Para precificar, cadastre primeiro uma empresa em Cadastros › Empresas.</div>
      </div>
    )
  }

  return (
    <>
      <PageHeader
        breadcrumb="Comercial"
        title="Pricing"
        subtitle={
          propostaEditando
            ? `Editando a proposta ${propostaEditando.numero} (rascunho): ajuste os itens e salve.`
            : 'Preencha os dados da operação e os custos pela ficha técnica: o preço sai com o fator da empresa.'
        }
        action={
          <div className={s.selecoes}>
            <label className={s.empresaSel}>
              Empresa
              <select value={empresaId} onChange={(e) => setEmpresaId(e.target.value)} disabled={carregando}>
                {empresas.map((e) => (
                  <option key={e.id} value={e.id}>{e.nome}</option>
                ))}
              </select>
            </label>
            {/* Só aparece quando a empresa tem mais de um tipo (com um só, não há o que escolher). */}
            {tiposOperacao.length > 1 && (
              <label className={s.empresaSel}>
                Tipo de operação
                <select value={tipoOperacaoId} onChange={(e) => setTipoEscolhido(e.target.value)}>
                  {tiposOperacao.map((t) => (
                    <option key={t.id} value={t.id}>{t.nome}</option>
                  ))}
                </select>
              </label>
            )}
          </div>
        }
      />

      {semFator && (
        <div className={base.alertaPiso} role="alert">
          <AlertTriangle size={16} />
          <span>
            O Pricing desta empresa está bloqueado: {fr?.aviso} <Link to="/analises/metas">Abrir Metas</Link>
          </span>
        </div>
      )}

      {/* ── 1. Dados da operação ── */}
      <section className={base.card}>
        <div className={base.cardTitle}>
          <Receipt /> Dados da operação
          <Link to="/cadastros/campos-operacao" className={s.linkConfig} title="Configurar os campos desta empresa"><Settings2 size={12} /> configurar campos</Link>
        </div>
        <BlocoDadosOperacao empresaId={empresaId} campos={campos} valores={valores} onChange={(k, v) => setValores((p) => ({ ...p, [k]: v }))} mostrarFaltas={tentou} />
      </section>

      {/* ── 2. Custos pela ficha técnica (quantidade por custo) ── */}
      <section className={`${base.card} ${s.secao}`}>
        <div className={base.cardTitle}>
          <ClipboardList /> Custos da operação
          <Hint text="Cada linha é um item de uma ficha (Funcionários, Tecnologia...) vezes a quantidade dele. Escolher a ficha inteira lança todos os itens dela. Passe o mouse no olho para ver a composição." />
          <Link to="/cadastros/fichas-tecnicas" className={s.linkConfig}><Settings2 size={12} /> fichas técnicas</Link>
        </div>
        {linhas.length > 0 && (
          <table className={s.custos}>
            <thead>
              <tr>
                <th>Item</th>
                <th className={s.r} style={{ width: 90 }}>Qtd.</th>
                <th className={s.r} style={{ width: 140 }}>Custo unitário</th>
                <th className={s.r} style={{ width: 140 }}>Total</th>
                <th style={{ width: 60 }} />
              </tr>
            </thead>
            <tbody>
              {linhas.map((l) => {
                const f = fichas.find((x) => x.id === l.fichaId)
                const colunasItem = colunasDe(f)
                const calc = f ? calcularFicha(colunasItem, f.valores, formulaDe(f)) : null
                const unit = calc?.total ?? 0
                return (
                  <tr key={l.id} className={aberta === l.id ? s.linhaAberta : ''}>
                    <td>
                      <div className={s.fichaCell}>
                        <select className={`${base.select} ${tentou && !l.fichaId ? base.campoErro : ''}`} value={l.fichaId} onChange={(e) => escolherNaLinha(l, e.target.value)}>
                          <option value="">Escolha o item</option>
                          {gruposDoCombo.map((g) => (
                            <optgroup key={g.id || 'sem-ficha'} label={g.nome}>
                              {g.id && g.itens.length > 1 && <option value={`grupo:${g.id}`}>Todos os itens de {g.nome} ({g.itens.length})</option>}
                              {g.itens.map((x) => (
                                <option key={x.id} value={x.id}>{x.nome}</option>
                              ))}
                            </optgroup>
                          ))}
                        </select>
                        {f && calc && (
                          <span className={s.olho} onMouseEnter={() => setAberta(l.id)} onMouseLeave={() => setAberta('')} onClick={() => setAberta(aberta === l.id ? '' : l.id)} title="Composição da ficha">
                            <Eye size={16} />
                            {aberta === l.id && (
                              <div className={s.popover}>
                                <b>{nomeGrupo(f.grupoId) ? `${nomeGrupo(f.grupoId)} › ` : ''}{f.nome}</b>
                                {calc.colunas.map((c) => {
                                  const col = colunasItem.find((x) => x.chave === c.chave)
                                  if (!col) return null
                                  const numerica = TIPOS_NUMERICOS.includes(col.tipo)
                                  return (
                                    <div key={c.chave} className={c.compoeTotal ? '' : s.fora}>
                                      <span>{c.nome}</span>
                                      <em>{numerica ? formatNumberBRL(c.valor) : String(f.valores[col.id] ?? '—')}</em>
                                    </div>
                                  )
                                })}
                                <div className={s.popTotal}><span>Total do item</span><em>{formatBRL(calc.total)}</em></div>
                              </div>
                            )}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className={s.r}>
                      <input
                        className={`${base.extraInput} ${s.qtd}`}
                        inputMode="decimal"
                        value={l.quantidade}
                        onChange={(e) => updLinha(l.id, { quantidade: Math.max(0, numeroDe(e.target.value.replace(/[^\d.,]/g, ''))) })}
                        aria-label="Quantidade"
                      />
                    </td>
                    <td className={`${s.r} ${s.mono}`}>{formatBRL(unit)}</td>
                    <td className={`${s.r} ${s.mono} ${s.forte}`}>{formatBRL(unit * l.quantidade)}</td>
                    <td className={s.r}>
                      <button type="button" className={base.rmBtn} onClick={() => rmLinha(l.id)} title="Remover"><Trash2 size={14} /></button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
        <div className={s.custosRodape}>
          <button type="button" className={base.addBtn} onClick={addLinha}><Plus /> Adicionar custo</button>
          {linhas.length === 0 && <span className={base.mutedNote}>Escolha um item (ex.: Funcionários › Porteiro Diurno) ou a ficha inteira, e a quantidade.</span>}
          {linhas.length > 0 && <span className={s.custosTotal}>Custo das fichas <b>{formatBRL(custoFichas)}</b></span>}
        </div>
        {fichas.length === 0 && <div className={base.faltas}>Esta empresa ainda não tem itens nas fichas técnicas. Cadastre em <Link to="/cadastros/fichas-tecnicas">Parametrizações › Ficha Técnica</Link>.</div>}
      </section>

      {/* ── 3. Resultado ── */}
      <section className={`${base.card} ${s.secao}`}>
        <div className={base.cardTitle}><Calculator /> Resultado</div>
        <div className={s.resultado}>
          <div>
            <div className={base.finalBox}>
              <div>
                <div className={base.finalLabel}>
                  {temAdValorem ? 'Frete peso' : 'Preço final'}{aplicaIcmsEfetivo ? ` (com ICMS ${formatPct(aliqIcms)})` : ''}
                  {precoNegociado && <span className={base.negociadoTag}>negociado</span>}
                </div>
                {precoNegociado && editandoPreco ? (
                  <div className={base.finalEdit}>
                    <MoneyInput value={precoEditado ?? 0} onChange={(v) => setPrecoEditado(v)} />
                    <button type="button" className={base.finalEditBtn} onClick={() => setEditandoPreco(false)} disabled={(precoEditado ?? 0) <= 0} title="Confirmar o preço negociado">
                      <Check size={14} /> Usar este preço
                    </button>
                    <button type="button" className={base.finalEditBtn} onClick={() => { setPrecoEditado(null); setEditandoPreco(false) }} title="Voltar ao preço calculado">
                      <RotateCcw size={14} /> Voltar ao calculado
                    </button>
                  </div>
                ) : (
                  <div className={base.finalVal}>
                    {formatBRL(precoFinal)}
                    {precoNegociado ? (
                      <>
                        <button type="button" className={base.finalEditBtn} onClick={() => setEditandoPreco(true)} title="Alterar o preço negociado"><Pencil size={14} /> Alterar</button>
                        <button type="button" className={base.finalEditBtn} onClick={() => setPrecoEditado(null)} title="Voltar ao preço calculado"><RotateCcw size={14} /> Voltar ao calculado</button>
                      </>
                    ) : (
                      <button type="button" className={base.finalEditBtn} onClick={() => { setPrecoEditado(precoCalculado); setEditandoPreco(true) }} disabled={precoCalculado <= 0} title="Informar o preço fechado com o cliente">
                        <Pencil size={14} /> Editar preço
                      </button>
                    )}
                  </div>
                )}
              </div>
              <div className={base.finalMeta}>
                {nomeEmpresa(empresaId)}
                <br />
                {podeVerCalculo ? <b>fator {fatorVal ? fator4(fatorVal) : '—'}</b> : aplicaIcmsEfetivo ? <b>ICMS {formatPct(aliqIcms)}</b> : <b>sem ICMS</b>}
              </div>
            </div>

            {temAdValorem && (
              <div className={base.reverso}>
                <div className={base.reversoLinha}><span>Frete peso</span><b>{formatBRL(precoFinal)}</b></div>
                {adValorem.linhas.map((l) => (
                  <div key={l.nome} className={base.reversoLinha}>
                    <span>+ {l.nome} ({formatPct(l.pct)} de {l.base > 0 ? formatBRL(l.base) : 'valor da mercadoria não informado'})</span>
                    <b>{formatBRL(l.valor)}</b>
                  </div>
                ))}
                {adValorem.linhas.length === 0 && <div className={base.reversoLinha}><span>+ Ad valorem</span><b>—</b></div>}
                <div className={base.reversoLinha}><span><b>= Frete total</b> (fora do markup)</span><b>{formatBRL(freteTotal)}</b></div>
              </div>
            )}
            {abaixoDoMinimo && (
              <div className={`${base.alertaPiso} ${ehGestor ? base.alertaPisoGestor : ''}`} role="alert">
                <AlertTriangle size={16} />
                <span>
                  {ehGestor
                    ? `Atenção: o preço ficou abaixo do fator da empresa (margem abaixo do lucro de ${formatPct(lucroEmpresa)}). Como gestor, você pode seguir.`
                    : `O preço ficou abaixo do fator da empresa (margem abaixo do lucro de ${formatPct(lucroEmpresa)}). Ao gerar, a proposta vai para aprovação com a sua justificativa.`}
                </span>
              </div>
            )}
            {precoNegociado && (
              <div className={base.reverso}>
                <div className={base.reversoLinha}><span>Preço calculado</span><b>{formatBRL(precoCalculado)}</b></div>
                <div className={base.reversoLinha}>
                  <span>Diferença sobre o calculado</span>
                  <b className={diferencaPct < 0 ? base.reversoRuim : ''}>
                    {diferencaPct >= 0 ? '+' : '−'}{formatPct(Math.abs(diferencaPct))} ({diferencaPct >= 0 ? 'acréscimo' : 'desconto'})
                  </b>
                </div>
              </div>
            )}

            <div className={s.ajustes}>
              <div className={base.inputBlock}>
                <label className={base.inputLabel}>Desconto (%) <Hint text="Desconto deste serviço (cada item tem o seu). Baixa a margem; abaixo do lucro da empresa pede aprovação." /></label>
                <PercentInput value={desconto} onChange={setDesconto} />
              </div>
              <div className={base.inputBlock}>
                <label className={base.inputLabel}>Comissão (%) <Hint text="Vem da regra do vendedor ou da empresa. Baixe aqui para chegar num preço competitivo sem mexer no lucro." /></label>
                <PercentInput value={comissaoAtual} onChange={(n) => setComissaoEditada(n)} />
                {comissaoEditada !== null && fr && comissaoEditada !== fr.comissoesPadrao && (
                  <div className={base.inputHint}>
                    Padrão {formatPct(fr.comissoesPadrao)}. <button type="button" className={base.linkBtn} onClick={() => setComissaoEditada(null)}>Voltar ao padrão</button>
                  </div>
                )}
              </div>
              <div className={base.inputBlock}>
                <label className={base.inputLabel}>Lucro (%) <Hint text="Vem do cadastro da empresa. Pode subir ou descer nesta linha; abaixo do lucro da empresa, a proposta vai para aprovação." /></label>
                <PercentInput value={lucro} onChange={(n) => setLucroEditado(n)} />
                {lucroEditado !== null && fr && lucroEditado !== lucroEmpresa && (
                  <div className={base.inputHint}>
                    Da empresa {formatPct(lucroEmpresa)}. <button type="button" className={base.linkBtn} onClick={() => setLucroEditado(null)}>Voltar ao da empresa</button>
                  </div>
                )}
              </div>
            </div>

            <div className={s.descricaoRow}>
              <div className={base.inputBlock} style={{ flex: 1 }}>
                <label className={base.inputLabel}>Descrição do item <span className={base.obrig}>*</span></label>
                <input className={`${base.extraInput} ${tentou && !descricao.trim() ? base.campoErro : ''}`} style={{ width: '100%' }} value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Ex.: 2 postos de portaria diurna, 12 meses" />
              </div>
              <button type="button" className={`${ui.btn} ${ui.btnPrimary}`} onClick={adicionarItem}><Plus /> Adicionar à proposta</button>
            </div>
            {tentou && faltasItem.length > 0 && <div className={base.faltas} role="alert">Para adicionar o item: {faltasItem.join('; ')}.</div>}
          </div>

          <div className={s.memoria}>
            <div className={base.memTitle}>Composição do custo</div>
            {linhas.filter((l) => l.fichaId).map((l) => (
              <div key={l.id} className={base.memRow}>
                <span className={base.memLabel}>{fichas.find((x) => x.id === l.fichaId)?.nome} <span className={base.memSub}>× {formatNumberBRL(l.quantidade).replace(/,00$/, '')}</span></span>
                <span className={base.memVal}>{formatBRL(totalFicha(l.fichaId) * l.quantidade)}</span>
              </div>
            ))}
            {efeitos.linhas.map((e) => (
              <div key={e.nome} className={base.memRow}>
                <span className={base.memLabel}>{e.nome} <span className={base.memSub}>{e.efeito === 'multiplica' ? 'multiplica' : e.efeito === 'pct-custo' ? '% sobre o custo' : 'soma ao custo'}</span></span>
                <span className={base.memVal}>{e.efeito === 'multiplica' ? `× ${formatNumberBRL(e.valor)}` : e.efeito === 'pct-custo' ? formatPct(e.valor) : formatBRL(e.valor)}</span>
              </div>
            ))}
            <div className={`${base.memRow} ${base.memTotal}`}>
              <span className={base.memLabel}>Custo da operação</span>
              <span className={base.memVal}>{formatBRL(custoOperacao)}</span>
            </div>
            {podeVerCalculo && fr?.pronto && (
              <>
                <div className={base.memRow}><span className={base.memLabel}>× Fator (DF {formatPct(dfPct)} + DV {formatPct(dvSem)} + lucro {formatPct(lucro)})</span><span className={base.memVal}>{fator4(fatorVal)}</span></div>
                <div className={base.memRow}><span className={base.memLabel}>= Preço de venda</span><span className={base.memVal}>{formatBRL(pv)}</span></div>
                {desconto > 0 && <div className={base.memRow}><span className={base.memLabel}>(−) Desconto {formatPct(desconto)}</span><span className={base.memVal}>{formatBRL(pv - pvComDesconto)}</span></div>}
                {aplicaIcmsEfetivo && <div className={base.memRow}><span className={base.memLabel}>÷ (1 − ICMS {formatPct(aliqIcms)}) = frete com ICMS</span><span className={base.memVal}>{formatBRL(precoCalculado)}</span></div>}
                <div className={base.memRow}><span className={base.memLabel}>Margem líquida</span><span className={`${base.mlBadge} ${abaixoDoMinimo ? base.mlBadgeRuim : ''}`}>{formatPct(margemVigente.ml)}</span></div>
              </>
            )}
            {!temCusto && <div className={base.mutedNote} style={{ marginTop: 8 }}>Lance um custo para ver o preço.</div>}
          </div>
        </div>
      </section>

      {/* ── 4. Itens e geração da proposta ── */}
      {itens.length > 0 && (
        <section className={base.itensCard}>
          <div className={base.cardTitle}><FileText /> Itens da proposta ({itens.length})</div>
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
                    {(it.fichas ?? []).length > 0 && <div className={ui.cellMut} style={{ fontWeight: 500 }}>{(it.fichas ?? []).map((f) => `${f.nome} × ${formatNumberBRL(f.quantidade).replace(/,00$/, '')}`).join(' · ')}</div>}
                    {it.abaixoMinimo && <div className={base.itemAviso}>abaixo do fator da empresa</div>}
                  </td>
                  <td className={ui.cellMut}>{nomeEmpresa(it.empresaId)}</td>
                  {podeVerCalculo && <td className={ui.right}>{formatBRL(it.custoTotal)}</td>}
                  <td className={ui.right}>{it.desconto > 0 ? formatPct(it.desconto) : '—'}</td>
                  <td className={`${ui.right} ${ui.cellStrong}`}>
                    {formatBRL(it.precoFinal)}
                    {(it.precoCalculado ?? 0) > 0 && <div className={base.precoOriginal}>calculado {formatBRL(it.precoCalculado ?? 0)}</div>}
                    {(it.adValorem ?? 0) > 0 && <div className={base.precoOriginal}>+ ad valorem {formatBRL(it.adValorem ?? 0)} = {formatBRL(it.precoFinal + (it.adValorem ?? 0))}</div>}
                  </td>
                  {podeVerCalculo && <td className={ui.right}>{formatPct(it.ml)}</td>}
                  <td className={ui.colActions}>
                    <button
                      type="button"
                      className={base.rmBtn}
                      onClick={() => editarItem(it)}
                      disabled={!it.fichas}
                      title={it.fichas ? 'Voltar para o cálculo: ajuste e readicione' : 'Item feito no Pricing antigo: para mudar, remova e lance de novo'}
                    >
                      <Undo2 size={15} />
                    </button>
                    <button type="button" className={base.rmBtn} onClick={() => rmItem(it.id)} title="Remover"><Trash2 size={15} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className={base.gerarGrid}>
            <div className={base.gerarCampo}>
              <label className={base.inputLabel}>Cliente <span className={base.obrig}>*</span> <Hint text="Só cliente do cadastro: pagamento, prazo e região vêm de lá. Busque por nome ou CNPJ." /></label>
              <ClienteAutocomplete clientes={clientes} value={clienteTexto} clienteId={clienteAtual?.id ?? ''} onChange={digitarCliente} onSelect={escolherCliente} className={`${base.select} ${tentouGerar && faltaCliente ? base.campoErro : ''}`} />
              {!clienteAtual && clienteTexto.trim() && (
                <div className={base.clienteNovo}>
                  <span>Este cliente não está no cadastro.</span>
                  <Link to={`/cadastros/clientes?novo=${encodeURIComponent(clienteTexto.trim())}`} className={`${ui.btn} ${ui.btnGhost}`}><UserPlus /> Cadastrar cliente</Link>
                </div>
              )}
            </div>
            <div className={base.gerarCampo}>
              <label className={base.inputLabel}>Vendedor <Hint text="Vem do seu usuário (elo no cadastro de Vendedores). Troque só ao precificar em nome de um representante." /></label>
              <select className={`${base.select} ${bloqueioRegiao ? base.campoErro : ''}`} value={vendedorId} onChange={(e) => setVendedorEscolhido(e.target.value)}>
                <option value="">{meuVendedor ? 'Selecione' : 'Seu usuário não está ligado a um vendedor'}</option>
                {vendedores.map((v) => (
                  <option key={v.id} value={v.id}>{v.nome}</option>
                ))}
              </select>
              {bloqueioRegiao && <div className={base.inputHint} style={{ color: '#c0392b' }}>Bloqueado: {descreverRegiao(bloqueioRegiao)} (cliente em {clienteAtual?.cidade}).</div>}
            </div>
            <div className={base.gerarCampo}>
              <label className={base.inputLabel}>Forma de pagamento <Hint text="Vem do cadastro do cliente. Alterar exige a permissão especial." /></label>
              <select className={base.select} value={formaPagamento} disabled={!podeAlterarPagamento} onChange={(e) => setPagamentoEditado({ forma: e.target.value, prazo: prazoPagamento })}>
                <option value="">Não combinada</option>
                {FORMAS_PAGAMENTO.map((f) => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </div>
            <div className={base.gerarCampo}>
              <label className={base.inputLabel}>Prazo de pagamento (dias)</label>
              <input type="number" min={0} className={base.select} value={prazoPagamento} disabled={!podeAlterarPagamento} onChange={(e) => setPagamentoEditado({ forma: formaPagamento, prazo: Math.max(0, Math.trunc(Number(e.target.value) || 0)) })} />
            </div>
            <div className={base.gerarCampo}>
              <label className={base.inputLabel}>Prazo de entrega</label>
              <input className={base.select} value={prazoEntrega} onChange={(e) => setPrazoEntrega(e.target.value)} placeholder="Ex.: 3 dias úteis" />
            </div>
            <div className={base.gerarCampo}>
              <label className={base.inputLabel}>Validade <span className={base.obrig}>*</span></label>
              <select className={`${base.select} ${tentouGerar && faltaValidade ? base.campoErro : ''}`} value={validadeSel} onChange={(e) => setValidade(e.target.value)}>
                <option value="">{validades.length ? 'Selecione' : 'Nenhuma cadastrada'}</option>
                {validades.map((v) => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
              {validades.length === 0 && (
                <span className={ui.errMsg}>
                  Cadastre as validades em <Link to="/cadastros/unidades">Cadastros › Empresas</Link>, aba Proposta.
                </span>
              )}
            </div>
            <div className={base.gerarCampo}>
              <label className={base.inputLabel}>Modelo da proposta <span className={base.obrig}>*</span></label>
              <select className={`${base.select} ${tentouGerar && faltaModelo ? base.campoErro : ''}`} value={modeloSel} onChange={(e) => setModeloId(e.target.value)}>
                {modelos.length === 0 && <option value="">Nenhum cadastrado</option>}
                {modelos.map((m) => (
                  <option key={m.id} value={m.id}>{nomeEmpresa(m.empresaId) || 'Modelo'} · {m.nome}</option>
                ))}
              </select>
            </div>
          </div>

          <div className={base.gerarRow}>
            <span className={base.itensTotal}>Total: {formatBRL(totalItens)}</span>
            <div style={{ flex: 1 }} />
            <button type="button" className={`${ui.btn} ${ui.btnPrimary}`} onClick={gerarProposta} disabled={gerando}>
              {gerando ? 'Salvando...' : precisaAprovacao ? <><ShieldCheck /> Solicitar aprovação</> : propostaEditando ? <><FileText /> Salvar proposta {propostaEditando.numero}</> : <><FileText /> Gerar proposta</>}
            </button>
          </div>
          {tentouGerar && faltasProposta.length > 0 && (
            <div className={base.faltas} role="alert">Para {precisaAprovacao ? 'solicitar a aprovação' : 'gerar a proposta'}: {faltasProposta.join(', ')}.</div>
          )}
          {precisaAprovacao && (
            <div className={base.justificativaBox}>
              <label className={base.inputLabel}>
                {temPrecoEditado ? 'Justificativa do preço negociado' : 'Justificativa do preço abaixo do fator'} <span className={base.obrig}>*</span>
              </label>
              <textarea className={`${base.justificativa} ${tentouGerar && faltaJustificativa ? base.campoErro : ''}`} value={justificativa} onChange={(e) => setJustificativa(e.target.value)} rows={2} placeholder="Ex.: cliente apresentou proposta concorrente e temos volume recorrente." />
              {temPrecoEditado && (
                <div className={base.justificativaNota}>
                  Preço calculado: <b>{formatBRL(round2(totalCalculado))}</b> · Preço solicitado: <b>{formatBRL(round2(totalItens))}</b>
                </div>
              )}
            </div>
          )}
        </section>
      )}
    </>
  )
}

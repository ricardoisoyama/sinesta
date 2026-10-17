import type { RegiaoBloqueada } from './regiao'

/** Pessoa jurídica ou física (vale para cliente, fornecedor e vendedor). */
export type TipoPessoa = 'juridica' | 'fisica'

export const TIPOS_PESSOA: { valor: TipoPessoa; label: string }[] = [
  { valor: 'juridica', label: 'Pessoa jurídica' },
  { valor: 'fisica', label: 'Pessoa física' },
]

/** Papel da pessoa na compra (influencia CRM e proposta). */
export type PerfilCompra = '' | 'influenciador' | 'decisor'
export const PERFIS_COMPRA: { valor: PerfilCompra; label: string }[] = [
  { valor: '', label: 'Não informado' },
  { valor: 'influenciador', label: 'Influenciador' },
  { valor: 'decisor', label: 'Decisor' },
]

/** Uma pessoa de contato no cliente/fornecedor. */
export interface Contato {
  id: string
  nome: string
  cargo: string
  telefone: string
  email: string
  perfilCompra: PerfilCompra
  /** Parametrização de envio: este contato recebe fatura, boleto e/ou nota fiscal. */
  recebeFatura: boolean
  recebeBoleto: boolean
  recebeNotaFiscal: boolean
}

export const novoContato = (): Contato => ({
  id: crypto.randomUUID(),
  nome: '',
  cargo: '',
  telefone: '',
  email: '',
  perfilCompra: '',
  recebeFatura: false,
  recebeBoleto: false,
  recebeNotaFiscal: false,
})

export type TipoConta = '' | 'corrente' | 'poupanca'

/** Dados bancários (aba comum a empresa, cliente, fornecedor e vendedor). */
export interface DadosBancarios {
  banco: string
  agencia: string
  conta: string
  tipoConta: TipoConta
  pix: string
  // ── conta no exterior (fornecedor estrangeiro) ──
  /** Titular da conta (beneficiary). */
  beneficiario?: string
  /** SWIFT/BIC do banco (8 ou 11 caracteres). */
  swift?: string
  /** IBAN (Europa) ou número da conta. */
  iban?: string
  /** Código de roteamento: ABA (EUA), Sort code (Reino Unido), BSB (Austrália)... */
  roteamento?: string
}

export const bancoVazio = (): DadosBancarios => ({ banco: '', agencia: '', conta: '', tipoConta: '', pix: '', beneficiario: '', swift: '', iban: '', roteamento: '' })

/** Endereço (a cidade fica no campo Cidade: "Praia Grande - SP" no Brasil, livre no exterior). */
export interface Endereco {
  /** CEP no Brasil; ZIP / código postal no exterior. */
  cep: string
  logradouro: string
  numero: string
  complemento: string
  bairro: string
  /** Estado / província (exterior; no Brasil a UF já vai na cidade). */
  estado?: string
}

export const enderecoVazio = (): Endereco => ({ cep: '', logradouro: '', numero: '', complemento: '', bairro: '', estado: '' })

export const SEGMENTOS = ['Indústria', 'Serviços', 'Governo', 'Pessoa Física', 'Outros'] as const

/** Perfil de negócio do cliente. */
export type PerfilNegocio = '' | 'B2B' | 'B2C' | 'B2G'
export const PERFIS_NEGOCIO: PerfilNegocio[] = ['B2B', 'B2C', 'B2G']

export type TipoFornecimento = '' | 'produto' | 'servico'
export type NaturezaCusto = '' | 'fixo' | 'variavel'

/** Formas de pagamento combinadas com o cliente (vão para a proposta). */
export const FORMAS_PAGAMENTO = ['Pix', 'Boleto', 'Transferência', 'Cartão', 'Dinheiro'] as const
/** Prazos usuais (dias). O campo aceita qualquer número. */
export const PRAZOS_PAGAMENTO = [0, 7, 15, 30, 45, 60, 90] as const

/** Moedas mais usadas em fornecedor do exterior. */
export const MOEDAS = ['USD', 'EUR', 'GBP', 'ARS', 'CLP', 'MXN', 'BRL'] as const
export const PAISES = [
  'Estados Unidos', 'Argentina', 'Chile', 'Uruguai', 'Paraguai', 'México', 'Canadá', 'Reino Unido',
  'Alemanha', 'França', 'Espanha', 'Portugal', 'Itália', 'Irlanda', 'Holanda', 'Suíça', 'Israel',
  'Índia', 'China', 'Japão', 'Coreia do Sul', 'Singapura', 'Austrália',
] as const

/** Cadastro comum a Cliente e Fornecedor (mesma base, telas separadas). */
export interface Parceiro {
  id: string
  tipo: TipoPessoa
  nome: string
  nomeFantasia: string
  cpfCnpj: string
  inscricaoEstadual: string
  inscricaoMunicipal: string
  /** Contato principal (legado). Continua gravado como espelho do primeiro contato da lista. */
  contato: string
  telefone: string
  email: string
  cidade: string
  /** Rua, número, bairro e CEP (nulo nos registros antigos). */
  endereco?: Endereco | null
  observacao: string
  status: 'ativo' | 'inativo'

  contatos: Contato[]
  segmento: string
  /** Nome do grupo econômico; empresas com o mesmo nome formam um grupo. */
  grupoEconomico: string
  centroCustoId: string
  banco: DadosBancarios

  // ── Só cliente ─────────────────────────────────────────────
  perfil?: PerfilNegocio
  vendedorSdrId?: string
  vendedorSalesId?: string
  vendedorCsId?: string
  /** Forma de pagamento combinada (ex.: Boleto). Vai para a proposta. */
  formaPagamento?: string
  /** Prazo de pagamento em dias (0 = à vista). */
  prazoPagamentoDias?: number

  // ── Só fornecedor ──────────────────────────────────────────
  tipoFornecimento?: TipoFornecimento
  naturezaCusto?: NaturezaCusto
  /** Conta do plano de contas em que as despesas deste fornecedor entram. */
  planoContaId?: string
  /** Funcionário (usuário) responsável pelas compras deste fornecedor. */
  compradorId?: string
  /** Funcionários que aprovam compras deste fornecedor. */
  aprovadores?: string[]
  /** Limite de compra sem aprovação (R$). 0 = sem limite. */
  limiteCompra?: number
  /** Fornecedor do exterior: sem CNPJ/IE/IM; usa os campos internacionais abaixo. */
  externo?: boolean
  pais?: string
  /** Identificação fiscal no país (Tax ID, VAT, EIN...). */
  taxId?: string
  /** Moeda de cobrança (USD, EUR...). */
  moeda?: string
  /** Endereço livre (rua, cidade, estado/província, código postal). */
  enderecoExterior?: string
  site?: string
  /** Fornecedor que é seguradora: libera a aba de apólices. */
  seguradora?: boolean
  apolices?: ApoliceSeguro[] | null
}

/** Tipos de apólice de seguro de carga. */
export const TIPOS_APOLICE = ['RCTR-C', 'RCF-DC', 'RC-V', 'Ambiental', 'Outro'] as const
export type TipoApolice = (typeof TIPOS_APOLICE)[number]

export const DOCUMENTOS_APOLICE: { valor: 'cte' | 'nfse' | 'minuta'; label: string }[] = [
  { valor: 'cte', label: 'CT-e' },
  { valor: 'nfse', label: 'NFS-e' },
  { valor: 'minuta', label: 'Minuta' },
]

/** Prêmio da rota, em fração do valor da mercadoria (0,0014 = 0,14%). */
export interface TaxaApolice {
  ufOrigem: string
  ufDestino: string
  percentual: number
}

/** Apólice de seguro de carga; a tabela de prêmio por UF é a base do ad valorem no Pricing. */
export interface ApoliceSeguro {
  id: string
  tipo: TipoApolice
  numero: string
  /** Empresas cobertas; vazio = todas. */
  empresaIds: string[]
  /** yyyy-MM-dd; vazio = sem limite naquele lado. */
  vigenciaInicio: string
  vigenciaFim: string
  limitePorEmbarque: number
  custoEmissao: number
  /** Frações. */
  iof: number
  taxaUrbana: number
  taxaPadrao: number
  documentos: ('cte' | 'nfse' | 'minuta')[]
  observacao: string
  status: 'ativo' | 'inativo'
  taxas: TaxaApolice[]
}

export const novaApolice = (): ApoliceSeguro => ({
  id: crypto.randomUUID(),
  tipo: 'RCTR-C',
  numero: '',
  empresaIds: [],
  vigenciaInicio: '',
  vigenciaFim: '',
  limitePorEmbarque: 0,
  custoEmissao: 0,
  iof: 0,
  taxaUrbana: 0,
  taxaPadrao: 0,
  documentos: ['cte'],
  observacao: '',
  status: 'ativo',
  taxas: [],
})

/**
 * Compatibilidade: registros antigos têm só o contato principal. Quando a lista
 * está vazia e o legado está preenchido, ele vira o primeiro contato da lista.
 */
export function contatosDoParceiro(p: Partial<Parceiro>): Contato[] {
  if (p.contatos && p.contatos.length > 0) return p.contatos
  if (p.contato || p.telefone || p.email)
    return [{ ...novoContato(), nome: p.contato ?? '', telefone: p.telefone ?? '', email: p.email ?? '' }]
  return []
}

/** Base de cálculo da comissão do vendedor. */
export type ComissaoBase = 'preco' | 'margem'

export const BASES_COMISSAO: { valor: ComissaoBase; label: string }[] = [
  { valor: 'preco', label: 'Sobre o preço de venda' },
  { valor: 'margem', label: 'Sobre a margem' },
]

/** Papel do vendedor no processo comercial. */
export type TipoVendedor = '' | 'sdr' | 'sales' | 'cs' | 'representante'
export const TIPOS_VENDEDOR: { valor: TipoVendedor; label: string }[] = [
  { valor: 'sdr', label: 'SDR (pré-venda)' },
  { valor: 'sales', label: 'Sales (fechamento)' },
  { valor: 'cs', label: 'CS (pós-venda)' },
  { valor: 'representante', label: 'Representante comercial' },
]

export interface Vendedor {
  id: string
  tipo: TipoPessoa
  tipoVendedor: TipoVendedor
  /** Funcionário (usuário do portal) que é este vendedor. '' = representante/terceiro sem acesso. */
  usuarioId: string
  nome: string
  cpfCnpj: string
  telefone: string
  email: string
  cidade: string
  /** Fração: 0,015 = 1,5%. */
  comissaoPercentual: number
  comissaoBase: ComissaoBase
  observacao: string
  banco: DadosBancarios
  /** Regiões em que este vendedor não pode vender (bloqueia na precificação e no CRM). */
  regioesBloqueadas: RegiaoBloqueada[]
  status: 'ativo' | 'inativo'
}

import { z } from 'zod'
import { bancoVazio, enderecoVazio } from './types'

const emailOpcional = z.string().email('E-mail inválido').or(z.literal(''))

export const contatoSchema = z.object({
  id: z.string(),
  nome: z.string(),
  cargo: z.string(),
  telefone: z.string(),
  email: emailOpcional,
  perfilCompra: z.enum(['', 'influenciador', 'decisor']),
  recebeFatura: z.boolean(),
  recebeBoleto: z.boolean(),
  recebeNotaFiscal: z.boolean(),
})

export const bancoSchema = z.object({
  banco: z.string(),
  agencia: z.string(),
  conta: z.string(),
  tipoConta: z.enum(['', 'corrente', 'poupanca']),
  pix: z.string(),
  beneficiario: z.string().optional(),
  swift: z.string().optional(),
  iban: z.string().optional(),
  roteamento: z.string().optional(),
})

/** Endereço (cliente, fornecedor, funcionário); a cidade fica num campo próprio de cada cadastro. */
export const enderecoSchema = z.object({
  cep: z.string(),
  logradouro: z.string(),
  numero: z.string(),
  complemento: z.string(),
  bairro: z.string(),
  estado: z.string().optional(),
})

export const parceiroSchema = z.object({
  tipo: z.enum(['juridica', 'fisica']),
  nome: z.string().min(2, 'Informe a razão social ou o nome'),
  nomeFantasia: z.string(),
  cpfCnpj: z.string(),
  inscricaoEstadual: z.string(),
  inscricaoMunicipal: z.string(),
  contato: z.string(),
  telefone: z.string(),
  email: emailOpcional,
  cidade: z.string(),
  endereco: enderecoSchema,
  observacao: z.string(),
  status: z.enum(['ativo', 'inativo']),

  contatos: z.array(contatoSchema),
  segmento: z.string(),
  grupoEconomico: z.string(),
  centroCustoId: z.string(),
  banco: bancoSchema,

  perfil: z.enum(['', 'B2B', 'B2C', 'B2G']),
  vendedorSdrId: z.string(),
  vendedorSalesId: z.string(),
  vendedorCsId: z.string(),
  formaPagamento: z.string(),
  prazoPagamentoDias: z.number().int().min(0, 'Prazo inválido'),

  tipoFornecimento: z.enum(['', 'produto', 'servico']),
  naturezaCusto: z.enum(['', 'fixo', 'variavel']),
  planoContaId: z.string(),
  compradorId: z.string(),
  aprovadores: z.array(z.string()),
  limiteCompra: z.number().min(0),
  externo: z.boolean(),
  pais: z.string(),
  taxId: z.string(),
  moeda: z.string(),
  enderecoExterior: z.string(),
  site: z.string(),
  seguradora: z.boolean(),
})

export type ParceiroForm = z.infer<typeof parceiroSchema>

export const emptyParceiro: ParceiroForm = {
  tipo: 'juridica',
  nome: '',
  nomeFantasia: '',
  cpfCnpj: '',
  inscricaoEstadual: '',
  inscricaoMunicipal: '',
  contato: '',
  telefone: '',
  email: '',
  cidade: '',
  endereco: enderecoVazio(),
  observacao: '',
  status: 'ativo',

  contatos: [],
  segmento: '',
  grupoEconomico: '',
  centroCustoId: '',
  banco: bancoVazio(),

  perfil: '',
  vendedorSdrId: '',
  vendedorSalesId: '',
  vendedorCsId: '',
  formaPagamento: '',
  prazoPagamentoDias: 0,

  tipoFornecimento: '',
  naturezaCusto: '',
  planoContaId: '',
  compradorId: '',
  aprovadores: [],
  limiteCompra: 0,
  externo: false,
  pais: '',
  taxId: '',
  moeda: '',
  enderecoExterior: '',
  site: '',
  seguradora: false,
}

export const vendedorSchema = z.object({
  tipo: z.enum(['juridica', 'fisica']),
  tipoVendedor: z.enum(['', 'sdr', 'sales', 'cs', 'representante']),
  usuarioId: z.string(),
  nome: z.string().min(2, 'Informe o nome'),
  cpfCnpj: z.string(),
  telefone: z.string(),
  email: emailOpcional,
  cidade: z.string(),
  comissaoPercentual: z.number().min(0, 'Percentual inválido'),
  comissaoBase: z.enum(['preco', 'margem']),
  observacao: z.string(),
  banco: bancoSchema,
  regioesBloqueadas: z.array(z.object({ tipo: z.enum(['pais', 'estado', 'cidade']), valor: z.string() })),
  status: z.enum(['ativo', 'inativo']),
})

export type VendedorForm = z.infer<typeof vendedorSchema>

export const emptyVendedor: VendedorForm = {
  tipo: 'fisica',
  tipoVendedor: '',
  usuarioId: '',
  nome: '',
  cpfCnpj: '',
  telefone: '',
  email: '',
  cidade: '',
  comissaoPercentual: 0,
  comissaoBase: 'preco',
  observacao: '',
  banco: bancoVazio(),
  regioesBloqueadas: [],
  status: 'ativo',
}

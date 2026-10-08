import { z } from 'zod'
import { mockIcms } from '@/features/icms/mock'
import { REGIOES } from '@/features/icms/types'
import { bancoSchema } from '@/features/parceiros/parceiro-schema'
import { bancoVazio, enderecoVazio } from '@/features/parceiros/types'

const icmsUfSchema = z.object({
  id: z.string(),
  uf: z.string(),
  nome: z.string(),
  regiao: z.enum(REGIOES),
  aliquota: z.number().min(0),
})

const impostoSchema = z.object({
  aliquota: z.number().min(0, 'Inválido'),
  retido: z.boolean(),
  reducaoBase: z.number().min(0, 'Inválido'),
})

const dvSchema = z.object({
  impostos: z.number().min(0),
  custos: z.number().min(0),
  comissoes: z.number().min(0),
  lucro: z.number().min(0),
  despFinanceira: z.number().min(0),
  receitaEstimadaMensal: z.number().min(0),
  /** "+ Outras despesas": linhas livres somadas na DV. */
  outras: z.array(z.object({ id: z.string(), nome: z.string(), percentual: z.number().min(0) })).default([]),
})

export const unidadeSchema = z.object({
  nome: z.string().min(1, 'Informe o nome curto'),
  razaoSocial: z.string().min(2, 'Informe a razão social'),
  nomeFantasia: z.string().min(1, 'Informe o nome fantasia'),
  // TEMPORÁRIO: opcional enquanto o cliente cadastra empresas de teste sem CNPJ.
  // Voltar a exigir (z.string().min(1, 'Informe o CNPJ')) quando ele avisar.
  cnpj: z.string(),
  tipo: z.enum(['Matriz', 'Filial']),
  endereco: z.string().min(1, 'Informe a cidade'),
  enderecoCompleto: z.object({ cep: z.string(), logradouro: z.string(), numero: z.string(), complemento: z.string(), bairro: z.string(), estado: z.string().optional() }),
  inscricaoMunicipal: z.string().max(20),
  inscricaoEstadual: z.string().max(20),
  logo: z.string(),
  status: z.enum(['ativo', 'inativo']),
  padrao: z.boolean(),
  propostaPrefixo: z.string(),
  propostaDigitos: z.number().int().min(3).max(8),
  validadesProposta: z.array(z.object({ id: z.string(), descricao: z.string(), padrao: z.boolean() })),

  dv: dvSchema,

  regime: z.enum(['Simples Nacional', 'MEI', 'Lucro Presumido', 'Lucro Real']),
  das: z.number().min(0),
  simplesAnexo: z.string(),

  ir: impostoSchema,
  csll: impostoSchema,
  inss: impostoSchema,
  pis: impostoSchema,
  cofins: impostoSchema,
  iss: impostoSchema,

  ibsMunicipal: z.number().min(0),
  ibsEstadual: z.number().min(0),
  cbs: z.number().min(0),

  icmsAtivo: z.boolean(),
  icms: z.array(icmsUfSchema),

  banco: bancoSchema,
  markupMinimo: z.number().min(0),
})

export type UnidadeForm = z.infer<typeof unidadeSchema>

const impostoZero = { aliquota: 0, retido: false, reducaoBase: 0 }

export const emptyUnidade: UnidadeForm = {
  nome: '',
  razaoSocial: '',
  nomeFantasia: '',
  cnpj: '',
  tipo: 'Filial',
  endereco: '',
  enderecoCompleto: enderecoVazio(),
  inscricaoMunicipal: '',
  inscricaoEstadual: '',
  logo: '',
  status: 'ativo',
  padrao: false,
  propostaPrefixo: '',
  propostaDigitos: 4,
  validadesProposta: [
    { id: 'v15', descricao: '15 dias', padrao: true },
    { id: 'v30', descricao: '30 dias', padrao: false },
  ],

  // Impostos começam zerados: quem cadastra informa na aba Impostos (não fica um valor escondido).
  dv: { impostos: 0, custos: 0, comissoes: 0, lucro: 0.07, despFinanceira: 0.023, receitaEstimadaMensal: 225000, outras: [] },

  regime: 'Lucro Presumido',
  das: 0,
  simplesAnexo: '',

  ir: { ...impostoZero },
  csll: { ...impostoZero },
  inss: { ...impostoZero },
  pis: { ...impostoZero },
  cofins: { ...impostoZero },
  iss: { ...impostoZero },

  ibsMunicipal: 0,
  ibsEstadual: 0,
  cbs: 0,

  icmsAtivo: true,
  icms: mockIcms.map((u) => ({ ...u })),

  banco: bancoVazio(),
  markupMinimo: 0,
}

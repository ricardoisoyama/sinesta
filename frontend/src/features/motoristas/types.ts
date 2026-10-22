import type { Endereco } from '@/features/parceiros/types'

export interface ContatoReferencia {
  nome: string
  telefone: string
}

/** Motorista (ou ajudante/operador), espelho do Motorista do servidor. */
export interface Motorista {
  id: string
  status: 'ativo' | 'inativo'
  nome: string
  /** Só dígitos. */
  cpf: string
  rg: string
  dataEmissaoRg: string
  nomeMae: string
  nomePai: string
  dataNascimento: string
  telefone: string
  email: string
  tipo: string
  vinculo: string
  numeroCnh: string
  registroCnh: string
  categoriaCnh: string
  /** yyyy-MM-dd. */
  validadeCnh: string
  primeiraHabilitacao: string
  cidade: string
  endereco?: Endereco | null
  referencias: ContatoReferencia[]
  observacao: string
}

export const TIPOS_MOTORISTA = ['Motorista', 'Ajudante', 'Operador']
export const VINCULOS_MOTORISTA = ['Frota própria', 'Agregado', 'Autônomo', 'Terceiro']
export const CATEGORIAS_CNH = ['A', 'B', 'C', 'D', 'E', 'AB', 'AC', 'AD', 'AE']

export const motoristaVazio = (): Motorista => ({
  id: '',
  status: 'ativo',
  nome: '',
  cpf: '',
  rg: '',
  dataEmissaoRg: '',
  nomeMae: '',
  nomePai: '',
  dataNascimento: '',
  telefone: '',
  email: '',
  tipo: 'Motorista',
  vinculo: '',
  numeroCnh: '',
  registroCnh: '',
  categoriaCnh: '',
  validadeCnh: '',
  primeiraHabilitacao: '',
  cidade: '',
  endereco: { cep: '', logradouro: '', numero: '', complemento: '', bairro: '', estado: '' },
  referencias: [],
  observacao: '',
})

/** Dias até a CNH vencer (negativo = vencida); null sem data. */
export function diasParaVencerCnh(validade: string, hoje: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(validade)) return null
  const ms = new Date(`${validade}T12:00:00`).getTime() - new Date(`${hoje}T12:00:00`).getTime()
  return Math.round(ms / 86_400_000)
}

/** Situação da CNH para a lista: vencida, a vencer (30 dias) ou em dia. */
export function situacaoCnh(validade: string, hoje: string): 'vencida' | 'a-vencer' | 'em-dia' | '' {
  const d = diasParaVencerCnh(validade, hoje)
  if (d === null) return ''
  return d < 0 ? 'vencida' : d <= 30 ? 'a-vencer' : 'em-dia'
}

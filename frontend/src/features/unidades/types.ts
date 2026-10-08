import type { IcmsUf } from '@/features/icms/types'
import type { DvParams } from '@/features/pricing/engine'
import type { DadosBancarios, Endereco } from '@/features/parceiros/types'

export type TipoUnidade = 'Matriz' | 'Filial'

/** Parâmetros de Despesa Variável (DV) da empresa + receita estimada. */
export interface DvEmpresa extends DvParams {
  receitaEstimadaMensal: number
}

export type RegimeTributario = 'Simples Nacional' | 'MEI' | 'Lucro Presumido' | 'Lucro Real'
export const REGIMES: RegimeTributario[] = ['Simples Nacional', 'MEI', 'Lucro Presumido', 'Lucro Real']

export const ANEXOS_SIMPLES = ['I', 'II', 'III', 'IV', 'V'] as const

/** Validade que a empresa oferece nas propostas (a proposta guarda o texto, ex.: "15 dias"). */
export interface ValidadeEmpresa {
  id: string
  descricao: string
  /** Já vem escolhida no Pricing (só uma). */
  padrao: boolean
}

/** Situação do certificado A1 da empresa (o arquivo e a senha nunca voltam do servidor). */
export interface CertificadoInfo {
  nomeArquivo: string
  titular: string
  cnpj: string
  emissor: string
  validoDe: string
  validoAte: string
  enviadoEm: string
  enviadoPor: string
}

/** Configuração de um imposto: alíquota, se é retido, e redução da base de cálculo. */
export interface ImpostoConfig {
  /** Fração (0,11 = 11%). */
  aliquota: number
  retido: boolean
  /** Redução da base de cálculo (fração). */
  reducaoBase: number
}

/** Empresa/estabelecimento que emite as propostas (Matriz, Filial 02, ...). */
export interface Unidade {
  id: string
  /** Nome curto de exibição (usado nos seletores). */
  nome: string
  razaoSocial: string
  nomeFantasia: string
  cnpj: string
  tipo: TipoUnidade
  /** Cidade ("Santos - SP"); o nome ficou do tempo em que era o único dado de endereço. */
  endereco: string
  /** CEP, rua, número, complemento e bairro (a cidade fica em `endereco`). Proposta e NFS-e. */
  enderecoCompleto?: Endereco | null
  /** Inscrição Municipal (prestador da NFS-e). */
  inscricaoMunicipal?: string
  /** Inscrição Estadual ("ISENTO" quando não tem). */
  inscricaoEstadual?: string
  /** Logo (data URL) usada na proposta. */
  logo: string
  status: 'ativo' | 'inativo'
  /** Empresa que as telas abrem selecionada (só uma; nenhuma = a primeira ativa). */
  padrao?: boolean
  /** Prefixo do número das propostas (ex.: SIN → SIN-0001). Vazio = padrão PROP-0001. */
  propostaPrefixo?: string
  /** Dígitos do número (3 a 8). */
  propostaDigitos?: number
  /** Validades oferecidas no Pricing para as propostas desta empresa. */
  validadesProposta?: ValidadeEmpresa[]

  /** Parâmetros de Despesa Variável (DV) — definem o markup/Fator. */
  dv: DvEmpresa

  // ── Tributação ─────────────────────────────────────────────
  regime: RegimeTributario
  /** Alíquota do DAS (Simples/MEI). */
  das: number
  /** Anexo do Simples Nacional (I a V). */
  simplesAnexo?: string

  // Impostos federais / previdenciário
  ir: ImpostoConfig
  csll: ImpostoConfig
  inss: ImpostoConfig
  pis: ImpostoConfig
  cofins: ImpostoConfig
  iss: ImpostoConfig

  // Reforma tributária
  ibsMunicipal: number
  ibsEstadual: number
  cbs: number

  // ICMS (dentro da empresa, ativável) — grid editável por UF
  icmsAtivo: boolean
  icms: IcmsUf[]

  /** Dados bancários da empresa (opcional nos registros antigos). */
  banco?: DadosBancarios | null
  /**
   * Markup mínimo (fração) acima da cobertura de custos e impostos: piso que o
   * desconto não pode furar sem alerta/aprovação. O praticado é `dv.lucro`.
   */
  markupMinimo?: number
}

/** Empresa que a tela abre selecionada: a marcada como padrão; senão a primeira da lista. */
export const empresaPadrao = <T extends { padrao?: boolean }>(ativas: T[]): T | undefined => ativas.find((e) => e.padrao) ?? ativas[0]

/** Tipos de apólice de seguro de carga. */
export const TIPOS_APOLICE = ['RCTR-C', 'RCF-DC', 'RC-V', 'Ambiental', 'Outro'] as const
export type TipoApolice = (typeof TIPOS_APOLICE)[number]

export type DocumentoApolice = 'cte' | 'nfse' | 'minuta'
export const DOCUMENTOS_APOLICE: { valor: DocumentoApolice; label: string }[] = [
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

/**
 * Apólice de seguro de carga (Cadastros › Apólices), ligada a um fornecedor seguradora. A tabela de
 * prêmio por UF é a base do ad valorem no Pricing (a apólice vigente do tipo).
 */
export interface Apolice {
  id: string
  seguradoraId: string
  tipo: TipoApolice
  numero: string
  /** Empresas cobertas; vazio = todas. */
  empresaIds: string[]
  /** yyyy-MM-dd; vazio = sem limite naquele lado. */
  vigenciaInicio: string
  vigenciaFim: string
  limitePorEmbarque: number
  custoEmissao: number
  /** Frações. O IOF fica só registrado (não entra no ad valorem). */
  iof: number
  taxaUrbana: number
  taxaPadrao: number
  documentos: DocumentoApolice[]
  observacao: string
  status: 'ativo' | 'inativo'
  taxas: TaxaApolice[]
}

export const novaApolice = (): Apolice => ({
  id: '',
  seguradoraId: '',
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

const dataBR = (iso: string) => (iso ? iso.split('-').reverse().join('/') : '')

/** Situação da apólice para a lista: inativa, futura, vencida, vence em breve (≤ 30 dias) ou vigente. */
export function situacaoApolice(a: Pick<Apolice, 'status' | 'vigenciaInicio' | 'vigenciaFim'>, hoje: string): { texto: string; tom: 'verde' | 'laranja' | 'vermelho' | 'cinza' } {
  if (a.status === 'inativo') return { texto: 'Inativa', tom: 'cinza' }
  if (a.vigenciaInicio && a.vigenciaInicio > hoje) return { texto: `Começa em ${dataBR(a.vigenciaInicio)}`, tom: 'cinza' }
  if (a.vigenciaFim && a.vigenciaFim < hoje) return { texto: 'Vencida', tom: 'vermelho' }
  if (a.vigenciaFim) {
    const dias = Math.round((Date.parse(a.vigenciaFim) - Date.parse(hoje)) / 86_400_000)
    if (dias <= 30) return { texto: dias === 0 ? 'Vence hoje' : `Vence em ${dias} ${dias === 1 ? 'dia' : 'dias'}`, tom: 'laranja' }
  }
  return { texto: 'Vigente', tom: 'verde' }
}

export const vigenciaTexto = (a: Pick<Apolice, 'vigenciaInicio' | 'vigenciaFim'>) =>
  a.vigenciaInicio || a.vigenciaFim ? `${dataBR(a.vigenciaInicio) || '…'} a ${dataBR(a.vigenciaFim) || '…'}` : 'Sem prazo'

export const hojeLocal = () => new Date().toLocaleDateString('sv-SE')

import { apiFetch } from '@/lib/api'

/**
 * Integrações bancárias (Administrativo › Integrações, só a equipe ELROND). Espelho de
 * IntegracoesBancariasController: uma integração por empresa (CNPJ) e banco; segredos nunca voltam.
 */
export type TipoMulta = 'nenhum' | 'percentual' | 'valor'
export type TipoJuros = 'nenhum' | 'percentual-mes' | 'valor-dia'

export interface RegrasBoleto {
  multaTipo: TipoMulta
  multa: number
  jurosTipo: TipoJuros
  juros: number
  descontoTipo: TipoMulta
  desconto: number
  descontoDiasAntes: number
  diasBaixa: number
  comPix: boolean
  instrucoes: string[]
}

export const REGRAS_PADRAO: RegrasBoleto = {
  multaTipo: 'nenhum',
  multa: 0,
  jurosTipo: 'nenhum',
  juros: 0,
  descontoTipo: 'nenhum',
  desconto: 0,
  descontoDiasAntes: 0,
  diasBaixa: 30,
  comPix: true,
  instrucoes: [],
}
export const MAX_INSTRUCOES = 3
export const MAX_CARACTERES_LINHA = 78

export type Recurso = 'cobranca' | 'extrato' | 'saldo'
export const ROTULO_RECURSO: Record<Recurso, string> = { cobranca: 'Cobrança (boleto e Pix)', extrato: 'Extrato', saldo: 'Saldo' }

export interface Integracao {
  id: string
  empresaId: string
  banco: string
  ambiente: 'sandbox' | 'producao'
  contaCorrente: string
  recursos: Recurso[]
  ativa: boolean
  certificadoValidoAte: string
  configurada: boolean
  clientId: string
  carteiraId: string
  boleto: RegrasBoleto
  alteradoEm: string
  alteradoPor: string
  /** Quando o aviso de pagamento (webhook) foi cadastrado no banco; vazio = ainda não. */
  avisoRegistradoEm: string
}

export interface BancoDisponivel {
  codigo: string
  nome: string
  recursos: Recurso[]
}

export interface ConfigurarIntegracao {
  banco: string
  ambiente: 'sandbox' | 'producao'
  clientId: string
  /** Vazio = mantém o gravado. */
  clientSecret: string | null
  certificadoPem: string | null
  chavePem: string | null
  contaCorrente: string
  recursos: Recurso[]
  ativa: boolean
  carteiraId: string
  boleto: RegrasBoleto
}

const base = '/integracoes-bancarias'

export const listIntegracoes = () => apiFetch<Integracao[]>(base)
export const listBancos = () => apiFetch<BancoDisponivel[]>(`${base}/bancos`)
export const configurarIntegracao = (empresaId: string, d: ConfigurarIntegracao) =>
  apiFetch<Integracao>(`${base}/${encodeURIComponent(empresaId)}`, { method: 'PUT', body: JSON.stringify(d) })
/** Cadastra no banco o aviso de pagamento apontando para este ambiente (o endereço que está aberto). */
export const registrarAviso = (id: string) =>
  apiFetch<Integracao>(`${base}/${encodeURIComponent(id)}/aviso`, { method: 'POST', body: JSON.stringify({ urlBase: window.location.origin }) })
export const testarIntegracao = (id: string) => apiFetch<{ mensagem: string }>(`${base}/${encodeURIComponent(id)}/testar`, { method: 'POST' })

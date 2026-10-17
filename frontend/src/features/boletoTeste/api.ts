import { apiBlob, apiFetch } from '@/lib/api'

/**
 * Página PROVISÓRIA de testes de boleto: faturas da SIIMP (só leitura) → boleto no banco da
 * empresa (motor de bancos). Espelho de BoletoTesteController.
 */
export interface EmpresaComBanco {
  empresaId: string
  empresa: string
  banco: string
  ambiente: 'sandbox' | 'producao'
  certificadoValidoAte: string
}

export interface FaturaResumo {
  id: number
  numero: number
  /** 0 Cadastrada, 3 Emitida, 1 Liquidada, 2 Cancelada. */
  situacao: number
  total: number
  vencimento: string
  /** 6 boleto, 8 Pix... */
  formaPagamento: number
  criadaEm: string
}

export interface ParcelaFatura {
  id: number
  numero: number
  valor: number
  desconto: number
  vencimento: string
  /** 0 Em aberto, 1 Liquidada, 2 Parcial, 3 Cancelada. */
  situacao: number
}

export interface FaturaDetalhe {
  id: number
  numero: number
  situacao: number
  total: number
  vencimento: string
  formaPagamento: number
  pagadorId: number
  pagadorNome: string
  pagadorDocumento: string
  carteira: string
  observacao: string
  parcelas: ParcelaFatura[]
  documentos: { tipo: string; numero: string; serie: string; chave: string; total: number }[]
}

export interface PessoaSiimp {
  id: number
  nome: string
  documento: string
  email: string
  telefone: string
  rua: string
  numero: string
  complemento: string
  bairro: string
  cidade: string
  uf: string
  cep: string
}

export type SituacaoCobranca = 'pendente' | 'processando' | 'a-receber' | 'recebida' | 'cancelada' | 'expirada' | 'falha' | 'incerta'

export interface Cobranca {
  id: string
  origemId: string
  origemParcelaId: string
  origemDescricao: string
  banco: string
  ambiente: string
  seuNumero: string
  idBanco: string
  nossoNumero: string
  linhaDigitavel: string
  codigoBarras: string
  pixCopiaECola: string
  valor: number
  vencimento: string
  pagadorNome: string
  pagadorDocumento: string
  situacao: SituacaoCobranca
  situacaoBanco: string
  mensagem: string
  valorRecebido: number
  recebidaEm: string
  recebidaPor: string
  /** Data e hora do pagamento segundo o banco (vem no aviso). */
  pagaEm: string
  /** Quando o primeiro aviso do banco chegou. */
  avisoEm: string
  confirmadaEm: string
  /** aviso | rotina | tela: quem descobriu o pagamento. */
  confirmadaPor: string
  criadoEm: string
}

const QUEM: Record<string, string> = { aviso: 'pelo aviso do banco', rotina: 'pela conferência automática', tela: 'pela consulta na tela' }
const duracao = (ms: number) => {
  const min = Math.round(ms / 60000)
  return min < 1 ? 'menos de 1 min' : min < 120 ? `${min} min` : `${(min / 60).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} h`
}

/** Métrica do aviso: quanto o banco demorou para avisar o pagamento e quem confirmou a baixa. */
export function tempoDoAviso(c: Pick<Cobranca, 'pagaEm' | 'avisoEm' | 'confirmadaEm' | 'confirmadaPor'>): string {
  const partes: string[] = []
  const paga = Date.parse(c.pagaEm)
  const aviso = Date.parse(c.avisoEm)
  if (!Number.isNaN(paga) && !Number.isNaN(aviso)) partes.push(`aviso chegou ${duracao(Math.max(0, aviso - paga))} depois do pagamento`)
  else if (c.confirmadaPor && c.confirmadaPor !== 'aviso') partes.push('sem aviso do banco')
  if (c.confirmadaPor) partes.push(`baixa ${QUEM[c.confirmadaPor] ?? c.confirmadaPor}`)
  if (!Number.isNaN(paga) && c.confirmadaEm) partes.push(`${duracao(Math.max(0, Date.parse(c.confirmadaEm) - paga))} até a baixa`)
  return partes.join(' · ')
}

const base = '/boleto-teste'

export const listEmpresasComBanco = () => apiFetch<EmpresaComBanco[]>(`${base}/empresas`)
export const listFaturas = (empresaId: string, de: string, ate: string) =>
  apiFetch<FaturaResumo[]>(`${base}/faturas?empresaId=${encodeURIComponent(empresaId)}&de=${de}&ate=${ate}`)
export const obterFatura = (id: number, empresaId: string) =>
  apiFetch<{ fatura: FaturaDetalhe; pagador: PessoaSiimp | null; erroPagador: string; boletos: Cobranca[] }>(`${base}/faturas/${id}?empresaId=${encodeURIComponent(empresaId)}`)
export const gerarBoleto = (faturaId: number, parcelaId: number, empresaId: string, vencimento?: string) =>
  apiFetch<Cobranca>(`${base}/faturas/${faturaId}/parcelas/${parcelaId}/boleto`, { method: 'POST', body: JSON.stringify({ empresaId, vencimento: vencimento || null }) })
export interface BoletoTesteDados {
  empresaId: string
  nome: string
  documento: string
  rua: string
  numero: string
  complemento: string
  bairro: string
  cidade: string
  uf: string
  cep: string
  email: string
  valor: number
  vencimento: string
}
/** Boleto de teste, sem fatura (o pagador é quem testa). */
export const gerarBoletoTeste = (d: BoletoTesteDados) => apiFetch<Cobranca>(`${base}/teste`, { method: 'POST', body: JSON.stringify(d) })
export const listCobrancas = (empresaId: string) => apiFetch<Cobranca[]>(`${base}/cobrancas?empresaId=${encodeURIComponent(empresaId)}`)
export const atualizarCobranca = (id: string) => apiFetch<Cobranca>(`${base}/cobrancas/${id}/atualizar`, { method: 'POST' })
export const cancelarCobranca = (id: string, motivo: string) =>
  apiFetch<Cobranca>(`${base}/cobrancas/${id}/cancelar`, { method: 'POST', body: JSON.stringify({ motivo }) })
export const pdfCobranca = (id: string) => apiBlob(`${base}/cobrancas/${id}/pdf`)

/** Rótulos da SIIMP e da nossa situação de cobrança. */
export const SITUACAO_FATURA: Record<number, string> = { 0: 'Cadastrada', 1: 'Liquidada', 2: 'Cancelada', 3: 'Emitida' }
// Tabela da SIIMP (base de conhecimento, PO-A-140).
export const FORMA_PAGAMENTO: Record<number, string> = { 1: 'Dinheiro', 2: 'Cheque', 3: 'Transferência', 4: 'Depósito', 5: 'Cartão', 6: 'Boleto', 7: 'Débito em conta', 8: 'Pix' }
export const SITUACAO_PARCELA: Record<number, string> = { 0: 'Em aberto', 1: 'Liquidada', 2: 'Parcialmente liquidada', 3: 'Cancelada' }
export const SITUACAO_COBRANCA: Record<SituacaoCobranca, { rotulo: string; tom: 'ok' | 'atencao' | 'erro' | 'neutro' }> = {
  pendente: { rotulo: 'Pendente', tom: 'neutro' },
  processando: { rotulo: 'Processando no banco', tom: 'atencao' },
  'a-receber': { rotulo: 'A receber', tom: 'ok' },
  recebida: { rotulo: 'Recebido', tom: 'ok' },
  cancelada: { rotulo: 'Cancelado', tom: 'neutro' },
  expirada: { rotulo: 'Expirado', tom: 'neutro' },
  falha: { rotulo: 'Falhou', tom: 'erro' },
  incerta: { rotulo: 'Sem confirmação', tom: 'atencao' },
}

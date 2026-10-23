import { useQuery } from '@tanstack/react-query'
import { apiBlob, apiFetch } from '@/lib/api'
import { env } from '@/config/env'

/** Fatura ao cliente a partir dos CT-es e minutas da SIIMP (espelho de FaturaCliente). */
export interface NfDoDocumento {
  id: number
  serie: string
  numero: string
  emissao: string
  peso: number
  valor: number
}

export interface DocumentoDaFatura {
  id: string
  tipo: 'cte' | 'minuta'
  siimpId: number
  serie: string
  numero: string
  data: string
  nfseNumero: string
  peso: number
  valorCarga: number
  gris: number
  seguro: number
  pedagio: number
  icms: number
  total: number
  nfs: NfDoDocumento[]
}

export interface EnvioFatura {
  em: string
  quem: string
  para: string
  anexos: string[]
  erro: string
}

export interface EventoFatura {
  em: string
  quem: string
  texto: string
}

export interface FaturaCliente {
  id: string
  empresaId: string
  numero: number
  clienteId: string
  cliente: { nome: string; documento: string; cidade: string; uf: string }
  tipo: 'cte' | 'minuta'
  emissao: string
  vencimento: string
  centroCustoNome: string
  valor: number
  adicional: number
  desconto: number
  total: number
  documentos: DocumentoDaFatura[]
  situacao: 'emitida' | 'cancelada'
  movimentoId: string
  cobrancaId: string
  observacao: string
  motivoCancelamento: string
  envios: EnvioFatura[]
  eventos: EventoFatura[]
}

export interface FaturaClienteDto {
  fatura: FaturaCliente
  boletoSituacao: string
  boletoLinha: string
  boletoMensagem: string
  pagoEm: string
  valorPago: number
  ultimoEnvio: string
  ultimoEnvioOk: boolean
}

export interface FaturarDados {
  documentoIds: string[]
  vencimento?: string
  centroCustoId?: string
  planoContaId?: string
  carteiraId?: string
  adicional?: number
  desconto?: number
  observacao?: string
  enviar?: boolean
}

export interface DestinatarioFatura {
  nome: string
  email: string
  fatura: boolean
  boleto: boolean
  notaFiscal: boolean
}

export interface SugestaoFatura {
  empresaId: string
  clienteId: string
  clienteNome: string
  tipo: 'cte' | 'minuta'
  documentos: number
  valor: number
  vencimento: string
  vencimentoRegra: 'manter' | 'antecipar' | 'postergar'
  centroCustoId: string
  planoContaId: string
  carteiraId: string
  numeroProvavel: number
  destinatarios: DestinatarioFatura[]
  avisos: string[]
}

const base = '/faturas-clientes'

export const sugerirFatura = (d: FaturarDados) => apiFetch<SugestaoFatura>(`${base}/sugestao`, { method: 'POST', body: JSON.stringify(d) })
export const faturar = (d: FaturarDados) => apiFetch<{ fatura: FaturaClienteDto; avisos: string[] }>(base, { method: 'POST', body: JSON.stringify(d) })
export const enviarFatura = (id: string) => apiFetch<EnvioFatura[]>(`${base}/${encodeURIComponent(id)}/enviar`, { method: 'POST' })
export const emitirBoletoFatura = (id: string) => apiFetch<FaturaClienteDto>(`${base}/${encodeURIComponent(id)}/boleto`, { method: 'POST' })
export const cancelarFatura = (id: string, motivo: string) =>
  apiFetch<FaturaClienteDto>(`${base}/${encodeURIComponent(id)}/cancelar`, { method: 'POST', body: JSON.stringify({ motivo }) })

export function useFaturasClientes(de: string, ate: string) {
  return useQuery({ queryKey: ['faturas-clientes', de, ate], queryFn: () => apiFetch<FaturaClienteDto[]>(`${base}?de=${de}&ate=${ate}`) })
}

/** Abre o PDF numa guia nova (a guia abre antes da resposta, senão o navegador bloqueia o pop-up). */
async function abrirPdf(obter: () => Promise<Blob>) {
  const guia = window.open('', '_blank')
  try {
    const url = URL.createObjectURL(await obter())
    if (guia) guia.location.href = url
    else window.location.assign(url)
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
  } catch (e) {
    guia?.close()
    throw e
  }
}

export const abrirPdfFatura = (id: string) => abrirPdf(() => apiBlob(`${base}/${encodeURIComponent(id)}/pdf`))

/** Prévia: o PDF como vai sair, sem gravar nada (POST com os dados escolhidos na tela). */
export const abrirPreviaFatura = (d: FaturarDados) =>
  abrirPdf(async () => {
    const token = localStorage.getItem('token')
    const res = await fetch(`${env.apiUrl}${base}/previa`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(d),
    })
    if (!res.ok) throw new Error((await res.text()) || 'Não foi possível gerar a prévia.')
    return res.blob()
  })

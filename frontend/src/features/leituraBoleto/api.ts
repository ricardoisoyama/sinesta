import { apiFetch } from '@/lib/api'

/** Sessão do "Ler boleto em outro dispositivo" (10 minutos, uso único). */
export interface SessaoLeitura {
  token: string
  expiraEm: string
}

export interface SituacaoLeitura {
  valida: boolean
  /** Dígitos lidos pelo celular; vazio = ainda não leu. */
  codigo: string
  expiraEm: string
}

// Tela do computador (logado)
export const abrirLeitura = () => apiFetch<SessaoLeitura>('/pagamentos/leitura', { method: 'POST' })
export const consultarLeitura = (token: string) => apiFetch<SituacaoLeitura>(`/pagamentos/leitura/${encodeURIComponent(token)}`)

// Página do celular (sem login: só o token)
export const leituraValida = (token: string) => apiFetch<{ valida: boolean }>(`/leitura-boleto/${encodeURIComponent(token)}`)
export const enviarLeitura = (token: string, codigo: string) =>
  apiFetch<{ valor: number; vencimento: string }>(`/leitura-boleto/${encodeURIComponent(token)}`, { method: 'POST', body: JSON.stringify({ codigo }) })

/** Link que o QR leva ao celular (mesmo endereço do sistema que está aberto). */
export const linkDaLeitura = (token: string) => `${window.location.origin}/leitura-boleto/${token}`

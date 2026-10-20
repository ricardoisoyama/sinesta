import { apiFetch } from '@/lib/api'

/** Servidor de e-mail do ambiente (Administrativo › Integração SMTP). A senha nunca volta. */
export interface Smtp {
  host: string
  porta: number
  seguranca: 'starttls' | 'ssl' | 'nenhuma'
  usuario: string
  temSenha: boolean
  remetenteNome: string
  remetenteEmail: string
  responderPara: string
  emailTeste: string
  somenteTeste: boolean
  ativo: boolean
  testadoEm: string
  testeOk: boolean
  alteradoEm: string
  alteradoPor: string
}

export type SalvarSmtp = Omit<Smtp, 'temSenha' | 'testadoEm' | 'testeOk' | 'alteradoEm' | 'alteradoPor'> & {
  /** Vazio/nulo = mantém a senha gravada. */
  senha: string | null
}

export interface EmailEnviado {
  id: string
  em: string
  para: string
  enviadoPara: string
  assunto: string
  origem: string
  situacao: 'enviado' | 'falhou' | 'desligado'
  erro: string
}

const base = '/integracao-smtp'
export const obterSmtp = () => apiFetch<Smtp>(base)
export const salvarSmtp = (d: SalvarSmtp) => apiFetch<Smtp>(base, { method: 'PUT', body: JSON.stringify(d) })
export const testarSmtp = (para: string) => apiFetch<{ mensagem: string }>(`${base}/testar`, { method: 'POST', body: JSON.stringify({ para: para || null }) })
export const listarEnviados = () => apiFetch<EmailEnviado[]>(`${base}/enviados`)

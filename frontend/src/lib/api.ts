import { env } from '@/config/env'

/** Erro de API com status HTTP. */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

function authHeader(): Record<string, string> {
  const token = localStorage.getItem('token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

/**
 * Sessão vencida (token de 8 h): o servidor responde 401 em tudo e as telas ficavam vazias,
 * parecendo que os dados tinham sumido. Aqui a sessão é encerrada e volta para o login com o aviso.
 * O próprio login (senha errada) não entra nessa regra.
 */
function sessaoExpirou(path: string, res: Response) {
  if (res.status !== 401 || path.startsWith('/auth/login') || !localStorage.getItem('token')) return
  localStorage.removeItem('token')
  if (!window.location.pathname.startsWith('/login')) {
    const voltar = encodeURIComponent(window.location.pathname + window.location.search)
    window.location.assign(`/login?expirou=1&voltar=${voltar}`)
  }
}

/**
 * Cliente HTTP central: injeta baseURL, header de autenticação e
 * normaliza erros (lança ApiError). Use nas camadas de `api` das features.
 */
export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${env.apiUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...authHeader(),
      ...options.headers,
    },
  })

  if (!res.ok) {
    sessaoExpirou(path, res)
    // O servidor responde ProblemDetails (JSON) ou a mensagem em texto puro (BadRequest("...")): as duas valem.
    throw new ApiError(res.status, await mensagemDeErro(res))
  }

  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

/** Lê a mensagem de erro do corpo (ProblemDetails ou texto puro). */
async function mensagemDeErro(res: Response): Promise<string> {
  const texto = await res.text().catch(() => '')
  if (!texto) return 'Ocorreu um erro inesperado.'
  try {
    const data = JSON.parse(texto) as { detail?: string; message?: string; title?: string }
    return data.detail ?? data.message ?? data.title ?? texto
  } catch {
    return texto
  }
}

/** Envio de arquivo (multipart). Não fixa Content-Type: o navegador monta o boundary. */
export async function apiUpload<T>(path: string, form: FormData): Promise<T> {
  const res = await fetch(`${env.apiUrl}${path}`, { method: 'POST', body: form, headers: authHeader() })
  sessaoExpirou(path, res)
  if (!res.ok) throw new ApiError(res.status, await mensagemDeErro(res))
  return (await res.json()) as T
}

/** Baixa um arquivo autenticado como Blob (para abrir numa nova guia ou salvar). */
export async function apiBlob(path: string): Promise<Blob> {
  const res = await fetch(`${env.apiUrl}${path}`, { headers: authHeader() })
  sessaoExpirou(path, res)
  if (!res.ok) throw new ApiError(res.status, await mensagemDeErro(res))
  return res.blob()
}

/** Converte qualquer erro em mensagem amigável para exibir no formulário. */
export function getErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 413) return 'O arquivo enviado é muito grande. Use um arquivo menor.'
    if (err.status === 400) return err.message
    if (err.status === 401) return 'Sua sessão expirou. Saia e entre novamente.'
    if (err.status === 403) return 'Você não tem permissão para esta ação.'
    return `Não foi possível salvar (${err.status}). ${err.message}`
  }
  if (err instanceof TypeError) return 'Falha de conexão com o servidor. Verifique sua internet e tente de novo.'
  return 'Não foi possível salvar. Tente novamente.'
}

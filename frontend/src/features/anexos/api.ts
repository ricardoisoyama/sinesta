import { apiBlob, apiFetch, apiUpload } from '@/lib/api'

export type EntidadeAnexo = 'cliente' | 'fornecedor' | 'veiculo' | 'contrato' | 'movimento'

export interface Anexo {
  id: string
  entidade: EntidadeAnexo
  entidadeId: string
  nome: string
  tipo: string
  tamanho: number
  enviadoPor: string
  /** ISO 8601. */
  em: string
}

/** Extensões aceitas e limite por arquivo (12 MB), iguais aos do servidor. */
export const EXTENSOES_ANEXO = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.jpg', '.jpeg', '.png']
export const TAMANHO_MAXIMO_ANEXO = 12 * 1024 * 1024

export const listAnexos = (entidade: EntidadeAnexo, entidadeId: string) =>
  apiFetch<Anexo[]>(`/anexos/${entidade}/${entidadeId}`)

export const enviarAnexo = (entidade: EntidadeAnexo, entidadeId: string, arquivo: File) => {
  const form = new FormData()
  form.append('arquivo', arquivo, arquivo.name)
  return apiUpload<Anexo>(`/anexos/${entidade}/${entidadeId}`, form)
}

export const baixarAnexo = (id: string) => apiBlob(`/anexos/${id}/conteudo`)

export const excluirAnexo = (id: string) => apiFetch<void>(`/anexos/${id}`, { method: 'DELETE' })

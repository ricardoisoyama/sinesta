import { apiFetch } from '@/lib/api'

/** Uma linha da trilha de auditoria (quem fez o quê). */
export interface RegistroAuditoria {
  id: string
  /** ISO 8601 (UTC). */
  em: string
  usuarioId: string
  usuarioNome: string
  acao: string
  entidade: string
  entidadeId: string
  descricao: string
  /** JSON: { campo: { de, para } } com os campos que mudaram. */
  alteracoes: string
  ip: string
}

export interface FiltroAuditoria {
  limite?: number
  entidade?: string
  acao?: string
  usuario?: string
  entidadeId?: string
}

export const listarAuditoria = (f: FiltroAuditoria = {}) => {
  const q = new URLSearchParams()
  if (f.limite) q.set('limite', String(f.limite))
  if (f.entidade) q.set('entidade', f.entidade)
  if (f.acao) q.set('acao', f.acao)
  if (f.usuario) q.set('usuario', f.usuario)
  if (f.entidadeId) q.set('entidadeId', f.entidadeId)
  const qs = q.toString()
  return apiFetch<RegistroAuditoria[]>(`/auditoria${qs ? `?${qs}` : ''}`)
}

export const ACOES: Record<string, string> = {
  criar: 'Criou',
  editar: 'Alterou',
  excluir: 'Excluiu',
  inativar: 'Inativou',
  importar: 'Importou',
  status: 'Mudou status',
  aprovar: 'Aprovou',
  'custo-real': 'Custo realizado',
  anexo: 'Anexou',
  'anexo-excluido': 'Excluiu anexo',
  'transferir-carteira': 'Transferiu carteira',
  login: 'Entrou',
  'login-falhou': 'Login recusado',
}

/** Campos alterados prontos para exibir: "campo: de → para". */
export function alteracoesLegiveis(json: string): { campo: string; de: string; para: string }[] {
  try {
    const obj = JSON.parse(json || '{}') as Record<string, { de: unknown; para: unknown }>
    return Object.entries(obj).map(([campo, v]) => ({ campo, de: mostrar(v.de), para: mostrar(v.para) }))
  } catch {
    return []
  }
}

const mostrar = (v: unknown): string => {
  if (v === null || v === undefined || v === '') return '—'
  if (typeof v === 'string') return v
  if (typeof v === 'number' || typeof v === 'boolean') return String(v)
  const s = JSON.stringify(v)
  return s.length > 120 ? `${s.slice(0, 117)}...` : s
}

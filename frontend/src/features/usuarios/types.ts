/** Perfil de acesso do usuário. */
export type Perfil = 'Gestor' | 'Colaborador'
export const PERFIS: Perfil[] = ['Gestor', 'Colaborador']

/**
 * Funcionário do portal: o mesmo registro guarda o acesso (perfil e permissões)
 * e os dados básicos de RH. Quem usa o sistema é quem trabalha na empresa.
 */
export interface Usuario {
  id: string
  nome: string
  email: string
  perfil: Perfil
  /** Chaves das funcionalidades liberadas (ver funcionalidades.ts). */
  permissoes: string[]
  status: 'ativo' | 'inativo'

  // ── Dados de RH ──────────────────────────────────────────────
  cargo: string
  departamento: string
  cpf: string
  rg: string
  telefone: string
  /** Data de admissão (yyyy-MM-dd). Vazio = não informada. */
  dataAdmissao: string
}

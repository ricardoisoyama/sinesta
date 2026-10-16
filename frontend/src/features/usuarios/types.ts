import type { DadosBancarios, Endereco } from '@/features/parceiros/types'

/**
 * Perfil de acesso do usuário. Admin = a nossa equipe (para o cliente aparece como "Suporte"):
 * tem tudo, inclusive o que é só da equipe. Gestor = o máximo do cliente.
 */
export type Perfil = 'Admin' | 'Gestor' | 'Colaborador'
export const PERFIS: Perfil[] = ['Gestor', 'Colaborador']

/** Como o perfil aparece nas telas. */
export const ROTULO_PERFIL: Record<Perfil, string> = { Admin: 'Suporte', Gestor: 'Gestor', Colaborador: 'Colaborador' }
export const rotuloPerfil = (perfil?: string) => ROTULO_PERFIL[perfil as Perfil] ?? perfil ?? ''

/** Admin e Gestor decidem o que é de gestor (metas, preço abaixo do mínimo...). */
export const temPoderDeGestor = (perfil?: string) => perfil === 'Admin' || perfil === 'Gestor'

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
  /** Cidade ("Santos - SP"); rua e número ficam em `endereco`. */
  cidade?: string
  endereco?: Endereco | null
  /** Conta para pagamento (salário, reembolso). */
  banco?: DadosBancarios | null
}

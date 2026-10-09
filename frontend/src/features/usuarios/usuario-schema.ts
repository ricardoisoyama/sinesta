import { z } from 'zod'
import { PERFIL_PRESET } from './funcionalidades'
import { bancoSchema, enderecoSchema } from '@/features/parceiros/parceiro-schema'
import { bancoVazio, enderecoVazio } from '@/features/parceiros/types'

export const usuarioSchema = z.object({
  nome: z.string().min(2, 'Informe o nome'),
  email: z.string().email('E-mail inválido'),
  perfil: z.enum(['Gestor', 'Colaborador']),
  permissoes: z.array(z.string()).min(1, 'Libere ao menos uma funcionalidade'),
  status: z.enum(['ativo', 'inativo']),
  /** No cadastro é obrigatória (validada no modal); na edição, em branco = manter. */
  senha: z.string(),

  cargo: z.string(),
  departamento: z.string(),
  cpf: z.string(),
  rg: z.string(),
  telefone: z.string(),
  dataAdmissao: z.string(),
  cidade: z.string(),
  endereco: enderecoSchema,
  banco: bancoSchema,
})

export type UsuarioForm = z.infer<typeof usuarioSchema>

export const emptyUsuario: UsuarioForm = {
  nome: '',
  email: '',
  perfil: 'Colaborador',
  permissoes: PERFIL_PRESET.Colaborador,
  status: 'ativo',
  senha: '',
  cargo: '',
  departamento: '',
  cpf: '',
  rg: '',
  telefone: '',
  dataAdmissao: '',
  cidade: '',
  endereco: enderecoVazio(),
  banco: bancoVazio(),
}

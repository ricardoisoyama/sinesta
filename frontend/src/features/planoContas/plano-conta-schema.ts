import { z } from 'zod'

export const planoContaSchema = z.object({
  codigo: z.string().min(1, 'Informe o código'),
  nome: z.string().min(2, 'Informe o nome'),
  /** '' = conta raiz. */
  paiId: z.string(),
  grupoDre: z.enum(['Despesa', 'Receita']),
  contaContabil: z.string(),
  contaDre: z.string(),
  limiteGasto: z.number().min(0),
  tipo: z.enum(['', 'fixa', 'variavel']),
  status: z.enum(['ativo', 'inativo']),
})

export type PlanoContaForm = z.infer<typeof planoContaSchema>

export const emptyPlanoConta: PlanoContaForm = {
  codigo: '',
  nome: '',
  paiId: '',
  grupoDre: 'Despesa',
  contaContabil: '',
  contaDre: '',
  limiteGasto: 0,
  tipo: '',
  status: 'ativo',
}

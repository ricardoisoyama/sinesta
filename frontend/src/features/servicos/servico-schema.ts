import { z } from 'zod'

export const servicoSchema = z.object({
  nome: z.string().min(2, 'Informe o nome'),
  status: z.enum(['ativo', 'inativo']),
})

export type ServicoForm = z.infer<typeof servicoSchema>

export const emptyServico: ServicoForm = {
  nome: '',
  status: 'ativo',
}

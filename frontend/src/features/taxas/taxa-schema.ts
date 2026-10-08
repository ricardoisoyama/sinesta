import { z } from 'zod'

export const taxaSchema = z.object({
  nome: z.string().min(2, 'Informe o nome'),
  tipo: z.enum(['percentual', 'fixo']),
  valor: z.number().min(0, 'Valor inválido'),
  status: z.enum(['ativo', 'inativo']),
})

export type TaxaForm = z.infer<typeof taxaSchema>

export const emptyTaxa: TaxaForm = {
  nome: '',
  tipo: 'percentual',
  valor: 0,
  status: 'ativo',
}

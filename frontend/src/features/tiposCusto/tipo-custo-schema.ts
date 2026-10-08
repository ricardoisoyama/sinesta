import { z } from 'zod'

export const tipoCustoSchema = z.object({
  nome: z.string().min(2, 'Informe o nome'),
  modo: z.enum(['valor', 'percentual']),
  valor: z.number().min(0, 'Valor inválido'),
  basePercentual: z.enum(['nf', 'servico']),
  status: z.enum(['ativo', 'inativo']),
})

export type TipoCustoForm = z.infer<typeof tipoCustoSchema>

export const emptyTipoCusto: TipoCustoForm = {
  nome: '',
  modo: 'valor',
  valor: 0,
  basePercentual: 'nf',
  status: 'ativo',
}

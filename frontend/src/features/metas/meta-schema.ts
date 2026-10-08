import { z } from 'zod'

export const metaSchema = z
  .object({
    nome: z.string().min(1, 'Informe o nome'),
    empresaId: z.string().min(1, 'Escolha a empresa: a meta compõe o fator dela'),
    ano: z.number().int().min(2000, 'Informe o ano').max(2100, 'Ano inválido'),
    valoresMensais: z.array(z.number().min(0, 'Não pode ser negativa')).length(12),
    principal: z.boolean(),
  })
  .refine((m) => m.valoresMensais.reduce((a, v) => a + v, 0) > 0, {
    message: 'Informe a meta de pelo menos um mês',
    path: ['valoresMensais'],
  })

export type MetaForm = z.infer<typeof metaSchema>

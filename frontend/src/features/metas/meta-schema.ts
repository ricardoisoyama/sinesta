import { z } from 'zod'
import { conferirValores } from './regras'

export const metaSchema = z
  .object({
    nome: z.string().min(1, 'Informe o nome'),
    empresaId: z.string().min(1, 'Escolha a empresa: a meta compõe o fator dela'),
    ano: z.number().int().min(2000, 'Informe o ano').max(2100, 'Ano inválido'),
    /** O "mandante": os meses precisam somar exatamente ele. */
    metaAnual: z.number().min(0),
    valoresMensais: z.array(z.number().min(0, 'Não pode ser negativa')).length(12),
    principal: z.boolean(),
    basePreco: z.enum(['media', 'mes']),
    entradaMeses: z.enum(['valor', 'percentual']),
    origemAnual: z.enum(['valor', 'anoAnterior']),
    crescimentoAnoAnterior: z.number(),
  })
  .superRefine((m, ctx) => {
    if (!(m.metaAnual > 0)) {
      ctx.addIssue({ code: 'custom', path: ['metaAnual'], message: 'Informe o valor anual' })
      return
    }
    const motivo = conferirValores(m.metaAnual, m.valoresMensais)
    if (motivo) ctx.addIssue({ code: 'custom', path: ['valoresMensais'], message: motivo })
  })

export type MetaForm = z.infer<typeof metaSchema>

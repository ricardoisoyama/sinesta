import { z } from 'zod'
import type { ServicoFiscal } from './fiscal'

export const servicoSchema = z.object({
  nome: z.string().min(2, 'Informe o nome'),
  status: z.enum(['ativo', 'inativo']),
  /** Dados fiscais por empresa (o editor confere os campos; aqui só passa adiante). */
  fiscais: z.array(z.custom<ServicoFiscal>()),
})

export type ServicoForm = z.infer<typeof servicoSchema>

export const emptyServico: ServicoForm = {
  nome: '',
  status: 'ativo',
  fiscais: [],
}

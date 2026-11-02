import { z } from 'zod'
import type { ServicoFiscal } from './fiscal'
import type { ImpostoServico } from './impostos'

export const servicoSchema = z.object({
  nome: z.string().min(2, 'Informe o nome'),
  status: z.enum(['ativo', 'inativo']),
  /** Dados fiscais por empresa (o editor confere os campos; aqui só passa adiante). */
  fiscais: z.array(z.custom<ServicoFiscal>()),
  /** Impostos do serviço para o Pricing (o servidor confere). */
  impostos: z.array(z.custom<ImpostoServico>()),
})

export type ServicoForm = z.infer<typeof servicoSchema>

export const emptyServico: ServicoForm = {
  nome: '',
  status: 'ativo',
  fiscais: [],
  impostos: [],
}

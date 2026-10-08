import { z } from 'zod'

export const custoFixoSchema = z
  .object({
    unidadeId: z.string().min(1, 'Selecione a empresa'),
    descricao: z.string().min(2, 'Informe a descrição'),
    categoriaId: z.string().min(1, 'Selecione a categoria'),
    valorMensal: z.number().min(0, 'Valor inválido'),
    planoContaId: z.string(),
    tipo: z.enum(['recorrente', 'spot']),
    dataInicio: z.string(),
    dataFim: z.string(),
    fornecedorId: z.string(),
    /** 0 = não informado. */
    diaVencimento: z.number().int('Use um dia inteiro').min(0).max(31, 'O dia vai de 1 a 31'),
    status: z.enum(['ativo', 'inativo']),
  })
  .refine((d) => !d.dataFim || !d.dataInicio || d.dataFim >= d.dataInicio, {
    message: 'O término não pode ser antes do início',
    path: ['dataFim'],
  })

export type CustoFixoForm = z.infer<typeof custoFixoSchema>

export const emptyCustoFixo: CustoFixoForm = {
  unidadeId: '',
  descricao: '',
  categoriaId: '',
  valorMensal: 0,
  planoContaId: '',
  tipo: 'recorrente',
  dataInicio: '',
  dataFim: '',
  fornecedorId: '',
  diaVencimento: 0,
  status: 'ativo',
}

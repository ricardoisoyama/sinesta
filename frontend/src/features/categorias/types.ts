/** Categoria de despesa: classifica os custos e sugere a conta do plano de contas. */
export interface CategoriaCusto {
  id: string
  nome: string
  planoContaId: string
  status: 'ativo' | 'inativo'
}

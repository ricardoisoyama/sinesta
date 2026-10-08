export type TipoTaxa = 'percentual' | 'fixo'

export interface Taxa {
  id: string
  nome: string
  tipo: TipoTaxa
  /** Se 'percentual': fração sobre a NF (0,003 = 0,3%). Se 'fixo': valor em R$. */
  valor: number
  status: 'ativo' | 'inativo'
}

export const REGIOES = ['Norte', 'Nordeste', 'Centro-Oeste', 'Sudeste', 'Sul'] as const
export type Regiao = (typeof REGIOES)[number]

export interface IcmsUf {
  id: string
  uf: string
  nome: string
  regiao: Regiao
  /** Alíquota de ICMS em fração (0,12 = 12%). Gross-up = valor ÷ (1 − alíquota). */
  aliquota: number
}

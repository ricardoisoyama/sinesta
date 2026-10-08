/**
 * Meta de faturamento por empresa e por mês. Além de acompanhar o realizado, a meta compõe
 * o fator da empresa: o DF% é a despesa fixa mensal dividida pela meta do mês corrente.
 */
export const mesesMeta = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

export interface CenarioMeta {
  id: string
  nome: string
  /** Empresa da meta (o fator é por empresa). Vazio nas metas antigas. */
  empresaId?: string
  /** Total do ano. Com os 12 meses, é a soma deles. */
  metaAnual: number
  /** Meta de cada mês, jan–dez (R$). Vazio nas metas antigas. */
  valoresMensais?: number[]
  /** Com mais de uma meta da empresa no ano, esta compõe o fator. */
  principal?: boolean
  /** Ano da meta. Ausente/0 nos registros antigos = ano corrente. */
  ano?: number
  /** Meta nunca é apagada: inativa sai da tela. Ausente = ativa. */
  status?: 'ativo' | 'inativo'
}

/**
 * Os 12 valores da meta: os lançados ou, na meta antiga só com o total do ano, o anual dividido
 * igual pelos meses. É o que o motor do fator faz (FatorService): tela e preço usam a mesma meta.
 */
export const mesesDaMeta = (m: Pick<CenarioMeta, 'metaAnual' | 'valoresMensais'>): number[] =>
  m.valoresMensais?.length === 12 ? m.valoresMensais : distribuirIgual(m.metaAnual)

/** Divide um valor anual igualmente pelos 12 meses (os centavos que sobram vão para dezembro). */
export function distribuirIgual(anual: number): number[] {
  const centavos = Math.round((anual || 0) * 100)
  const cada = Math.floor(centavos / 12)
  return Array.from({ length: 12 }, (_, i) => (i === 11 ? centavos - cada * 11 : cada) / 100)
}

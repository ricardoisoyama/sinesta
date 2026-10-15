/** Recorrente projeta a despesa (entra na DF); spot é despesa única. */
export type TipoCustoFixo = 'recorrente' | 'spot'

export const TIPOS_CUSTO_FIXO: { valor: TipoCustoFixo; label: string; ajuda: string }[] = [
  {
    valor: 'recorrente',
    label: 'Recorrente',
    ajuda: 'Repete todo mês e compõe a DF (base do markup).',
  },
  {
    valor: 'spot',
    label: 'Spot',
    ajuda: 'Despesa única, não é projetada nem entra no markup.',
  },
]

/** Término de quem não tem prazo final: grava uma data (não vazio) para exportação e filtros. */
export const DATA_FIM_SEM_PRAZO = '9999-12-31'

export interface CustoFixo {
  id: string
  /** Número da despesa (gerado pelo banco). Ausente antes de gravar. */
  numero?: number
  /** Unidade a que pertence o custo (ver features/unidades). */
  unidadeId: string
  descricao: string
  /** Categoria de despesa (cadastro em features/categorias). */
  categoriaId: string
  /** Valor fixo mensal (R$). O anual é derivado (× 12). */
  valorMensal: number
  /** Conta do plano de contas (opcional; sugerida pela categoria). */
  planoContaId?: string
  tipo: TipoCustoFixo
  /** Vigência da recorrência (yyyy-MM-dd). Vazio = sem data definida. */
  dataInicio: string
  dataFim: string
  /** Fornecedor que emite a despesa (cadastro em features/parceiros). */
  fornecedorId: string
  /** Dia do mês em que vence (1–31). 0 = não informado. */
  diaVencimento?: number
  /**
   * Rateio entre empresas: a parte de cada uma vai para a DF (e o markup) dela. Vazio = sem rateio
   * (tudo de `unidadeId`, a empresa que paga a conta, que sempre faz parte quando há rateio).
   */
  rateio?: RateioEmpresa[]
  status: 'ativo' | 'inativo'
}

export interface RateioEmpresa {
  empresaId: string
  /** Fração (0,5 = 50%). */
  percentual: number
}

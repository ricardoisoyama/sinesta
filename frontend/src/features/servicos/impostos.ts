/**
 * Impostos do serviço (o Pricing usa no lugar dos da empresa): base de cálculo × alíquota, e se entra
 * no preço (markup) ou é só destacado. Espelha `ImpostoServico` do .NET.
 */
export type TipoImposto = 'irpj' | 'irpj-adicional' | 'csll' | 'pis' | 'cofins' | 'cbs' | 'ibs' | 'iss' | 'icms' | 'inss' | 'das' | 'outro'

export interface ImpostoServico {
  id: string
  imposto: TipoImposto
  /** Nome livre (só no "outro"). */
  nome: string
  /** Base sobre a receita (fração): 1 = 100%; 0,08 = presunção de 8%. */
  base: number
  aliquota: number
  /** Só no adicional do IRPJ: a base presumida do mês até este valor (R$) não paga. */
  limite: number
  /** true = entra no markup; false = só destacado na nota. */
  afetaPreco: boolean
}

export const TIPOS_IMPOSTO: { valor: TipoImposto; label: string; ajuda: string }[] = [
  { valor: 'irpj', label: 'IRPJ', ajuda: 'Lucro Presumido: 15% sobre a base presumida (8% no transporte de cargas; 32% em serviços como armazenagem).' },
  { valor: 'irpj-adicional', label: 'Adicional do IRPJ', ajuda: '10% do que a base presumida do mês passar de R$ 20 mil (R$ 60 mil no trimestre). Calculado com o faturamento da meta da empresa.' },
  { valor: 'csll', label: 'CSLL', ajuda: '9% sobre a base presumida (12% no transporte de cargas; 32% em serviços como armazenagem).' },
  { valor: 'pis', label: 'PIS', ajuda: 'Cumulativo (Lucro Presumido): 0,65% da receita. Deixa de existir em 2027 (vira CBS).' },
  { valor: 'cofins', label: 'COFINS', ajuda: 'Cumulativo (Lucro Presumido): 3% da receita. Deixa de existir em 2027 (vira CBS).' },
  { valor: 'cbs', label: 'CBS', ajuda: 'Reforma tributária (federal), cobrada por fora e com crédito nas compras. 2026: 0,9% de teste, compensado; 2027 em diante: alíquota cheia.' },
  { valor: 'ibs', label: 'IBS', ajuda: 'Reforma tributária (estado + município), por fora e com crédito. 2026: 0,1% de teste; sobe de 2029 a 2033 enquanto o ICMS e o ISS caem.' },
  { valor: 'iss', label: 'ISS', ajuda: 'Serviço dentro do município (armazenagem, transporte municipal): de 2% a 5%, conforme a prefeitura. A NFS-e usa esta alíquota.' },
  { valor: 'icms', label: 'ICMS', ajuda: 'Transporte intermunicipal e interestadual. No Pricing vale a alíquota da rota (origem × destino); a daqui vale quando a rota não vier. Sem esta linha, o serviço não tem ICMS.' },
  { valor: 'inss', label: 'INSS', ajuda: 'Contribuição sobre a receita, quando houver.' },
  { valor: 'das', label: 'DAS (Simples)', ajuda: 'Simples Nacional: a alíquota efetiva do DAS, que já inclui os tributos do regime.' },
  { valor: 'outro', label: 'Outro', ajuda: 'Qualquer outro imposto ou taxa sobre a receita (dê um nome).' },
]

export const rotuloImposto = (i: Pick<ImpostoServico, 'imposto' | 'nome'>) =>
  i.imposto === 'outro' ? i.nome || 'Outro' : (TIPOS_IMPOSTO.find((t) => t.valor === i.imposto)?.label ?? i.imposto)

export const novoImposto = (imposto: TipoImposto = 'outro'): ImpostoServico => ({
  id: crypto.randomUUID(),
  imposto,
  nome: '',
  base: imposto === 'irpj' || imposto === 'irpj-adicional' ? 0.08 : imposto === 'csll' ? 0.12 : 1,
  aliquota: { irpj: 0.15, 'irpj-adicional': 0.1, csll: 0.09, pis: 0.0065, cofins: 0.03, iss: 0.05 }[imposto as string] ?? 0,
  limite: imposto === 'irpj-adicional' ? 20000 : 0,
  afetaPreco: true,
})

/** Alíquota efetiva sobre a receita (o adicional depende do faturamento do mês). */
export function efetivaImposto(i: ImpostoServico, faturamentoMensal: number): number {
  if (i.imposto !== 'irpj-adicional') return i.base * i.aliquota
  if (faturamentoMensal <= 0) return 0
  return (Math.max(0, faturamentoMensal * i.base - i.limite) * i.aliquota) / faturamentoMensal
}

/** O que entra no markup e o que é só destacado. O ICMS fica de fora: entra por dentro, pela rota. */
export function cargaDoServico(impostos: ImpostoServico[], faturamentoMensal: number) {
  const semIcms = impostos.filter((i) => i.imposto !== 'icms')
  const soma = (l: ImpostoServico[]) => l.reduce((a, i) => a + efetivaImposto(i, faturamentoMensal), 0)
  return {
    noPreco: soma(semIcms.filter((i) => i.afetaPreco)),
    destacados: soma(semIcms.filter((i) => !i.afetaPreco)),
    icms: impostos.find((i) => i.imposto === 'icms'),
  }
}

type Linha = Pick<ImpostoServico, 'imposto' | 'base' | 'aliquota' | 'limite'>
const linha = (imposto: TipoImposto, base: number, aliquota: number, limite = 0): Linha => ({ imposto, base, aliquota, limite })

/**
 * Modelos da planilha da contabilidade (ALIQUOTAS, quadros "com reforma tributária"), Lucro Presumido.
 * Ponto de partida: as alíquotas são editáveis e "no preço" vem marcado em todos.
 */
export const MODELOS_IMPOSTOS: { id: string; nome: string; linhas: Linha[] }[] = [
  {
    id: 'transporte',
    nome: 'Transporte (Lucro Presumido, com reforma)',
    linhas: [
      linha('irpj', 0.08, 0.15),
      linha('irpj-adicional', 0.08, 0.1, 20000),
      linha('csll', 0.12, 0.09),
      linha('cbs', 1, 0.088),
      linha('iss', 1, 0.05),
      linha('icms', 1, 0.18),
    ],
  },
  {
    id: 'armazenagem',
    nome: 'Armazenagem (Lucro Presumido, com reforma)',
    linhas: [
      linha('irpj', 0.32, 0.15),
      linha('irpj-adicional', 0.32, 0.1, 20000),
      linha('csll', 0.32, 0.09),
      linha('cbs', 1, 0.088),
      linha('iss', 1, 0.05),
    ],
  },
]

export const impostosDoModelo = (id: string): ImpostoServico[] =>
  (MODELOS_IMPOSTOS.find((m) => m.id === id)?.linhas ?? []).map((l) => ({ ...l, id: crypto.randomUUID(), nome: '', afetaPreco: true }))

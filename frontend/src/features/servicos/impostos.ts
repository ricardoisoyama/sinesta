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
  /** Efetiva digitada (a que a contabilidade passa): independe da alíquota. Nula = base × alíquota. */
  efetivaInformada?: number | null
  /** Não usado (fica por compatibilidade com o cadastro de antes). */
  limite: number
  /** true = entra no markup; false = só destacado na nota. */
  afetaPreco: boolean
  /** Regime da empresa em que vale ('' = qualquer, cadastro de antes). */
  regime: RegimeTabela | ''
  /** Início da vigência (aaaa-mm-dd), definido pelo usuário; '' = desde sempre. */
  vigenteDesde: string
}

/** Uma tabela de impostos por regime: o MEI usa a do Simples. */
export type RegimeTabela = 'Simples Nacional' | 'Lucro Presumido' | 'Lucro Real'
export const REGIMES_TABELA: RegimeTabela[] = ['Simples Nacional', 'Lucro Presumido', 'Lucro Real']
export const regimeDaTabela = (regime: string): RegimeTabela =>
  regime === 'MEI' ? 'Simples Nacional' : (REGIMES_TABELA.find((r) => r === regime) ?? 'Lucro Presumido')

/** Datas de início das tabelas do regime, em ordem ('' = desde sempre vem antes). */
export const vigenciasDoRegime = (impostos: ImpostoServico[], regime: RegimeTabela) =>
  [...new Set(impostos.filter((i) => i.regime === regime).map((i) => i.vigenteDesde))].sort()

/** A vigência em vigor na data (a mais recente que já começou); undefined = nenhuma começou. */
export const vigenciaEmVigor = (vigencias: string[], hoje: string): string | undefined => vigencias.filter((v) => v <= hoje).pop()

/** Espelha `Servico.ImpostosVigentes` do .NET: a tabela do regime (ou a sem regime) em vigor na data. */
export function impostosVigentes(impostos: ImpostoServico[], regime: string, hoje: string): ImpostoServico[] {
  const r = regimeDaTabela(regime)
  let doRegime = impostos.filter((i) => i.regime === r)
  if (!doRegime.length) doRegime = impostos.filter((i) => !i.regime)
  const inicio = vigenciaEmVigor([...new Set(doRegime.map((i) => i.vigenteDesde))].sort(), hoje)
  return inicio === undefined ? [] : doRegime.filter((i) => i.vigenteDesde === inicio)
}

export const hojeIso = () => new Date().toLocaleDateString('sv-SE')
export const dataBr = (iso: string) => (iso ? iso.split('-').reverse().join('/') : '')

export const TIPOS_IMPOSTO: { valor: TipoImposto; label: string; ajuda: string }[] = [
  { valor: 'irpj', label: 'IRPJ', ajuda: 'Lucro Presumido: 15% sobre a base presumida (8% no transporte de cargas; 32% em serviços como armazenagem).' },
  { valor: 'irpj-adicional', label: 'Adicional do IRPJ', ajuda: 'Informe a alíquota efetiva que a contabilidade passa (o adicional depende do faturamento do período).' },
  { valor: 'csll', label: 'CSLL', ajuda: '9% sobre a base presumida (12% no transporte de cargas; 32% em serviços como armazenagem).' },
  { valor: 'pis', label: 'PIS', ajuda: 'Cumulativo (Lucro Presumido): 0,65% da receita. Deixa de existir em 2027 (vira CBS).' },
  { valor: 'cofins', label: 'COFINS', ajuda: 'Cumulativo (Lucro Presumido): 3% da receita. Deixa de existir em 2027 (vira CBS).' },
  { valor: 'cbs', label: 'CBS', ajuda: 'Reforma tributária (federal), cobrada por fora e com crédito nas compras. 2026: 0,9% de teste, compensado; 2027 em diante: alíquota cheia.' },
  { valor: 'ibs', label: 'IBS', ajuda: 'Reforma tributária (estado + município), por fora e com crédito. 2026: 0,1% de teste; sobe de 2029 a 2033 enquanto o ICMS e o ISS caem.' },
  { valor: 'iss', label: 'ISS', ajuda: 'Serviço dentro do município (armazenagem, transporte municipal): de 2% a 5%, conforme a prefeitura. A NFS-e usa esta alíquota.' },
  { valor: 'icms', label: 'ICMS', ajuda: 'Transporte intermunicipal e interestadual. A alíquota vem da Tabela de ICMS (origem × destino da operação). Sem esta linha, o serviço não tem ICMS.' },
  { valor: 'inss', label: 'INSS', ajuda: 'Contribuição sobre a receita, quando houver.' },
  { valor: 'das', label: 'DAS (Simples)', ajuda: 'Simples Nacional: a alíquota efetiva do DAS, que já inclui os tributos do regime.' },
  { valor: 'outro', label: 'Outro', ajuda: 'Qualquer outro imposto ou taxa sobre a receita (dê um nome).' },
]

export const rotuloImposto = (i: Pick<ImpostoServico, 'imposto' | 'nome'>) =>
  i.imposto === 'outro' ? i.nome || 'Outro' : (TIPOS_IMPOSTO.find((t) => t.valor === i.imposto)?.label ?? i.imposto)

export const novoImposto = (imposto: TipoImposto = 'outro', regime: RegimeTabela | '' = '', vigenteDesde = ''): ImpostoServico => ({
  regime,
  vigenteDesde,
  id: crypto.randomUUID(),
  imposto,
  nome: '',
  base: imposto === 'irpj' ? 0.08 : imposto === 'csll' ? 0.12 : 1,
  aliquota: { irpj: 0.15, csll: 0.09, pis: 0.0065, cofins: 0.03, iss: 0.05 }[imposto as string] ?? 0,
  limite: 0,
  afetaPreco: true,
})

/** Base × alíquota: a efetiva quando o usuário não digitou outra. */
export const efetivaCalculada = (i: Pick<ImpostoServico, 'base' | 'aliquota'>): number => i.base * i.aliquota

/** Alíquota efetiva sobre a receita: a informada, senão base × alíquota (o ICMS vem da Tabela de ICMS, pela rota). */
export const efetivaImposto = (i: ImpostoServico): number => (i.imposto === 'icms' ? 0 : (i.efetivaInformada ?? efetivaCalculada(i)))

/** O que entra no markup e o que é só destacado. O ICMS fica de fora: entra por dentro, pela rota. */
export function cargaDoServico(impostos: ImpostoServico[]) {
  const semIcms = impostos.filter((i) => i.imposto !== 'icms')
  const soma = (l: ImpostoServico[]) => l.reduce((a, i) => a + efetivaImposto(i), 0)
  return {
    noPreco: soma(semIcms.filter((i) => i.afetaPreco)),
    destacados: soma(semIcms.filter((i) => !i.afetaPreco)),
    icms: impostos.find((i) => i.imposto === 'icms'),
  }
}

type Linha = Pick<ImpostoServico, 'imposto' | 'base' | 'aliquota' | 'limite'>
const linha = (imposto: TipoImposto, base: number, aliquota: number): Linha => ({ imposto, base, aliquota, limite: 0 })

/**
 * Modelos de partida: os da planilha da contabilidade (ALIQUOTAS, quadros "com reforma tributária") para o
 * Lucro Presumido e o DAS para o Simples. As alíquotas são editáveis e "no preço" vem marcado em todos.
 */
export const MODELOS_IMPOSTOS: { id: string; nome: string; regime: RegimeTabela; linhas: Linha[] }[] = [
  {
    id: 'simples',
    nome: 'Simples Nacional (DAS: informe a alíquota efetiva)',
    regime: 'Simples Nacional',
    linhas: [linha('das', 1, 0)],
  },
  {
    id: 'transporte',
    regime: 'Lucro Presumido',
    nome: 'Transporte (Lucro Presumido, com reforma)',
    linhas: [
      linha('irpj', 0.08, 0.15),
      // Adicional: a alíquota efetiva da planilha (R$ 300 mil/mês); a contabilidade informa a de cada empresa.
      linha('irpj-adicional', 1, 0.001333),
      linha('csll', 0.12, 0.09),
      linha('cbs', 1, 0.088),
      linha('iss', 1, 0.05),
      linha('icms', 1, 0),
    ],
  },
  {
    id: 'armazenagem',
    regime: 'Lucro Presumido',
    nome: 'Armazenagem (Lucro Presumido, com reforma)',
    linhas: [
      linha('irpj', 0.32, 0.15),
      linha('irpj-adicional', 1, 0.025333),
      linha('csll', 0.32, 0.09),
      linha('cbs', 1, 0.088),
      linha('iss', 1, 0.05),
    ],
  },
]

export const impostosDoModelo = (id: string, regime: RegimeTabela | '' = '', vigenteDesde = ''): ImpostoServico[] =>
  (MODELOS_IMPOSTOS.find((m) => m.id === id)?.linhas ?? []).map((l) => ({ ...l, id: crypto.randomUUID(), nome: '', afetaPreco: true, regime, vigenteDesde }))

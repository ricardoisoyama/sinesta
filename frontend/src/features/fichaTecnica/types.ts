/**
 * Ficha Técnica: substitui o Tipo de Custo. Cada empresa tem várias FICHAS, como pastas
 * (Funcionários, Tecnologia...). Cada ficha define as suas COLUNAS (salário, encargos... ou
 * valor mensal) e cadastra os ITENS (Porteiro diurno, Plano CRM - Ouro) com os valores. O
 * total de cada item é o custo que entra no Pricing.
 *
 * Na base, tudo em linhas: `ficha_grupos` (as fichas), `ficha_colunas`, `fichas_tecnicas`
 * (os itens, nome antigo da tabela) e `ficha_valores` (uma célula por item × coluna).
 * Criar coluna cria linha, nunca coluna de tabela. Remover é inativar.
 */
export type TipoColunaFicha = 'texto' | 'lista' | 'numero' | 'valor' | 'percentual' | 'calculo'

export const TIPOS_COLUNA: { valor: TipoColunaFicha; label: string; ajuda: string }[] = [
  { valor: 'valor', label: 'Valor (R$)', ajuda: 'Um valor em reais digitado na linha. Normalmente compõe o total.' },
  { valor: 'percentual', label: '% sobre outra coluna', ajuda: 'Percentual aplicado sobre uma coluna base (ex.: adicional noturno = 20% do salário).' },
  { valor: 'calculo', label: 'Cálculo (fórmula)', ajuda: 'Fórmula com as outras colunas, como numa célula de planilha: (salario_base + cargo_de_confianca) * 68%.' },
  { valor: 'numero', label: 'Número', ajuda: 'Quantidade ou índice usado em fórmulas (km, litros, horas). Não entra no total sozinho.' },
  { valor: 'texto', label: 'Texto', ajuda: 'Só informação (observação, código).' },
  { valor: 'lista', label: 'Lista de opções', ajuda: 'Escolha entre opções fixas (Diurno / Noturno).' },
]

/** Tipos que produzem número e podem compor o total. */
export const TIPOS_NUMERICOS: TipoColunaFicha[] = ['numero', 'valor', 'percentual', 'calculo']

type Status = 'ativo' | 'inativo'

/** A ficha que o usuário vê: uma pasta com colunas e itens próprios. */
export interface GrupoFicha {
  id: string
  nome: string
  /** Como sai o total do item: vazio = soma das colunas marcadas; preenchido = esta fórmula. */
  formulaTotal?: string
  /** Pasta em que a ficha está ('' = na raiz). */
  pastaId?: string
  /** Largura da coluna Item desta ficha, em px (0 = padrão); vale para todos. */
  larguraItem?: number
  status: Status
}

/** Pasta da Ficha Técnica: guarda subpastas e fichas (ex.: COBRECOM › Operação Santos). */
export interface PastaFicha {
  id: string
  nome: string
  /** Pasta de cima ('' = na raiz). */
  paiId: string
  status: Status
}

export const novaPasta = (paiId = '', nome = 'Nova pasta'): PastaFicha => ({ id: crypto.randomUUID(), nome, paiId, status: 'ativo' })

/** Caminho da pasta até a raiz: "COBRECOM › Operação Santos". */
export function caminhoPasta(pastas: PastaFicha[], pastaId: string | undefined): string {
  const nomes: string[] = []
  const vistos = new Set<string>()
  let id = pastaId ?? ''
  while (id && !vistos.has(id)) {
    vistos.add(id)
    const p = pastas.find((x) => x.id === id)
    if (!p) break
    nomes.unshift(p.nome || 'Sem nome')
    id = p.paiId
  }
  return nomes.join(' › ')
}

export interface ColunaFicha {
  id: string
  /** Ficha (pasta) dona da coluna. */
  grupoId: string
  nome: string
  /** Identificador usado nas fórmulas (gerado do nome; renomear reescreve as fórmulas). Único dentro da ficha. */
  chave: string
  tipo: TipoColunaFicha
  /** Entra na soma do total da linha (só faz sentido para tipos numéricos). */
  compoeTotal: boolean
  /** Chave da coluna base quando tipo = percentual. */
  base: string
  /** Expressão quando tipo = calculo. */
  formula: string
  /** Opções quando tipo = lista. */
  opcoes: string[]
  /** Largura no grid, em px (0 = padrão); vale para todos. */
  largura?: number
  status: Status
}

/** Um item de uma ficha (linha do grid). O nome do tipo é histórico. */
export interface FichaTecnica {
  id: string
  /** Ficha (pasta) do item: as colunas que valem para ele são as da mesma ficha. */
  grupoId: string
  nome: string
  /** Valor por ID da coluna: número (valor, percentual em fração, número) ou texto. */
  valores: Record<string, number | string>
  status: Status
  /** Calculado pelo servidor (a tela recalcula ao vivo enquanto se digita). */
  total?: number
}

export interface GradeFichas {
  grupos: GrupoFicha[]
  colunas: ColunaFicha[]
  fichas: FichaTecnica[]
  /** Pastas (níveis acima das fichas). */
  pastas?: PastaFicha[]
}

export const novoGrupo = (nome = 'Nova ficha'): GrupoFicha => ({ id: crypto.randomUUID(), nome, status: 'ativo' })

export const novaColuna = (grupoId: string, nome = '', tipo: TipoColunaFicha = 'valor'): ColunaFicha => ({
  id: crypto.randomUUID(),
  grupoId,
  nome,
  chave: '',
  tipo,
  compoeTotal: tipo === 'valor' || tipo === 'percentual' || tipo === 'calculo',
  base: '',
  formula: '',
  opcoes: [],
  status: 'ativo',
})

export const novaFicha = (grupoId: string, nome = ''): FichaTecnica => ({
  id: crypto.randomUUID(),
  grupoId,
  nome,
  valores: {},
  status: 'ativo',
})

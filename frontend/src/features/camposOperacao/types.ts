/**
 * Dados da Operação parametrizáveis. Cada empresa define quais campos aparecem no bloco
 * "Dados da operação" da Precificação e o que cada um faz com o preço. Não existe campo
 * fixo: cliente, cidade, quantidade... tudo é configurado aqui.
 *
 * Na base: uma LINHA por campo em `campos_operacao` (criar campo nunca cria coluna).
 * Remover é inativar. A proposta guarda um retrato (nome, tipo, efeito e valor de cada
 * campo) no dia em que o item entrou, então mudar os campos depois não altera propostas feitas.
 */
export type TipoCampoOperacao = 'texto' | 'lista' | 'uf' | 'cidade' | 'cadastro' | 'data' | 'numero' | 'valor' | 'percentual'

export type CadastroOrigem = 'cliente' | 'fornecedor' | 'vendedor' | 'servico' | 'veiculo'

/** O que o campo faz com o cálculo do preço (escolhido pelo usuário, dentro do que o tipo permite). */
export type EfeitoCampo = 'informativo' | 'multiplica' | 'soma-custo' | 'pct-custo'

export const TIPOS_CAMPO: { valor: TipoCampoOperacao; label: string; ajuda: string }[] = [
  { valor: 'texto', label: 'Texto', ajuda: 'Texto livre.' },
  { valor: 'lista', label: 'Lista de opções', ajuda: 'Escolha entre opções fixas (ex.: escala 12x36, 5x2).' },
  { valor: 'uf', label: 'Lista de UFs', ajuda: 'Combo com as 27 UFs do Brasil.' },
  { valor: 'cidade', label: 'Lista de cidades', ajuda: 'Busca na base de municípios do IBGE ("SP - São Paulo"). Filtra pela UF do campo de UF mais próximo, quando preenchida.' },
  { valor: 'cadastro', label: 'Cadastro', ajuda: 'Escolhe um registro do sistema (cliente, fornecedor, vendedor, serviço, veículo).' },
  { valor: 'data', label: 'Data', ajuda: 'Uma data (início do contrato, coleta...).' },
  { valor: 'numero', label: 'Número', ajuda: 'Quantidade, peso, metragem. Pode multiplicar o preço.' },
  { valor: 'valor', label: 'Valor (R$)', ajuda: 'Valor em reais. Pode entrar como custo da operação.' },
  { valor: 'percentual', label: 'Percentual', ajuda: 'Percentual. Pode ser aplicado sobre o custo da operação.' },
]

export const EFEITOS: Record<EfeitoCampo, { label: string; cor: string; ajuda: string }> = {
  informativo: { label: 'Só informa', cor: 'cinza', ajuda: 'Vai para a proposta, não mexe no preço.' },
  multiplica: { label: 'Multiplica o preço', cor: 'laranja', ajuda: '2 postos = 2 × o preço do item.' },
  'soma-custo': { label: 'Soma ao custo', cor: 'verde', ajuda: 'Entra como custo da operação, antes do markup.' },
  'pct-custo': { label: '% sobre o custo', cor: 'verde', ajuda: 'Percentual aplicado sobre o custo e somado a ele.' },
}

/** Efeitos que cada tipo aceita. Texto, listas, cadastro e data só informam. */
export const EFEITOS_POR_TIPO: Record<TipoCampoOperacao, EfeitoCampo[]> = {
  texto: ['informativo'],
  lista: ['informativo'],
  uf: ['informativo'],
  cidade: ['informativo'],
  cadastro: ['informativo'],
  data: ['informativo'],
  numero: ['informativo', 'multiplica'],
  valor: ['informativo', 'soma-custo'],
  percentual: ['informativo', 'pct-custo'],
}

/** Efeito válido do campo (cai para "só informa" se o tipo não permite o escolhido). */
export const efeitoDe = (c: Pick<CampoOperacao, 'tipo' | 'efeito'>): EfeitoCampo =>
  EFEITOS_POR_TIPO[c.tipo].includes(c.efeito) ? c.efeito : 'informativo'

export const CADASTROS: { valor: CadastroOrigem; label: string }[] = [
  { valor: 'cliente', label: 'Clientes' },
  { valor: 'fornecedor', label: 'Fornecedores' },
  { valor: 'vendedor', label: 'Vendedores' },
  { valor: 'servico', label: 'Serviços' },
  { valor: 'veiculo', label: 'Veículos' },
]

/** Largura no grid de 4 colunas da Precificação. */
export type LarguraCampo = 1 | 2 | 4
export const LARGURAS: { valor: LarguraCampo; label: string }[] = [
  { valor: 1, label: 'Curto' },
  { valor: 2, label: 'Médio' },
  { valor: 4, label: 'Linha inteira' },
]

/** Tipo de operação da empresa (Transporte, Armazenagem...): cada um tem os seus campos. */
export interface TipoOperacao {
  id: string
  nome: string
  status: 'ativo' | 'inativo'
}

/** Id do tipo "Geral" da empresa (o mesmo que a migração criou para quem já tinha campos). */
export const idTipoPadrao = (empresaId: string) => `padrao-${empresaId}`

/** Tipos e campos da empresa, como a tela edita e o servidor grava. */
export interface DadosOperacao {
  tipos: TipoOperacao[]
  campos: CampoOperacao[]
}

export interface CampoOperacao {
  id: string
  /** Tipo de operação a que o campo pertence. */
  tipoOperacaoId: string
  nome: string
  /** Identificador estável (gerado do nome). */
  chave: string
  tipo: TipoCampoOperacao
  efeito: EfeitoCampo
  obrigatorio: boolean
  largura: LarguraCampo
  /** Opções quando tipo = lista. */
  opcoes: string[]
  /** Origem quando tipo = cadastro. */
  cadastro: CadastroOrigem | ''
  /** Texto de ajuda mostrado no balão do campo na Precificação. */
  ajuda: string
  /** Remover = inativar (o campo continua existindo para as propostas antigas). */
  status: 'ativo' | 'inativo'
}

export const novoCampo = (nome = '', tipo: TipoCampoOperacao = 'texto', tipoOperacaoId = ''): CampoOperacao => ({
  id: crypto.randomUUID(),
  tipoOperacaoId,
  nome,
  chave: '',
  tipo,
  efeito: 'informativo',
  obrigatorio: false,
  largura: 1,
  opcoes: [],
  cadastro: tipo === 'cadastro' ? 'cliente' : '',
  ajuda: '',
  status: 'ativo',
})

/**
 * Campo de UF que filtra um campo de cidade: o de UF mais próximo ACIMA dele na ordem (pares
 * "UF de origem / Cidade de origem", "UF de destino / Cidade de destino"); sem nenhum acima, o
 * primeiro abaixo. Sem campo de UF, a cidade busca em todas as UFs.
 */
export function campoUfDaCidade(campos: CampoOperacao[], cidade: CampoOperacao): CampoOperacao | undefined {
  const i = campos.findIndex((c) => c.id === cidade.id)
  const ufs = campos.map((c, j) => ({ c, j })).filter((x) => x.c.tipo === 'uf')
  return [...ufs].reverse().find((x) => x.j < i)?.c ?? ufs.find((x) => x.j > i)?.c
}

/** "SP - São Paulo": formato do valor de um campo de cidade. */
export const textoCidade = (uf: string, nome: string) => `${uf} - ${nome}`

/** Valores preenchidos na Precificação, por chave do campo. */
export type ValoresOperacao = Record<string, string | number>

/** Converte o texto digitado num campo numérico (quantidade/número) em número. */
export const numeroDe = (v: string | number | undefined): number => {
  if (typeof v === 'number') return v
  if (!v) return 0
  const n = Number(String(v).replace(/\./g, '').replace(',', '.'))
  return Number.isFinite(n) ? n : 0
}

/** Efeito dos campos sobre o cálculo: multiplicador, custo extra em R$ e % sobre o custo. */
export function efeitosDosCampos(campos: CampoOperacao[], valores: ValoresOperacao) {
  let multiplicador = 1
  let custoExtra = 0
  let pctCusto = 0
  const linhas: { nome: string; efeito: EfeitoCampo; valor: number }[] = []
  for (const c of campos) {
    const ef = efeitoDe(c)
    if (ef === 'informativo') continue
    const n = numeroDe(valores[c.chave])
    if (ef === 'multiplica') {
      if (n > 0) multiplicador *= n
      linhas.push({ nome: c.nome, efeito: ef, valor: n > 0 ? n : 1 })
    } else if (ef === 'soma-custo') {
      custoExtra += n
      linhas.push({ nome: c.nome, efeito: ef, valor: n })
    } else if (ef === 'pct-custo') {
      pctCusto += n
      linhas.push({ nome: c.nome, efeito: ef, valor: n })
    }
  }
  return { multiplicador, custoExtra, pctCusto, linhas }
}

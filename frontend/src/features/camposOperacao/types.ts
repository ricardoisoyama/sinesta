/**
 * Dados da Operação parametrizáveis. Cada empresa define quais campos aparecem no bloco
 * "Dados da operação" da Precificação e o que cada um faz com o preço. Não existe campo
 * fixo: cliente, cidade, quantidade... tudo é configurado aqui.
 *
 * Na base: uma LINHA por campo em `campos_operacao` (criar campo nunca cria coluna).
 * Remover é inativar. A proposta guarda um retrato (nome, tipo, efeito e valor de cada
 * campo) no dia em que o item entrou, então mudar os campos depois não altera propostas feitas.
 */
export type TipoCampoOperacao = 'texto' | 'lista' | 'cadastro' | 'data' | 'numero' | 'valor' | 'percentual'

export type CadastroOrigem = 'cliente' | 'fornecedor' | 'vendedor' | 'servico'

/** O que o campo faz com o cálculo do preço (escolhido pelo usuário, dentro do que o tipo permite). */
export type EfeitoCampo = 'informativo' | 'multiplica' | 'soma-custo' | 'pct-custo'

export const TIPOS_CAMPO: { valor: TipoCampoOperacao; label: string; ajuda: string }[] = [
  { valor: 'texto', label: 'Texto', ajuda: 'Texto livre.' },
  { valor: 'lista', label: 'Lista de opções', ajuda: 'Escolha entre opções fixas (ex.: escala 12x36, 5x2).' },
  { valor: 'cadastro', label: 'Cadastro', ajuda: 'Escolhe um registro do sistema (cliente, fornecedor, vendedor, serviço).' },
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

/** Efeitos que cada tipo aceita. Texto, lista, cadastro e data só informam. */
export const EFEITOS_POR_TIPO: Record<TipoCampoOperacao, EfeitoCampo[]> = {
  texto: ['informativo'],
  lista: ['informativo'],
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
]

/** Largura no grid de 4 colunas da Precificação. */
export type LarguraCampo = 1 | 2 | 4
export const LARGURAS: { valor: LarguraCampo; label: string }[] = [
  { valor: 1, label: 'Curto' },
  { valor: 2, label: 'Médio' },
  { valor: 4, label: 'Linha inteira' },
]

export interface CampoOperacao {
  id: string
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

export const novoCampo = (nome = '', tipo: TipoCampoOperacao = 'texto'): CampoOperacao => ({
  id: crypto.randomUUID(),
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

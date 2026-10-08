/**
 * Avaliador de fórmulas simples, no espírito de uma célula de planilha:
 *   (salario_base + cargo_confianca) * 68%      distancia / consumo * diesel
 * Suporta + - * / parênteses, números com vírgula ou ponto, "20%" (= 0,2) e nomes
 * de outros campos (chaves). Sem eval: o texto é tokenizado e avaliado aqui.
 */

type Token =
  | { t: 'num'; v: number }
  | { t: 'id'; v: string }
  | { t: 'op'; v: '+' | '-' | '*' | '/' }
  | { t: '(' }
  | { t: ')' }

export interface ResultadoFormula {
  valor: number | null
  /** Motivo quando `valor` é null (fórmula inválida, campo desconhecido, divisão por zero). */
  erro?: string
}

/** Chave de campo a partir do nome: "Salário base" → "salario_base". */
export const chaveDe = (nome: string): string =>
  nome
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/^(\d)/, '_$1')

function tokenizar(expr: string): Token[] | string {
  const tokens: Token[] = []
  let i = 0
  while (i < expr.length) {
    const c = expr[i]
    if (c === ' ' || c === '\t') {
      i++
      continue
    }
    if (c === '(' || c === ')') {
      tokens.push({ t: c })
      i++
      continue
    }
    if ('+-*/'.includes(c)) {
      tokens.push({ t: 'op', v: c as '+' | '-' | '*' | '/' })
      i++
      continue
    }
    // Os botões da tela escrevem × e ÷ (mais fácil de ler); valem como * e /.
    if (c === '×' || c === '÷') {
      tokens.push({ t: 'op', v: c === '×' ? '*' : '/' })
      i++
      continue
    }
    if (/[0-9.,]/.test(c)) {
      let j = i
      while (j < expr.length && /[0-9.,]/.test(expr[j])) j++
      const bruto = expr.slice(i, j)
      // "1.500,50" e "1500.50" valem os dois; vírgula é o separador decimal quando existe.
      const norm = bruto.includes(',') ? bruto.replace(/\./g, '').replace(',', '.') : bruto
      const n = Number(norm)
      if (!Number.isFinite(n)) return `Número inválido: ${bruto}`
      if (expr[j] === '%') {
        tokens.push({ t: 'num', v: n / 100 })
        j++
      } else tokens.push({ t: 'num', v: n })
      i = j
      continue
    }
    if (/[a-zA-Z_À-ɏ]/.test(c)) {
      let j = i
      while (j < expr.length && /[a-zA-Z0-9_À-ɏ]/.test(expr[j])) j++
      tokens.push({ t: 'id', v: chaveDe(expr.slice(i, j)) })
      i = j
      continue
    }
    return `Caractere inválido: "${c}"`
  }
  return tokens
}

/**
 * Troca a referência `de` por `para` na fórmula (renomear uma coluna não quebra as contas).
 * Só mexe em nomes de campo inteiros; números e operadores ficam como estão.
 */
export const trocarReferencia = (expr: string, de: string, para: string): string =>
  !de || de === para ? expr : expr.replace(/[a-zA-Z_À-ɏ][a-zA-Z0-9_À-ɏ]*/g, (m) => (chaveDe(m) === de ? para : m))

/** Chaves de campo referenciadas na fórmula (para validar e ordenar o cálculo). */
export function referencias(expr: string): string[] {
  const t = tokenizar(expr)
  if (typeof t === 'string') return []
  return [...new Set(t.filter((x): x is { t: 'id'; v: string } => x.t === 'id').map((x) => x.v))]
}

/** Avalia a fórmula com os valores dos campos (por chave). */
export function avaliar(expr: string, vars: Record<string, number>): ResultadoFormula {
  const texto = expr.trim()
  if (!texto) return { valor: 0 }
  const tokens = tokenizar(texto)
  if (typeof tokens === 'string') return { valor: null, erro: tokens }

  let pos = 0
  const olhar = () => tokens[pos]
  const erro = (m: string): never => {
    throw new Error(m)
  }

  // Gramática: expr = termo (('+'|'-') termo)* ; termo = fator (('*'|'/') fator)* ; fator = num | id | '(' expr ')' | '-' fator
  const fator = (): number => {
    const tk = olhar()
    if (!tk) return erro('Fórmula incompleta')
    if (tk.t === 'num') {
      pos++
      return tk.v
    }
    if (tk.t === 'id') {
      pos++
      if (!(tk.v in vars)) return erro(`Campo desconhecido: ${tk.v}`)
      return vars[tk.v]
    }
    if (tk.t === '(') {
      pos++
      const v = expr_()
      if (olhar()?.t !== ')') return erro('Falta fechar parêntese')
      pos++
      return v
    }
    if (tk.t === 'op' && tk.v === '-') {
      pos++
      return -fator()
    }
    return erro('Fórmula inválida')
  }
  const termo = (): number => {
    let v = fator()
    for (;;) {
      const tk = olhar()
      if (tk?.t === 'op' && (tk.v === '*' || tk.v === '/')) {
        pos++
        const d = fator()
        if (tk.v === '/') {
          if (d === 0) return erro('Divisão por zero')
          v /= d
        } else v *= d
      } else return v
    }
  }
  const expr_ = (): number => {
    let v = termo()
    for (;;) {
      const tk = olhar()
      if (tk?.t === 'op' && (tk.v === '+' || tk.v === '-')) {
        pos++
        const d = termo()
        v = tk.v === '+' ? v + d : v - d
      } else return v
    }
  }

  try {
    const v = expr_()
    if (pos < tokens.length) return { valor: null, erro: 'Fórmula inválida' }
    return Number.isFinite(v) ? { valor: v } : { valor: null, erro: 'Resultado inválido' }
  } catch (e) {
    return { valor: null, erro: e instanceof Error ? e.message : 'Fórmula inválida' }
  }
}

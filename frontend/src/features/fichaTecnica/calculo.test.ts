import { describe, expect, it } from 'vitest'
import { calcularFicha, comChaves } from './calculo'
import { novaColuna, type ColunaFicha } from './types'

const col = (id: string, nome: string, tipo: ColunaFicha['tipo'], extra: Partial<ColunaFicha> = {}): ColunaFicha => ({
  ...novaColuna('g', nome, tipo),
  id,
  ...extra,
})

describe('calcularFicha', () => {
  const colunas = [
    col('per', 'Período', 'lista', { opcoes: ['Diurno', 'Noturno'] }),
    col('sal', 'Salário base', 'valor'),
    col('cc', 'Cargo de confiança', 'valor'),
    col('adn', 'Adicional noturno', 'percentual', { base: 'salario_base' }),
    col('enc', 'Encargos', 'calculo', { formula: '(salario_base + cargo_de_confianca + adicional_noturno) * 50%' }),
    col('hrs', 'Horas', 'numero', { compoeTotal: false }),
    col('epi', 'EPI', 'valor'),
  ]

  it('soma valores, percentual sobre base e fórmula (valores por id da coluna)', () => {
    const r = calcularFicha(colunas, { per: 'Noturno', sal: 2000, cc: 500, adn: 0.2, hrs: 220, epi: 25 })
    const por = Object.fromEntries(r.colunas.map((c) => [c.chave, c.valor]))
    expect(por.adicional_noturno).toBeCloseTo(400)
    expect(por.encargos).toBeCloseTo(1450)
    // 2000 + 500 + 400 + 1450 + 25 (horas não compõe; período é texto)
    expect(r.total).toBeCloseTo(4375)
    expect(r.erro).toBeUndefined()
  })

  it('aceita número digitado com vírgula', () => {
    const r = calcularFicha([col('sal', 'Salário', 'valor'), col('q', 'Qtd', 'numero'), col('t', 'Total', 'calculo', { formula: 'salario * qtd' })], { sal: 100, q: '2,5' })
    // Número não entra no total por padrão; só alimenta a fórmula.
    expect(r.total).toBeCloseTo(100 + 250)
  })

  it('resolve fórmula que depende de outra fórmula, em qualquer ordem', () => {
    const cs = [
      col('tb', 'Total bruto', 'calculo', { formula: 'liquido * 1,1' }),
      col('li', 'Líquido', 'calculo', { formula: 'base * 2' }),
      col('ba', 'Base', 'valor'),
    ]
    const r = calcularFicha(cs, { ba: 100 })
    expect(r.total).toBeCloseTo(100 + 200 + 220)
  })

  it('aponta referência circular e coluna desconhecida sem quebrar', () => {
    const r = calcularFicha([col('a', 'A', 'calculo', { formula: 'b + 1' }), col('b', 'B', 'calculo', { formula: 'a + 1' })], {})
    expect(r.erro).toMatch(/circular/)
    const r2 = calcularFicha([col('a', 'A', 'calculo', { formula: 'x * 2' })], {})
    expect(r2.erro).toMatch(/desconhecida/i)
  })

  it('total por fórmula da ficha (valor hora × horas), igual ao servidor', () => {
    const cs = [col('vh', 'Valor hora', 'valor'), col('h', 'Horas', 'numero', { compoeTotal: false })]
    expect(calcularFicha(cs, { vh: 85.5, h: 160 }).total).toBeCloseTo(85.5) // soma das marcadas
    const r = calcularFicha(cs, { vh: 85.5, h: 160 }, 'valor_hora × horas')
    expect(r.total).toBeCloseTo(13680)
    expect(r.porFormula).toBe(true)
    expect(calcularFicha(cs, { vh: 85.5, h: 160 }, 'valor_hora ÷ 2').total).toBeCloseTo(42.75)
    expect(calcularFicha(cs, { vh: 1, h: 1 }, 'valor_hora × nada').erro).toMatch(/^Total:/)
  })

  it('gera chaves únicas para nomes repetidos', () => {
    const cs = comChaves([col('1', 'EPI', 'valor'), col('2', 'EPI', 'valor'), col('3', 'epi', 'valor')])
    expect(cs.map((c) => c.chave)).toEqual(['epi', 'epi_2', 'epi_3'])
  })
})

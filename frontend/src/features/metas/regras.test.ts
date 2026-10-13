import { describe, expect, it } from 'vitest'
import { distribuirIgual } from './mock'
import { anualSobreAnterior, conferirValores, diferencaMeses, mesesPorPercentual, participacoes, somaMeses } from './regras'
import { metaSchema } from './meta-schema'

describe('valor anual manda nos meses', () => {
  it('só fecha quando os meses somam exatamente o anual', () => {
    expect(conferirValores(120000, Array(12).fill(10000))).toBeNull()
    expect(conferirValores(120000.01, Array(12).fill(10000))).toContain('faltam')
    expect(conferirValores(100000, Array(12).fill(10000))).toContain('passaram')
    expect(conferirValores(0, Array(12).fill(0))).toContain('valor anual')
  })

  it('conta em centavos, sem erro de ponto flutuante', () => {
    const meses = distribuirIgual(100000)
    expect(diferencaMeses(100000, meses)).toBe(0)
    expect(somaMeses([0.1, 0.2])).toBe(0.3)
  })

  it('o schema bloqueia o salvar com o motivo', () => {
    const base = { nome: 'Meta', empresaId: 'e', ano: 2027, principal: false, basePreco: 'media' as const, entradaMeses: 'valor' as const, origemAnual: 'valor' as const, crescimentoAnoAnterior: 0 }
    expect(metaSchema.safeParse({ ...base, metaAnual: 120000, valoresMensais: Array(12).fill(10000) }).success).toBe(true)
    const r = metaSchema.safeParse({ ...base, metaAnual: 130000, valoresMensais: Array(12).fill(10000) })
    expect(r.success).toBe(false)
    expect(r.error?.issues[0].message).toContain('faltam')
  })
})

describe('meses em % do ano', () => {
  it('percentuais que fecham 100% fecham o anual em centavos', () => {
    const pcts = [0.3333, 0.3333, 0.3334, ...Array(9).fill(0)]
    const meses = mesesPorPercentual(1000.01, pcts)
    expect(somaMeses(meses)).toBe(1000.01)
    expect(conferirValores(1000.01, meses)).toBeNull()
  })

  it('percentuais que não fecham 100% deixam a diferença aparecer', () => {
    const meses = mesesPorPercentual(120000, Array(12).fill(0.08))
    expect(diferencaMeses(120000, meses)).toBe(4800)
  })

  it('participação de cada mês no anual', () => {
    expect(participacoes(200, [50, 150, ...Array(10).fill(0)]).slice(0, 2)).toEqual([0.25, 0.75])
    expect(participacoes(0, Array(12).fill(10))).toEqual(Array(12).fill(0))
  })
})

describe('% sobre o ano anterior', () => {
  it('arredonda em centavos como o servidor', () => {
    expect(anualSobreAnterior(600000, 0.1)).toBe(660000)
    expect(anualSobreAnterior(1000, 0.003333)).toBe(1003.33)
  })
})

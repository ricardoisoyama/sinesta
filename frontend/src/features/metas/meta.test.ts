import { describe, expect, it } from 'vitest'
import { distribuirIgual, mesesDaMeta } from './mock'
import { realizadoPorMes } from './realizado'
import type { Proposta } from '@/features/propostas/types'

describe('meta mensal', () => {
  it('divide o anual pelos 12 meses sem perder centavos', () => {
    const meses = distribuirIgual(100000)
    expect(meses).toHaveLength(12)
    expect(meses[0]).toBe(8333.33)
    expect(meses.reduce((a, v) => a + v, 0)).toBeCloseTo(100000, 2)
  })

  it('usa os meses lançados; meta antiga cai na proporção da planilha', () => {
    const lancada = Array.from({ length: 12 }, (_, i) => (i + 1) * 10)
    expect(mesesDaMeta({ metaAnual: 0, valoresMensais: lancada })).toEqual(lancada)
    // Meta antiga só com o total: dividida igual, como no motor do fator (360 mil = 30 mil por mês).
    expect(mesesDaMeta({ metaAnual: 360000 })).toEqual(Array(12).fill(30000))
  })

  it('o realizado da meta da empresa soma só os itens dela', () => {
    const p = {
      status: 'aprovada',
      data: '10/03/2026',
      total: 300,
      itens: [
        { empresaId: 'a', precoFinal: 100 },
        { empresaId: 'b', precoFinal: 200 },
      ],
    } as unknown as Proposta
    expect(realizadoPorMes([p], 2026, 'a')[2]).toBe(100)
    expect(realizadoPorMes([p], 2026)[2]).toBe(300)
  })
})

import { describe, expect, it } from 'vitest'
import { cargaDoServico, efetivaImposto, impostosDoModelo } from './impostos'

// Planilha ALIQUOTAS, quadros "com reforma tributária", faturamento de R$ 300 mil/mês.
describe('impostos do serviço', () => {
  it('armazenagem do modelo dá o total da planilha (D42)', () => {
    const c = cargaDoServico(impostosDoModelo('armazenagem'), 300000)
    expect(c.noPreco).toBeCloseTo(0.240133, 6)
    expect(c.destacados).toBe(0)
    expect(c.icms).toBeUndefined()
  })

  it('transporte deixa o ICMS fora do markup (entra pela rota)', () => {
    const c = cargaDoServico(impostosDoModelo('transporte'), 300000)
    expect(c.noPreco).toBeCloseTo(0.162133, 6)
    expect(c.icms?.aliquota).toBe(0.18)
  })

  it('o que não afeta o preço vai para os destacados', () => {
    const l = impostosDoModelo('armazenagem').map((i) => (i.imposto === 'cbs' ? { ...i, afetaPreco: false } : i))
    const c = cargaDoServico(l, 300000)
    expect(c.noPreco).toBeCloseTo(0.152133, 6)
    expect(c.destacados).toBeCloseTo(0.088, 6)
  })

  it('adicional do IRPJ só acima do limite e zero sem meta', () => {
    const adicional = impostosDoModelo('transporte').find((i) => i.imposto === 'irpj-adicional')!
    expect(efetivaImposto(adicional, 300000)).toBeCloseTo(0.001333, 6)
    expect(efetivaImposto(adicional, 200000)).toBe(0)
    expect(efetivaImposto(adicional, 0)).toBe(0)
  })
})

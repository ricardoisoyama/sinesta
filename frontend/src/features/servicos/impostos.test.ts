import { describe, expect, it } from 'vitest'
import { cargaDoServico, efetivaImposto, impostosDoModelo, impostosVigentes } from './impostos'

// Planilha ALIQUOTAS, quadros "com reforma tributária", faturamento de R$ 300 mil/mês.
describe('impostos do serviço', () => {
  it('armazenagem do modelo dá o total da planilha (D42)', () => {
    const c = cargaDoServico(impostosDoModelo('armazenagem'))
    expect(c.noPreco).toBeCloseTo(0.240133, 6)
    expect(c.destacados).toBe(0)
    expect(c.icms).toBeUndefined()
  })

  it('transporte deixa o ICMS fora do markup (entra pela rota)', () => {
    const c = cargaDoServico(impostosDoModelo('transporte'))
    expect(c.noPreco).toBeCloseTo(0.162133, 6)
    expect(c.icms?.imposto).toBe('icms')
  })

  it('o que não afeta o preço vai para os destacados', () => {
    const l = impostosDoModelo('armazenagem').map((i) => (i.imposto === 'cbs' ? { ...i, afetaPreco: false } : i))
    const c = cargaDoServico(l)
    expect(c.noPreco).toBeCloseTo(0.152133, 6)
    expect(c.destacados).toBeCloseTo(0.088, 6)
  })

  it('vale a tabela do regime da empresa com a vigência que já começou (igual ao servidor)', () => {
    const l = [
      ...impostosDoModelo('simples', 'Simples Nacional'),
      ...impostosDoModelo('armazenagem', 'Lucro Presumido'),
      ...impostosDoModelo('armazenagem', 'Lucro Presumido', '2027-01-01').filter((i) => i.imposto !== 'iss'),
    ]
    expect(impostosVigentes(l, 'MEI', '2026-11-02').map((i) => i.imposto)).toEqual(['das'])
    expect(impostosVigentes(l, 'Lucro Presumido', '2026-12-31')).toHaveLength(5)
    expect(impostosVigentes(l, 'Lucro Presumido', '2027-01-01')).toHaveLength(4)
    expect(impostosVigentes(l, 'Lucro Real', '2026-11-02')).toEqual([])
  })

  it('adicional do IRPJ é a alíquota informada e o ICMS não tem alíquota aqui', () => {
    const adicional = impostosDoModelo('transporte').find((i) => i.imposto === 'irpj-adicional')!
    expect(efetivaImposto(adicional)).toBeCloseTo(0.001333, 6)
    expect(efetivaImposto(impostosDoModelo('transporte').find((i) => i.imposto === 'icms')!)).toBe(0)
  })
})

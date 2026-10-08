import { describe, it, expect } from 'vitest'
import {
  dvComML,
  dvSemML,
  dfPercent,
  markup,
  fator,
  precoVenda,
  precoVendaComCustoPercentual,
  margem,
  seguroAdValorem,
  grossUp,
  cotacaoFiscal,
  precoParaMargem,
  receitaEquilibrio,
  receitaAlvo,
  type DvParams,
} from './engine'

const matriz: DvParams = { impostos: 0.11, custos: 0, comissoes: 0, lucro: 0.07, despFinanceira: 0.023 }
const filial: DvParams = { impostos: 0.11, custos: 0, comissoes: 0.015, lucro: 0.1, despFinanceira: 0.023 }

describe('motor de precificação (números reais da planilha)', () => {
  it('DV da Matriz = 20,3% (com ML) e 13,3% (sem ML)', () => {
    expect(dvComML(matriz)).toBeCloseTo(0.203, 6)
    expect(dvSemML(matriz)).toBeCloseTo(0.133, 6)
  })

  it('Fator da Matriz ≈ 1,3848', () => {
    const dfPct = dfPercent(16845.795, 225000)
    expect(dfPct).toBeCloseTo(0.0748702, 6)
    const m = markup(dfPct, dvComML(matriz))
    expect(m).toBeCloseTo(0.2778702, 6)
    expect(fator(m)).toBeCloseTo(1.3847926, 5)
  })

  it('Fator da Filial 02 ≈ 1,4831', () => {
    const dfPct = dfPercent(17493.29, 225000)
    const m = markup(dfPct, dvComML(filial))
    expect(fator(m)).toBeCloseTo(1.4831249, 5)
  })

  it('PV do exemplo da planilha: (120 + 93,07) × 1,3848 ≈ 295,06', () => {
    expect(precoVenda(120, 93.07, 1.3847925954586005)).toBeCloseTo(295.0578, 3)
  })

  it('Margem do exemplo: MCU ≈ 20,65 e ML ≈ 7% (= lucro alvo da Matriz)', () => {
    const pv = precoVenda(120, 93.07, 1.3847925954586005)
    const m = margem(pv, 120 + 93.07, dfPercent(16845.795, 225000), dvSemML(matriz))
    expect(m.mcu).toBeCloseTo(20.65, 1)
    expect(m.ml).toBeCloseTo(0.07, 3)
  })

  it('Seguro ad valorem: 300.000 × 0,3% = 900', () => {
    expect(seguroAdValorem(300000, 0.003)).toBeCloseTo(900, 6)
  })

  it('Gross-up ICMS bate com a planilha (frete 1.619,12 + seguro 900)', () => {
    expect(grossUp(2519.12, 0.12)).toBeCloseTo(2862.6364, 3) // ÷0,88
    expect(grossUp(2519.12, 0.07)).toBeCloseTo(2708.7312, 3) // ÷0,93
  })

  it('Cotação fiscal CT-e: preço final = (frete+seguro) grossed up', () => {
    const cte12 = cotacaoFiscal(1619.12, 900, 0.12, true)
    expect(cte12.precoFinal).toBeCloseTo(2862.6364, 3)
    const cte07 = cotacaoFiscal(1619.12, 900, 0.07, true)
    expect(cte07.precoFinal).toBeCloseTo(2708.7312, 3)
  })

  it('Break-even Matriz: equilíbrio ≈ 19.430 e receita-alvo ≈ 21.136 (planilha)', () => {
    expect(receitaEquilibrio(16845.795, 0.133)).toBeCloseTo(19430, 0)
    expect(receitaAlvo(16845.795, 0.203)).toBeCloseTo(21136.5, 0)
  })
})

describe('preço negociado (cálculo reverso)', () => {
  it('desfaz a camada fiscal: volta ao mesmo PV que gerou o preço final', () => {
    const ida = cotacaoFiscal(1000, 50, 0.12, true)
    const volta = precoParaMargem(ida.precoFinal, 50, 0.12, true, 1000, 600, 0.0748702, 0.133)
    expect(volta.pvPraticado).toBeCloseTo(1000, 6)
    expect(volta.descontoEfetivo).toBeCloseTo(0, 6)
  })

  it('sem ICMS: tira só o seguro do preço final', () => {
    const r = precoParaMargem(1000, 100, 0, false, 1200, 600, 0.0748702, 0.133)
    expect(r.pvPraticado).toBeCloseTo(900, 6)
    // 900 sobre um PV calculado de 1.200 = 25% de abatimento
    expect(r.descontoEfetivo).toBeCloseTo(0.25, 6)
  })

  it('recalcula a margem com o preço negociado, sem mexer no custo', () => {
    const r = precoParaMargem(1000, 0, 0, false, 1200, 600, 0.0748702, 0.133)
    // MCU = 1000 − 600 − (1000 × 7,487%) − (1000 × 13,3%)
    expect(r.margem.mcu).toBeCloseTo(192.13, 2)
    expect(r.margem.ml).toBeCloseTo(0.19213, 4)
  })

  it('preço abaixo do custo derruba a margem para negativo', () => {
    const r = precoParaMargem(500, 0, 0, false, 1200, 600, 0.0748702, 0.133)
    expect(r.margem.ml).toBeLessThan(0)
  })
})

describe('custo em percentual do preço do serviço (conta algébrica)', () => {
  it('PV = C·F ÷ (1 − p·F): o percentual aplicado no PV fecha com o custo que gerou', () => {
    const custo = 1000
    const fatorVal = 1.25
    const p = 0.02 // 2% do preço do serviço (ex.: seguro sobre a NF do serviço)
    const pv = precoVendaComCustoPercentual(custo, p, fatorVal)
    // O PV tem que ser igual a (custo em reais + p·PV) × fator.
    expect(pv).toBeCloseTo((custo + p * pv) * fatorVal, 6)
    expect(pv).toBeGreaterThan(custo * fatorVal)
  })

  it('sem percentual é o PV normal; percentual inviável devolve 0', () => {
    expect(precoVendaComCustoPercentual(1000, 0, 1.25)).toBeCloseTo(1250, 6)
    expect(precoVendaComCustoPercentual(1000, 0.9, 1.25)).toBe(0)
  })
})

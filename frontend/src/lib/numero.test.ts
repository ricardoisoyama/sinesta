import { describe, expect, it } from 'vitest'
import { parseDigitado } from './numero'

describe('parseDigitado (campo de valor com digitação natural)', () => {
  it('inteiro vira o próprio valor, sem deslocar casas', () => {
    expect(parseDigitado('1000')).toBe(1000)
    expect(parseDigitado('7')).toBe(7)
  })

  it('vírgula é o separador decimal', () => {
    expect(parseDigitado('1000,50')).toBe(1000.5)
    expect(parseDigitado('0,5')).toBe(0.5)
  })

  it('ponto de milhar é ignorado', () => {
    expect(parseDigitado('1.000')).toBe(1000)
    expect(parseDigitado('1.234.567,89')).toBe(1234567.89)
  })

  it('ponto único com até duas casas conta como decimal', () => {
    expect(parseDigitado('1000.50')).toBe(1000.5)
    expect(parseDigitado('12.5')).toBe(12.5)
  })

  it('vazio ou lixo vira zero', () => {
    expect(parseDigitado('')).toBe(0)
    expect(parseDigitado(',')).toBe(0)
  })
})

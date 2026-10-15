import { describe, expect, it } from 'vitest'
import { buscaPeloNumero } from './texto'

describe('buscaPeloNumero', () => {
  it('acha pelo número inteiro, com ou sem # e nº', () => {
    expect(buscaPeloNumero('1532', 1532)).toBe(true)
    expect(buscaPeloNumero(' #1532 ', 1532)).toBe(true)
    expect(buscaPeloNumero('nº 1532', 1532)).toBe(true)
    expect(buscaPeloNumero('No. 1532', 1532)).toBe(true)
  })

  it('pedaço do número, texto ou registro sem número não casam', () => {
    expect(buscaPeloNumero('15', 1532)).toBe(false)
    expect(buscaPeloNumero('aluguel', 1532)).toBe(false)
    expect(buscaPeloNumero('1532', undefined)).toBe(false)
    expect(buscaPeloNumero('0', 0)).toBe(false)
  })
})

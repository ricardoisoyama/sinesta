import { describe, expect, it } from 'vitest'
import { buscarBancos, rotuloBanco } from './bancos'

describe('autocomplete de bancos', () => {
  it('acha pelo código COMPE', () => {
    const r = buscarBancos('341')
    expect(r[0].codigo).toBe('341')
    expect(rotuloBanco(r[0])).toMatch(/^341 - ITA/)
  })

  it('acha pelo nome sem acento e sem maiúsculas', () => {
    expect(buscarBancos('itau').some((b) => b.codigo === '341')).toBe(true)
    expect(buscarBancos('bradesco').some((b) => b.codigo === '237')).toBe(true)
  })

  it('acha pelo ISPB', () => {
    expect(buscarBancos('60701190')[0].codigo).toBe('341')
  })

  it('vazio não sugere nada', () => {
    expect(buscarBancos('  ')).toEqual([])
  })
})

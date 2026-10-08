import { describe, expect, it } from 'vitest'
import { mesclar } from './mesclar'

describe('mesclar', () => {
  const padrao = { banco: '', iban: '', swift: '' }

  it('null e ausente ficam com o padrão; o resto vem do gravado', () => {
    expect(mesclar(padrao, { banco: 'Itaú', iban: null as unknown as string })).toEqual({ banco: 'Itaú', iban: '', swift: '' })
  })

  it('sem gravado devolve uma cópia do padrão', () => {
    const r = mesclar(padrao, null)
    expect(r).toEqual(padrao)
    expect(r).not.toBe(padrao)
  })

  it('texto vazio gravado é mantido (é um valor, não um campo faltando)', () => {
    expect(mesclar({ a: 'x' }, { a: '' })).toEqual({ a: '' })
  })
})

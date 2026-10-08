import { describe, expect, it } from 'vitest'
import { buscarPaises, formatTelefoneInternacional, paisPorNome, PAISES_EXTERIOR } from './paises'

describe('países do exterior', () => {
  it('lista em português, sem o Brasil, com DDI e moeda', () => {
    expect(PAISES_EXTERIOR.length).toBeGreaterThan(180)
    expect(PAISES_EXTERIOR.some((p) => p.iso === 'BR')).toBe(false)
    const eua = paisPorNome('Estados Unidos')
    expect(eua).toMatchObject({ iso: 'US', ddi: '1', moeda: 'USD' })
    // O cadastro antigo da Anthropic gravou "Estados Unidos": continua reconhecido, até sem acento.
    expect(paisPorNome('alemanha')?.moeda).toBe('EUR')
  })

  it('busca por nome, código ISO ou DDI', () => {
    expect(buscarPaises('reino').map((p) => p.iso)).toContain('GB')
    expect(buscarPaises('US').map((p) => p.iso)).toContain('US')
    expect(buscarPaises('+44').map((p) => p.iso)).toContain('GB')
  })

  it('telefone internacional aceita o formato de cada país', () => {
    expect(formatTelefoneInternacional('+1 (415) 555-0100')).toBe('+1 (415) 555-0100')
    expect(formatTelefoneInternacional('+44 20 7946 0958abc')).toBe('+44 20 7946 0958')
    expect(formatTelefoneInternacional('+1+2')).toBe('+12')
  })
})

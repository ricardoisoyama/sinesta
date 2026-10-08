import { describe, expect, it } from 'vitest'
import { bloqueioDeRegiao, ufDaCidade, type RegiaoBloqueada } from './regiao'

const r = (tipo: RegiaoBloqueada['tipo'], valor: string): RegiaoBloqueada => ({ tipo, valor })

describe('região bloqueada do vendedor (lista de exclusão)', () => {
  it('extrai a UF da cidade', () => {
    expect(ufDaCidade('Campinas - SP')).toBe('SP')
    expect(ufDaCidade('Campinas')).toBe('')
  })

  it('estado bloqueia qualquer cidade do estado', () => {
    expect(bloqueioDeRegiao([r('estado', 'SP')], 'Campinas - SP')?.valor).toBe('SP')
    expect(bloqueioDeRegiao([r('estado', 'SP')], 'Curitiba - PR')).toBeNull()
  })

  it('cidade bloqueia só aquela cidade, sem acento e sem maiúscula', () => {
    expect(bloqueioDeRegiao([r('cidade', 'Sao Paulo - SP')], 'São Paulo - SP')).not.toBeNull()
    expect(bloqueioDeRegiao([r('cidade', 'São Paulo - SP')], 'Campinas - SP')).toBeNull()
  })

  it('país Brasil bloqueia qualquer cidade com UF; sem cidade não bloqueia', () => {
    expect(bloqueioDeRegiao([r('pais', 'Brasil')], 'Manaus - AM')).not.toBeNull()
    expect(bloqueioDeRegiao([r('pais', 'Brasil')], '')).toBeNull()
  })
})

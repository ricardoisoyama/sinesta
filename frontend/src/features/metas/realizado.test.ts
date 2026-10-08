import { describe, expect, it } from 'vitest'
import type { Proposta } from '@/features/propostas/types'
import { anoDaMeta, faixaDaMeta, mesAno, metaDoAno, realizadoPorMes } from './realizado'
import type { CenarioMeta } from './mock'

const prop = (data: string, total: number, status: Proposta['status'] = 'aprovada'): Proposta => ({
  id: crypto.randomUUID(),
  numero: 'PROP-0001',
  cliente: 'X',
  status,
  data,
  itens: [],
  total,
})

describe('realizado das metas a partir das propostas aprovadas', () => {
  it('lê a data no formato do backend (dd/MM/yyyy) e em ISO', () => {
    expect(mesAno('05/03/2026')).toEqual({ mes: 2, ano: 2026 })
    expect(mesAno('2026-11-20')).toEqual({ mes: 10, ano: 2026 })
    expect(mesAno('lixo')).toBeNull()
  })

  it('soma só as aprovadas do ano, por mês', () => {
    const lista = [
      prop('10/01/2026', 1000),
      prop('20/01/2026', 500),
      prop('03/02/2026', 700, 'rascunho'),
      prop('15/02/2025', 900),
      prop('15/02/2026', 300),
    ]
    const meses = realizadoPorMes(lista, 2026)
    expect(meses[0]).toBe(1500)
    expect(meses[1]).toBe(300)
    expect(meses.reduce((a, b) => a + b, 0)).toBe(1800)
  })

  it('meta sem ano usa o ano corrente', () => {
    expect(anoDaMeta(0, new Date('2026-09-15'))).toBe(2026)
    expect(anoDaMeta(2027, new Date('2026-09-15'))).toBe(2027)
  })

  it('cores por percentual atingido', () => {
    expect(faixaDaMeta(1)).toBe('ok')
    expect(faixaDaMeta(0.7)).toBe('atencao')
    expect(faixaDaMeta(0.2)).toBe('ruim')
  })
})

describe('meta do ano da empresa (mesma regra do fator)', () => {
  const m = (id: string, p: Partial<CenarioMeta>): CenarioMeta => ({ id, nome: id, metaAnual: 1000, empresaId: 'sin', ano: 2026, ...p })
  it('única ativa do ano vale; de outra empresa, ano ou inativa não', () => {
    expect(metaDoAno([m('a', {}), m('b', { empresaId: 'outra' }), m('c', { ano: 2025 }), m('d', { status: 'inativo' })], 'sin', 2026)?.id).toBe('a')
  })
  it('com várias, vale a principal; sem principal definida, nenhuma', () => {
    expect(metaDoAno([m('a', {}), m('b', { principal: true })], 'sin', 2026)?.id).toBe('b')
    expect(metaDoAno([m('a', {}), m('b', {})], 'sin', 2026)).toBeUndefined()
  })
})

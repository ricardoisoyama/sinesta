import { describe, expect, it } from 'vitest'
import { entraNaDf } from './regras'
import type { CustoFixo } from './types'

const base: CustoFixo = {
  id: 'cf-1',
  unidadeId: 'matriz',
  descricao: 'Sistema',
  categoriaId: 'cat-ti',
  valorMensal: 100,
  tipo: 'recorrente',
  dataInicio: '',
  dataFim: '',
  fornecedorId: '',
  status: 'ativo',
}

const hoje = '2026-09-04'

describe('entraNaDf', () => {
  it('recorrente ativo sem datas entra', () => {
    expect(entraNaDf(base, hoje)).toBe(true)
  })

  it('spot fica de fora (despesa única, não projeta)', () => {
    expect(entraNaDf({ ...base, tipo: 'spot' }, hoje)).toBe(false)
  })

  it('inativo fica de fora', () => {
    expect(entraNaDf({ ...base, status: 'inativo' }, hoje)).toBe(false)
  })

  it('respeita a vigência', () => {
    expect(entraNaDf({ ...base, dataInicio: '2026-10-01' }, hoje)).toBe(true)
    expect(entraNaDf({ ...base, dataFim: '2026-08-31' }, hoje)).toBe(false)
    expect(entraNaDf({ ...base, dataInicio: '2026-01-01', dataFim: '2026-12-31' }, hoje)).toBe(true)
  })
})

import { describe, expect, it } from 'vitest'
import { conferirRateio, dividirIgual, entraNaDf, percentualDaEmpresa, somaRateio, valorDaEmpresa } from './regras'
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

describe('rateio de despesa fixa', () => {
  const salario = (rateio: CustoFixo['rateio'] = []): CustoFixo => ({ ...base, descricao: 'Salário', valorMensal: 5000, rateio })

  it('sem rateio, a despesa é toda de quem paga', () => {
    expect(valorDaEmpresa(salario(), 'matriz')).toBe(5000)
    expect(valorDaEmpresa(salario(), 'filial')).toBe(0)
  })

  it('com rateio, cada empresa leva a sua parte', () => {
    const d = salario([{ empresaId: 'matriz', percentual: 0.6 }, { empresaId: 'filial', percentual: 0.4 }])
    expect(valorDaEmpresa(d, 'matriz')).toBeCloseTo(3000)
    expect(valorDaEmpresa(d, 'filial')).toBeCloseTo(2000)
    expect(percentualDaEmpresa(d, 'outra')).toBe(0)
  })

  it('confere soma, zero e a presença de quem paga', () => {
    expect(conferirRateio([], 'matriz')).toBeNull()
    expect(conferirRateio([{ empresaId: 'matriz', percentual: 0.5 }, { empresaId: 'filial', percentual: 0.5 }], 'matriz')).toBeNull()
    expect(conferirRateio([{ empresaId: 'matriz', percentual: 0.5 }, { empresaId: 'filial', percentual: 0.4 }], 'matriz')).toContain('Faltam 10,00%')
    expect(conferirRateio([{ empresaId: 'matriz', percentual: 0.7 }, { empresaId: 'filial', percentual: 0.4 }], 'matriz')).toContain('Passou 10,00%')
    expect(conferirRateio([{ empresaId: 'matriz', percentual: 1 }, { empresaId: 'filial', percentual: 0 }], 'matriz')).toContain('maior que zero')
    expect(conferirRateio([{ empresaId: 'filial', percentual: 1 }], 'matriz')).toContain('empresa que paga')
    expect(conferirRateio([{ empresaId: 'matriz', percentual: 1 }], 'matriz')).toContain('mais uma empresa')
  })

  it('dividir igual fecha 100% (o resto fica com a primeira)', () => {
    const tres = dividirIgual([{ empresaId: 'a', percentual: 0 }, { empresaId: 'b', percentual: 0 }, { empresaId: 'c', percentual: 0 }])
    expect(somaRateio(tres)).toBeCloseTo(1, 6)
    expect(tres[0].percentual).toBeCloseTo(0.3334, 4)
    expect(tres[1].percentual).toBeCloseTo(0.3333, 4)
  })
})

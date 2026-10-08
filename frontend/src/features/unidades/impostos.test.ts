import { describe, expect, it } from 'vitest'
import { impostosDaDv, impostosSobreReceita } from './impostos'
import type { ImpostoConfig, RegimeTributario, Unidade } from './types'

const semImposto: ImpostoConfig = { aliquota: 0, retido: false, reducaoBase: 0 }

const empresa = (regime: RegimeTributario, patch: Partial<Unidade> = {}): Unidade =>
  ({
    id: 'e1',
    nome: 'Teste',
    razaoSocial: '',
    nomeFantasia: '',
    cnpj: '',
    tipo: 'Matriz',
    endereco: '',
    logo: '',
    status: 'ativo',
    dv: { impostos: 0, custos: 0, comissoes: 0, lucro: 0.07, despFinanceira: 0, receitaEstimadaMensal: 100000 },
    regime,
    das: 0,
    ir: { ...semImposto },
    csll: { ...semImposto },
    inss: { ...semImposto },
    pis: { ...semImposto },
    cofins: { ...semImposto },
    iss: { ...semImposto },
    ibsMunicipal: 0,
    ibsEstadual: 0,
    cbs: 0,
    icmsAtivo: false,
    icms: [],
    ...patch,
  }) as Unidade

describe('impostosSobreReceita', () => {
  it('Simples usa a alíquota do DAS', () => {
    const e = empresa('Simples Nacional', { das: 0.06, pis: { aliquota: 0.0065, retido: false, reducaoBase: 0 } })
    expect(impostosSobreReceita(e)).toBe(0.06)
  })

  it('Lucro Presumido soma federais, ISS e reforma', () => {
    const e = empresa('Lucro Presumido', {
      pis: { aliquota: 0.0065, retido: false, reducaoBase: 0 },
      cofins: { aliquota: 0.03, retido: false, reducaoBase: 0 },
      iss: { aliquota: 0.05, retido: false, reducaoBase: 0 },
    })
    expect(impostosSobreReceita(e)).toBeCloseTo(0.0865, 6)
  })

  it('redução de base diminui a alíquota efetiva', () => {
    const e = empresa('Lucro Presumido', { inss: { aliquota: 0.11, retido: true, reducaoBase: 0.5 } })
    expect(impostosSobreReceita(e)).toBeCloseTo(0.055, 6)
  })
})

describe('impostosDaDv', () => {
  it('sem cadastro tributário, vale o percentual manual da DV', () => {
    const e = empresa('Lucro Presumido')
    e.dv.impostos = 0.11
    expect(impostosDaDv(e)).toBe(0.11)
  })

  it('com cadastro tributário, o cadastro manda', () => {
    const e = empresa('Lucro Presumido', { iss: { aliquota: 0.05, retido: false, reducaoBase: 0 } })
    e.dv.impostos = 0.11
    expect(impostosDaDv(e)).toBe(0.05)
  })
})

import { describe, expect, it } from 'vitest'
import {
  formatCnpj,
  formatCpf,
  formatCpfCnpj,
  formatRg,
  formatTelefone,
  parseNumeroPlanilha,
} from './format'

describe('formatCnpj', () => {
  it('formata um CNPJ completo', () => {
    expect(formatCnpj('13445356000180')).toBe('13.445.356/0001-80')
  })

  it('formata progressivamente enquanto digita', () => {
    expect(formatCnpj('13')).toBe('13')
    expect(formatCnpj('134')).toBe('13.4')
    expect(formatCnpj('13445')).toBe('13.445')
    expect(formatCnpj('134453')).toBe('13.445.3')
    expect(formatCnpj('13445356')).toBe('13.445.356')
    expect(formatCnpj('134453560')).toBe('13.445.356/0')
    expect(formatCnpj('1344535600018')).toBe('13.445.356/0001-8')
  })

  it('ignora o que não é dígito e corta o excedente', () => {
    expect(formatCnpj('13.445.356/0001-80')).toBe('13.445.356/0001-80')
    expect(formatCnpj('13445356000180999')).toBe('13.445.356/0001-80')
    expect(formatCnpj('abc')).toBe('')
    expect(formatCnpj('')).toBe('')
  })
})

describe('formatCpf', () => {
  it('formata um CPF completo', () => {
    expect(formatCpf('12345678909')).toBe('123.456.789-09')
  })

  it('formata progressivamente', () => {
    expect(formatCpf('123')).toBe('123')
    expect(formatCpf('1234')).toBe('123.4')
    expect(formatCpf('1234567')).toBe('123.456.7')
    expect(formatCpf('123456789')).toBe('123.456.789')
    expect(formatCpf('1234567890')).toBe('123.456.789-0')
    expect(formatCpf('123.456.789-09')).toBe('123.456.789-09')
  })
})

describe('formatCpfCnpj', () => {
  it('decide pelo tamanho', () => {
    expect(formatCpfCnpj('12345678909')).toBe('123.456.789-09')
    expect(formatCpfCnpj('13445356000180')).toBe('13.445.356/0001-80')
  })
})

describe('formatTelefone', () => {
  it('formata fixo e celular', () => {
    expect(formatTelefone('1332279176')).toBe('(13) 3227-9176')
    expect(formatTelefone('13997174540')).toBe('(13) 99717-4540')
  })

  it('formata progressivamente e deixa apagar o DDD', () => {
    expect(formatTelefone('1')).toBe('1')
    expect(formatTelefone('13')).toBe('13')
    expect(formatTelefone('133')).toBe('(13) 3')
    expect(formatTelefone('133227')).toBe('(13) 3227')
    expect(formatTelefone('1332279')).toBe('(13) 3227-9')
  })

  it('ignora o que não é dígito e corta o excedente', () => {
    expect(formatTelefone('(13) 99717-4540')).toBe('(13) 99717-4540')
    expect(formatTelefone('139971745409999')).toBe('(13) 99717-4540')
    expect(formatTelefone('')).toBe('')
  })
})

describe('formatRg', () => {
  it('formata o RG completo', () => {
    expect(formatRg('123456789')).toBe('12.345.678-9')
  })

  it('aceita X como dígito verificador', () => {
    expect(formatRg('12345678x')).toBe('12.345.678-X')
  })

  it('formata progressivamente e limita o tamanho', () => {
    expect(formatRg('12')).toBe('12')
    expect(formatRg('12345')).toBe('12.345')
    expect(formatRg('12345678')).toBe('12.345.678')
    expect(formatRg('1234567890123')).toBe('12.345.678-9')
  })
})

describe('parseNumeroPlanilha', () => {
  it('entende o formato digitado em pt-BR', () => {
    expect(parseNumeroPlanilha('1.234,56')).toBe(1234.56)
    expect(parseNumeroPlanilha('787,40')).toBe(787.4)
    expect(parseNumeroPlanilha('R$ 195,00')).toBe(195)
  })

  it('entende o número cru que o Excel devolve', () => {
    expect(parseNumeroPlanilha('1234.56')).toBe(1234.56)
    expect(parseNumeroPlanilha('9000')).toBe(9000)
  })

  it('devolve 0 para texto sem número', () => {
    expect(parseNumeroPlanilha('abc')).toBe(0)
    expect(parseNumeroPlanilha('')).toBe(0)
  })
})

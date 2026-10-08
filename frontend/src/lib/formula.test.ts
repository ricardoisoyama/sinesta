import { describe, expect, it } from 'vitest'
import { avaliar, chaveDe, referencias, trocarReferencia } from './formula'

describe('formula', () => {
  it('gera chave a partir do nome', () => {
    expect(chaveDe('Salário base')).toBe('salario_base')
    expect(chaveDe('Cargo (confiança)')).toBe('cargo_confianca')
    expect(chaveDe('1º turno')).toBe('_1_turno')
  })

  it('faz as quatro operações com precedência e parênteses', () => {
    expect(avaliar('2 + 3 * 4', {}).valor).toBe(14)
    expect(avaliar('(2 + 3) * 4', {}).valor).toBe(20)
    expect(avaliar('10 / 4 - 1', {}).valor).toBe(1.5)
    expect(avaliar('-3 + 5', {}).valor).toBe(2)
  })

  it('aceita vírgula decimal, milhar e percentual', () => {
    expect(avaliar('1.500,50 + 0,5', {}).valor).toBe(1501)
    expect(avaliar('1500.5 + 0.5', {}).valor).toBe(1501)
    expect(avaliar('2000 * 20%', {}).valor).toBeCloseTo(400)
  })

  it('usa os campos pelo nome ou pela chave', () => {
    const vars = { salario_base: 2200, cargo_confianca: 1500 }
    expect(avaliar('(salario_base + cargo_confianca) * 68%', vars).valor).toBeCloseTo(2516)
    expect(avaliar('SALARIO_BASE * 2', vars).valor).toBe(4400)
    // Nome com espaço não é uma referência: cada palavra vira um campo (por isso existe a chave).
    expect(avaliar('Salário base * 2', vars).erro).toMatch(/desconhecido/)
    expect(referencias('(salario_base + cargo_confianca) * 68%')).toEqual(['salario_base', 'cargo_confianca'])
  })

  it('renomear coluna reescreve só a referência inteira', () => {
    expect(trocarReferencia('(salario + salario_base) * 20%', 'salario', 'salario_bruto')).toBe('(salario_bruto + salario_base) * 20%')
    expect(trocarReferencia('epi * 2', 'epi', 'epi')).toBe('epi * 2')
  })

  it('explica o erro em vez de quebrar', () => {
    expect(avaliar('salario * 2', {}).erro).toMatch(/desconhecido/)
    expect(avaliar('(2 + 3', {}).erro).toMatch(/parêntese/)
    expect(avaliar('10 / 0', {}).erro).toMatch(/zero/)
    expect(avaliar('2 $ 3', {}).erro).toMatch(/inválido/)
    expect(avaliar('', {}).valor).toBe(0)
  })
})

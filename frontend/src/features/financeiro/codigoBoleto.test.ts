import { describe, expect, it } from 'vitest'
import { dataDoFator, lerCodigoBoleto, linhaDigitavel } from './codigoBoleto'

// Exemplos do sandbox do Inter.
const BANCARIO = '03395988500000666539201493990000372830030102'
const CONVENIO = '82670000000653301602023123106000000002830894'
const hoje = '2026-11-03'

describe('lerCodigoBoleto', () => {
  it('lê valor e vencimento do código de barras bancário', () => {
    const r = lerCodigoBoleto(BANCARIO, hoje)
    expect(r.erro).toBeUndefined()
    expect(r.codigo).toMatchObject({ arrecadacao: false, valor: 666.53, vencimento: dataDoFator(9885, hoje) })
  })

  it('aceita a linha digitável com pontos e espaços', () => {
    const linha = '03399.20142 93990.000379 28300.301026 5 98850000066653'
    const r = lerCodigoBoleto(linha, hoje)
    expect(r.erro).toBeUndefined()
    expect(r.codigo?.barras).toBe(BANCARIO)
  })

  it('recusa linha com dígito trocado e tamanho errado', () => {
    expect(lerCodigoBoleto('03399.20142 93990.000379 28300.301026 5 98850000066654', hoje).codigo).toBeUndefined()
    expect(lerCodigoBoleto('03399.20143 93990.000379 28300.301026 5 98850000066653', hoje).erro).toMatch(/não confere/)
    expect(lerCodigoBoleto('1234', hoje).erro).toMatch(/este tem 4/)
  })

  it('conta de consumo traz o valor e não o vencimento', () => {
    expect(lerCodigoBoleto(CONVENIO, hoje).codigo).toMatchObject({ arrecadacao: true, valor: 65.33, vencimento: '' })
  })

  it('fator usa a base nova depois de fev/2025', () => {
    expect(dataDoFator(1000, hoje)).toBe('2025-02-22')
    expect(dataDoFator(0, hoje)).toBe('')
  })

  it('monta a linha digitável do código de barras', () => {
    expect(linhaDigitavel(BANCARIO)).toBe('03399.20142 93990.000379 28300.301026 5 98850000066653')
    expect(linhaDigitavel(CONVENIO)).toBe('82670000000-1 65330160202-1 31231060000-1 00002830894-8')
  })
})

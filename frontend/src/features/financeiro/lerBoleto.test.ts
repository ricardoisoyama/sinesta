import { describe, expect, it } from 'vitest'
import { codigoNoTexto } from './lerBoleto'

describe('codigoNoTexto', () => {
  it('acha a linha digitável no meio do texto do PDF', () => {
    const texto = 'Banco Santander | 033-7 | 03399.20142 93990.000379 28300.301026 5 98850000066653 Local de pagamento: qualquer banco'
    expect(codigoNoTexto(texto)).toBe('03399201429399000037928300301026598850000066653')
  })

  it('ignora números que não conferem', () => {
    expect(codigoNoTexto('CNPJ 63.736.778/0001-83 Nosso número 0000000000000000000000000000000000000000000001')).toBeNull()
  })

  it('acha a conta de consumo (48 dígitos em blocos)', () => {
    expect(codigoNoTexto('Conta de luz · 82670000000-1 65330160202-1 31231060000-1 00002830894-8 · vencimento')).toBe('826700000001653301602021312310600001000028308948')
  })
})

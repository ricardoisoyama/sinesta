import { describe, expect, it } from 'vitest'
import { REGRAS_PADRAO } from './api'
import { diasAteVencer, resumoRegras } from './regras'

describe('resumoRegras', () => {
  it('padrão: sem encargos, baixa em 30 dias e Pix', () => {
    expect(resumoRegras(REGRAS_PADRAO)).toEqual([
      'Depois do vencimento: sem multa e sem juros.',
      'O banco cancela o boleto sozinho 30 dias depois do vencimento se não for pago.',
      'Pix junto do boleto (QR Code no PDF).',
    ])
  })

  it('multa, juros e desconto em linguagem do pagador', () => {
    const r = resumoRegras({
      ...REGRAS_PADRAO,
      multaTipo: 'percentual',
      multa: 2,
      jurosTipo: 'valor-dia',
      juros: 0.5,
      descontoTipo: 'percentual',
      desconto: 3,
      descontoDiasAntes: 1,
      diasBaixa: 0,
      comPix: false,
    })
    expect(r[0]).toBe('Depois do vencimento: multa de 2% e juros de R$ 0,50 por dia.')
    expect(r[1]).toBe('Desconto de 3% pagando até 1 dia antes do vencimento.')
    expect(r[2]).toContain('no dia seguinte ao vencimento')
    expect(r[3]).toBe('Só boleto, sem Pix.')
  })
})

describe('diasAteVencer', () => {
  it('conta os dias pelo calendário', () => {
    const hoje = new Date(2026, 9, 16)
    expect(diasAteVencer('2027-10-16', hoje)).toBe(365)
    expect(diasAteVencer('2026-10-15', hoje)).toBe(-1)
    expect(diasAteVencer('', hoje)).toBeNull()
  })
})

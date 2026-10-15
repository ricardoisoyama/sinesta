import { describe, expect, it } from 'vitest'
import { CONTRATOS_EXEMPLO } from './mock'
import { alertasDoContrato, diasEntre, escopoVigente, margemPrecificada, progressoVigencia, proximoFaturamento, proximoReajuste, totalEscopo } from './regras'
import type { Contrato } from './types'

const aruba = CONTRATOS_EXEMPLO.find((c) => c.numero === 'MIR-0001')!

describe('contratos (protótipo)', () => {
  it('o valor mensal vem da versão do escopo em vigor (aditivo entra na data dele)', () => {
    expect(escopoVigente(aruba, '2026-08-15').versao).toBe(1)
    expect(escopoVigente(aruba, '2026-10-15').versao).toBe(2)
    expect(totalEscopo(escopoVigente(aruba, '2026-10-15'))).toBe(37119.87)
  })

  it('margem precificada = (preço − custo) ÷ preço', () => {
    const v = { versao: 1, vigenteDesde: '2026-01-01', motivo: '', itens: [{ id: 'x', servico: '', descricao: '', quantidade: 2, unidade: '', valorUnitario: 100, custoUnitario: 80 }] }
    expect(margemPrecificada(v)).toBeCloseTo(0.2)
  })

  it('progresso da vigência fica entre 0 e 1', () => {
    expect(progressoVigencia({ inicio: '2026-01-01', fim: '2026-12-31' }, '2025-12-01')).toBe(0)
    expect(progressoVigencia({ inicio: '2026-01-01', fim: '2026-12-31' }, '2027-02-01')).toBe(1)
    expect(progressoVigencia({ inicio: '2026-01-01', fim: '2026-12-31' }, '2026-07-02')).toBeCloseTo(0.5, 1)
  })

  it('reajuste: primeiro mês-base depois de 12 meses; nada se cair depois do fim', () => {
    const c = { ...aruba, inicio: '2026-06-01', fim: '2030-01-31', condicoes: { ...aruba.condicoes, reajusteMesBase: 6 } } as Contrato
    expect(proximoReajuste(c, '2026-10-15')).toBe('2027-06-01')
    expect(proximoReajuste(c, '2027-07-10')).toBe('2028-06-01')
    expect(proximoReajuste({ ...c, fim: '2027-03-31' }, '2026-10-15')).toBeNull()
    expect(proximoReajuste({ ...c, modalidade: 'spot' }, '2026-10-15')).toBeNull()
  })

  it('próximo faturamento no dia combinado (mês corrente ou o seguinte)', () => {
    expect(proximoFaturamento(aruba, '2026-10-15')).toBe('2026-11-01')
    expect(proximoFaturamento({ ...aruba, condicoes: { ...aruba.condicoes, diaFaturamento: 20 } }, '2026-10-15')).toBe('2026-10-20')
  })

  it('alertas: vencimento perto, reajuste perto e extras a faturar', () => {
    const vencendo = { ...aruba, fim: '2026-11-10', faturas: [], condicoes: { ...aruba.condicoes, renovacaoAutomatica: false } } as Contrato
    const textos = alertasDoContrato(vencendo, '2026-10-15').map((a) => a.texto)
    expect(textos).toContain('Vence em 26 dias')
    expect(textos.some((t) => t.includes('extras a faturar'))).toBe(true)
    expect(diasEntre('2026-10-15', '2026-11-10')).toBe(26)
  })
})

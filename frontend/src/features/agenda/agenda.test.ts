import { describe, expect, it } from 'vitest'
import { andar, diasDaVista, gradeDoMes, somarMinutos, tituloDoPeriodo } from './datas'
import { posicionar, type EventoAgenda } from './types'

const ev = (id: string, inicio: string, fim: string): EventoAgenda => ({
  id, origem: 'agenda', titulo: id, tipo: 'reuniao', inicio: `2026-10-01T${inicio}`, fim: `2026-10-01T${fim}`, diaInteiro: false, cliente: '', responsavel: '', concluido: false,
})

describe('datas da agenda', () => {
  it('semana começa no domingo e a semana útil vai de segunda a sexta', () => {
    // 01/10/2026 é quinta-feira.
    expect(diasDaVista('semana', '2026-10-01')).toEqual(['2026-09-27', '2026-09-28', '2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02', '2026-10-03'])
    expect(diasDaVista('semana-util', '2026-10-01')).toEqual(['2026-09-28', '2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02'])
  })
  it('grade do mês tem 42 dias a partir do domingo antes do dia 1', () => {
    const g = gradeDoMes('2026-10-15')
    expect(g).toHaveLength(42)
    expect(g[0]).toBe('2026-09-27')
    expect(g).toContain('2026-10-31')
  })
  it('anda por dia, semana e mês; títulos legíveis', () => {
    expect(andar('dia', '2026-10-31', 1)).toBe('2026-11-01')
    expect(andar('semana', '2026-10-01', -1)).toBe('2026-09-24')
    expect(andar('mes', '2026-01-31', 1)).toBe('2026-02-01')
    expect(tituloDoPeriodo('semana-util', '2026-10-01')).toBe('28 de setembro – 2 de outubro de 2026')
    expect(tituloDoPeriodo('semana-util', '2026-10-07')).toBe('5–9 de outubro de 2026')
    expect(tituloDoPeriodo('mes', '2026-10-07')).toBe('outubro de 2026')
  })
  it('somar minutos não passa da meia-noite', () => {
    expect(somarMinutos('2026-10-01T09:30', 60)).toBe('2026-10-01T10:30')
    expect(somarMinutos('2026-10-01T23:30', 60)).toBe('2026-10-01T23:59')
  })
})

describe('eventos lado a lado (como no Outlook)', () => {
  it('quem se sobrepõe divide a largura; quem não se sobrepõe fica inteiro', () => {
    const p = posicionar([ev('a', '09:00', '10:00'), ev('b', '09:30', '10:30'), ev('c', '11:00', '12:00')])
    const de = (id: string) => p.find((x) => x.evento.id === id)!
    expect([de('a').coluna, de('a').colunas]).toEqual([0, 2])
    expect([de('b').coluna, de('b').colunas]).toEqual([1, 2])
    expect([de('c').coluna, de('c').colunas]).toEqual([0, 1])
  })
  it('reaproveita a coluna livre dentro do mesmo grupo', () => {
    const p = posicionar([ev('a', '09:00', '12:00'), ev('b', '09:00', '10:00'), ev('c', '10:00', '11:00')])
    const de = (id: string) => p.find((x) => x.evento.id === id)!
    expect(de('a').colunas).toBe(2)
    expect(de('c').coluna).toBe(de('b').coluna)
  })
})

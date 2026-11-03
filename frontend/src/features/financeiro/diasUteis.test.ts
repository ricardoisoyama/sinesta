import { describe, expect, it } from 'vitest'
import { definirCidadesEmpresas, definirFeriados, diaUtil, pascoa, proximoDiaUtil, vencido } from './diasUteis'

describe('diasUteis', () => {
  it('Páscoa e feriados móveis', () => {
    expect(pascoa(2026)).toBe('2026-04-05')
    expect(diaUtil('2026-02-16')).toBe(false) // Carnaval
    expect(diaUtil('2026-06-04')).toBe(false) // Corpus Christi
    expect(diaUtil('2026-11-04')).toBe(true)
  })

  it('domingo 01/11 + Finados: só atrasa depois de 03/11', () => {
    expect(proximoDiaUtil('2026-11-01')).toBe('2026-11-03')
    expect(vencido('2026-11-01', '2026-11-03')).toBe(false)
    expect(vencido('2026-11-01', '2026-11-04')).toBe(true)
  })

  it('feriado do cadastro, inclusive todo ano', () => {
    definirFeriados([{ data: '2026-01-25', todoAno: true }])
    expect(diaUtil('2027-01-25')).toBe(false)
    definirFeriados([])
    expect(diaUtil('2027-01-25')).toBe(true)
  })

  it('municipal só na empresa da cidade; estadual no estado', () => {
    definirCidadesEmpresas([{ id: 'matriz', endereco: 'São Paulo - SP' }, { id: 'filial', endereco: 'São Vicente - SP' }, { id: 'rio', endereco: 'Niterói - RJ' }])
    definirFeriados([
      { data: '2026-01-22', todoAno: true, abrangencia: 'cidade', cidade: 'Sao Vicente - SP' },
      { data: '2026-07-09', todoAno: true, abrangencia: 'uf', uf: 'SP' },
    ])
    expect(diaUtil('2027-01-22', 'filial')).toBe(false)
    expect(diaUtil('2027-01-22', 'matriz')).toBe(true)
    expect(diaUtil('2027-01-22')).toBe(true)
    expect(diaUtil('2027-07-09', 'matriz')).toBe(false)
    expect(diaUtil('2027-07-09', 'rio')).toBe(true)
    expect(proximoDiaUtil('2027-01-22', 'filial')).toBe('2027-01-25')
    definirFeriados([])
    definirCidadesEmpresas([])
  })
})

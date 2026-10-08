import { describe, expect, it } from 'vitest'
import { fluxoDeCaixa, gerarParcelas, liquidoDe, resumo, saldoCarteira, somarMeses, statusDe } from './calculos'
import { movimentoVazio, type Carteira, type Movimento } from './types'

const hoje = '2026-09-22'
const mov = (p: Partial<Movimento>): Movimento => ({ ...movimentoVazio('pagar'), id: p.id ?? 'x', grupoId: 'g', carteiraId: 'c1', ...p })
const carteira: Carteira = { id: 'c1', nome: 'Banco', tipo: 'banco', banco: '077', agencia: '', conta: '', saldoInicial: 1000, saldoInicialEm: '2026-09-01', cor: '#000', status: 'ativo' }

describe('statusDe', () => {
  it('em aberto quando vence hoje ou depois; atrasado quando já venceu; liquidado quando pago; cancelado vence tudo', () => {
    expect(statusDe(mov({ vencimento: '2026-09-22' }), hoje)).toBe('aberto')
    expect(statusDe(mov({ vencimento: '2026-09-21' }), hoje)).toBe('atrasado')
    expect(statusDe(mov({ vencimento: '2026-09-01', pagoEm: '2026-09-02' }), hoje)).toBe('liquidado')
    expect(statusDe(mov({ vencimento: '2026-09-01', pagoEm: '2026-09-02', cancelado: true }), hoje)).toBe('cancelado')
  })
})

describe('liquidoDe', () => {
  it('aplica desconto, juros e multa; quando liquidado vale o pago', () => {
    expect(liquidoDe(mov({ valor: 100, desconto: 10, juros: 2, multa: 3 }))).toBe(95)
    expect(liquidoDe(mov({ valor: 100, pagoEm: '2026-09-02', valorPago: 98 }))).toBe(98)
  })
})

describe('resumo', () => {
  it('separa a receber, a pagar, vencidos e o previsto em 30 dias', () => {
    const r = resumo(
      [
        mov({ id: '1', tipo: 'receber', valor: 500, vencimento: '2026-09-30' }),
        mov({ id: '2', tipo: 'pagar', valor: 200, vencimento: '2026-09-10' }),
        mov({ id: '3', tipo: 'pagar', valor: 300, vencimento: '2026-12-01' }),
        mov({ id: '4', tipo: 'receber', valor: 999, vencimento: '2026-09-01', pagoEm: '2026-09-01' }),
      ],
      hoje,
    )
    expect(r.aReceber).toBe(500)
    expect(r.aPagar).toBe(500)
    expect(r.vencidos).toBe(200)
    expect(r.qtdVencidos).toBe(1)
    expect(r.previsto30).toBe(300)
  })
})

describe('saldoCarteira e fluxoDeCaixa', () => {
  const movs = [
    mov({ id: 'a', tipo: 'receber', valor: 300, vencimento: '2026-09-05', pagoEm: '2026-09-05' }),
    mov({ id: 'b', tipo: 'pagar', valor: 100, vencimento: '2026-09-10', pagoEm: '2026-09-10' }),
    mov({ id: 'c', tipo: 'pagar', valor: 50, vencimento: '2026-09-25' }),
    mov({ id: 'd', tipo: 'receber', valor: 80, vencimento: '2026-10-02' }),
  ]
  it('saldo hoje = inicial + liquidados', () => {
    expect(saldoCarteira(carteira, movs, hoje)).toBe(1200)
  })
  it('fluxo por dia com previstos: acumulado encadeia e detecta o menor saldo', () => {
    const f = fluxoDeCaixa(movs, [carteira], '2026-09-01', '2026-09-30', 'dia', true, '', hoje)
    expect(f.saldoInicial).toBe(1000)
    expect(f.linhas.map((l) => l.periodo)).toEqual(['2026-09-05', '2026-09-10', '2026-09-25'])
    expect(f.linhas.map((l) => l.acumulado)).toEqual([1300, 1200, 1150])
    expect(f.linhas[2].futuro).toBe(true)
    expect(f.saldoFinal).toBe(1150)
    expect(f.menorSaldo).toEqual({ valor: 1150, em: '2026-09-25' })
  })
  it('sem previstos só entra o que foi liquidado; por mês agrupa', () => {
    const f = fluxoDeCaixa(movs, [carteira], '2026-09-01', '2026-10-31', 'mes', false, '', hoje)
    expect(f.linhas).toHaveLength(1)
    expect(f.linhas[0].resultado).toBe(200)
  })
})

describe('gerarParcelas', () => {
  it('divide o valor sem perder centavos e avança o vencimento mês a mês', () => {
    const p = gerarParcelas(mov({ valor: 100, vencimento: '2026-01-31' }), 3, 'mensal')
    expect(p.map((x) => x.valor)).toEqual([33.33, 33.33, 33.34])
    expect(p.map((x) => x.vencimento)).toEqual(['2026-01-31', '2026-02-28', '2026-03-31'])
    expect(p.map((x) => `${x.parcela}/${x.totalParcelas}`)).toEqual(['1/3', '2/3', '3/3'])
    expect(new Set(p.map((x) => x.grupoId)).size).toBe(1)
  })
  it('somarMeses respeita o fim do mês', () => {
    expect(somarMeses('2026-08-31', 1)).toBe('2026-09-30')
  })
})

import { describe, expect, it } from 'vitest'
import type { CustoFixo } from '@/features/custosFixos/types'
import type { CenarioMeta } from '@/features/metas/mock'
import { custoNoMes, dfDoMes, projetar, proximosMeses, receitaDoMes, resumir, type Hipotese } from './motor'

const meses = proximosMeses(new Date(2026, 9, 15), 3) // out, nov, dez
const custo = (p: Partial<CustoFixo>): CustoFixo => ({
  id: 'c', unidadeId: 'a', descricao: '', categoriaId: '', valorMensal: 1000, tipo: 'recorrente', dataInicio: '', dataFim: '', fornecedorId: '', status: 'ativo', ...p,
})
const params = { contribuicao: 0.25, dvSemLucro: 0.15, lucro: 0.1 }
const entrada = (hipoteses: Hipotese[] = [], sensibilidade = 0) => ({
  meses,
  receita: () => ({ valor: 100_000, repetida: false }),
  df: () => 15_000,
  valorDoCusto: () => 2_000,
  parametros: params,
  hipoteses,
  sensibilidade,
})

describe('projeção (motor)', () => {
  it('doze meses a partir do mês corrente, com rótulo curto', () => {
    expect(proximosMeses(new Date(2026, 9, 15)).map((m) => m.chave)).toHaveLength(12)
    expect(meses.map((m) => m.rotulo)).toEqual(['out/26', 'nov/26', 'dez/26'])
  })

  it('despesa entra no mês pela vigência; spot e inativa não entram', () => {
    expect(custoNoMes(custo({ dataInicio: '2026-11-10' }), meses[0])).toBe(false)
    expect(custoNoMes(custo({ dataInicio: '2026-11-10' }), meses[1])).toBe(true)
    expect(custoNoMes(custo({ dataFim: '2026-10-31' }), meses[1])).toBe(false)
    expect(custoNoMes(custo({ tipo: 'spot' }), meses[0])).toBe(false)
    expect(custoNoMes(custo({ status: 'inativo' }), meses[0])).toBe(false)
  })

  it('DF da empresa leva a parte dela no rateio; o grupo conta a despesa uma vez', () => {
    const c = custo({ rateio: [{ empresaId: 'a', percentual: 0.6 }, { empresaId: 'b', percentual: 0.4 }] })
    expect(dfDoMes([c], ['a'], meses[0])).toBeCloseTo(600)
    expect(dfDoMes([c], ['a', 'b'], meses[0])).toBeCloseTo(1000)
  })

  it('base: lucro = receita × contribuição − DF; equilíbrio = DF ÷ contribuição', () => {
    const [l] = projetar(entrada())
    expect(l.lucro).toBe(10_000)
    expect(l.equilibrio).toBe(60_000)
    // fator = 1 / (1 − (0,15 + 0,15 + 0,10)) = 1 / 0,6
    expect(l.fator).toBeCloseTo(1 / 0.6)
  })

  it('hipóteses valem a partir do mês e só se ativas', () => {
    const novo: Hipotese = { id: 'h', tipo: 'novo-custo', nome: 'Supervisor', valor: 5_000, inicio: '2026-11', ativa: true }
    const linhas = projetar(entrada([novo, { ...novo, id: 'x', ativa: false, valor: 99_999 }]))
    expect(linhas.map((l) => l.df)).toEqual([15_000, 20_000, 20_000])
    expect(linhas[1].lucro).toBe(5_000)
  })

  it('meta −20% e sensibilidade se somam; cortar despesa tira o valor dela', () => {
    const queda: Hipotese = { id: 'q', tipo: 'variacao-meta', nome: '', valor: -0.2, inicio: '2026-10', ativa: true }
    const corte: Hipotese = { id: 'k', tipo: 'cortar-custo', nome: '', valor: 0, inicio: '2026-10', custoId: 'c', ativa: true }
    const [l] = projetar(entrada([queda, corte], -0.1))
    expect(l.receita).toBe(72_000)
    expect(l.df).toBe(13_000)
  })

  it('sem meta no ano, repete a do mesmo mês do ano anterior e marca como repetida', () => {
    const meta = { id: 'm', nome: '', empresaId: 'a', metaAnual: 1_200, ano: 2026, valoresMensais: [10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 300, 350] } as CenarioMeta
    const [out26] = proximosMeses(new Date(2026, 9, 1), 1)
    const [fev27] = proximosMeses(new Date(2027, 1, 1), 1)
    expect(receitaDoMes([meta], 'a', out26)).toEqual({ valor: 100, repetida: false })
    expect(receitaDoMes([meta], 'a', fev27)).toEqual({ valor: 20, repetida: true })
    expect(receitaDoMes([meta], 'b', fev27)).toBeNull()
  })

  it('resumo: meses no vermelho e quanto a receita pode cair até zerar o lucro', () => {
    const r = resumir(projetar(entrada()), params.contribuicao)
    expect(r.lucro).toBe(30_000)
    expect(r.mesesNoVermelho).toBe(0)
    expect(r.quedaAteZerar).toBeCloseTo(0.4)
  })
})

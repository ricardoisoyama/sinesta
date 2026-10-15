import { describe, expect, it } from 'vitest'
import { CONTRATOS_EXEMPLO } from './mock'
import { previaCobranca } from './modelos'
import { faturasDoContrato, totalDaFatura } from './faturas'
import type { ComponenteContrato, Contrato, ItemEscopo } from './types'

const hoje = (() => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
})()
const mes = hoje.slice(0, 7)
const por = (numero: string) => CONTRATOS_EXEMPLO.find((c) => c.numero === numero)!
const item = (apelido: string, qtd: number, valor: number): ItemEscopo => ({ id: apelido + qtd, apelido, servico: apelido, descricao: apelido, quantidade: qtd, unidade: 'un', valorUnitario: valor, custoUnitario: 0 })
const formula = (apelido: string, f: string, ativo = true): ComponenteContrato => ({ id: apelido, apelido, nome: apelido, regra: 'formula', unidade: '', valorUnitario: 0, quantidade: 0, formula: f, documento: '', servicoNfse: '', ativo })

describe('prévia da cobrança (componentes do modelo)', () => {
  it('fórmula usa os fixos por apelido e o subtotal; opcional desligado não entra', () => {
    const p = previaCobranca([item('posto', 2, 1000)], [formula('adicional', 'posto * 20%'), formula('taxa', 'subtotal * 10%', false)])
    expect(p.total).toBe(2400)
    expect(p.linhas.find((l) => l.apelido === 'adicional')?.valor).toBe(400)
  })

  it('fórmula com apelido desconhecido aponta o erro e não soma', () => {
    const p = previaCobranca([item('posto', 1, 1000)], [formula('x', 'inexistente * 2')])
    expect(p.linhas.find((l) => l.apelido === 'x')?.erro).toContain('inexistente')
    expect(p.total).toBe(1000)
  })

  it('cobrança única só na primeira fatura; linha de tabela não entra na mensalidade', () => {
    const unico: ComponenteContrato = { ...formula('impl', ''), regra: 'unico', quantidade: 1, valorUnitario: 500 }
    const tabela = { ...item('frete', 1, 3000), tabela: true }
    expect(previaCobranca([item('lic', 1, 100), tabela], [unico], {}, true).total).toBe(600)
    expect(previaCobranca([item('lic', 1, 100), tabela], [unico], {}, false).total).toBe(100)
  })
})

describe('faturas do contrato', () => {
  it('fatura aberta recalcula do contrato (ligar o adicional noturno muda o total); emitida trava', () => {
    const gomes = por('MIR-0003')
    const comAdicional: Contrato = { ...gomes, componentes: (gomes.componentes ?? []).map((c) => (c.apelido === 'adicional_noturno' ? { ...c, ativo: true } : c)) }
    const antes = faturasDoContrato(gomes, hoje, {})
    const depois = faturasDoContrato(comAdicional, hoje, {})
    const aberta = (l: typeof antes) => l.find((f) => !f.travada && !f.avulsa)
    const emitida = (l: typeof antes) => l.find((f) => f.travada)
    if (aberta(antes)) expect(totalDaFatura(aberta(depois)!)).toBeGreaterThan(totalDaFatura(aberta(antes)!))
    expect(totalDaFatura(emitida(depois)!)).toBe(totalDaFatura(emitida(antes)!))
  })

  it('extra pendente entra na primeira fatura aberta; tirado na conferência vai para a seguinte', () => {
    const aruba = por('MIR-0001')
    const faturas = faturasDoContrato(aruba, hoje, {})
    const doMes = faturas.find((f) => f.competencia === mes && !f.avulsa)!
    expect(doMes.extras.map((e) => e.id)).toContain('e1')
    const tirado = faturasDoContrato(aruba, hoje, { [doMes.id]: { extrasFora: ['e1'] } })
    expect(tirado.find((f) => f.id === doMes.id)!.extras.map((e) => e.id)).not.toContain('e1')
    expect(tirado.some((f) => f.id !== doMes.id && f.extras.some((e) => e.id === 'e1'))).toBe(true)
  })

  it('extra "faturar separado" vira uma fatura própria', () => {
    expect(faturasDoContrato(por('MIR-0001'), hoje, {}).some((f) => f.avulsa && f.id === 'x-e2')).toBe(true)
  })

  it('devolvida: o ajuste muda a etapa e guarda o motivo, sem perder o cálculo', () => {
    const aruba = por('MIR-0001')
    const f = faturasDoContrato(aruba, hoje, {}).find((x) => x.competencia === mes && !x.avulsa)!
    const dev = faturasDoContrato(aruba, hoje, { [f.id]: { situacao: 'devolvida', motivo: 'faltou hora extra' } }).find((x) => x.id === f.id)!
    expect(dev.situacao).toBe('devolvida')
    expect(dev.motivo).toBe('faltou hora extra')
    expect(dev.travada).toBe(false)
    expect(totalDaFatura(dev)).toBe(totalDaFatura(f))
  })

  it('fretes: uma fatura por quinzena com os CT-es dela; por CT-e quando o cliente pede', () => {
    const fretes = por('MRF-0003')
    const quinzenas = faturasDoContrato(fretes, hoje, {}).filter((f) => !f.avulsa)
    const docs = quinzenas.flatMap((f) => f.documentos.map((d) => d.id))
    expect(new Set(docs).size).toBe(docs.length) // cada CT-e numa fatura só
    expect(quinzenas.every((f) => f.previsto === f.documentos.reduce((a, d) => a + d.valor, 0))).toBe(true)
    const porCte = faturasDoContrato({ ...fretes, condicoes: { ...fretes.condicoes, agrupamento: 'por-documento' } }, hoje, {}).filter((f) => !f.avulsa)
    expect(porCte.every((f) => f.documentos.length === 1)).toBe(true)
    expect(porCte.length).toBeGreaterThan(quinzenas.length)
  })
})

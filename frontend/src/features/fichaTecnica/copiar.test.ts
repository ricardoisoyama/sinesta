import { describe, expect, it } from 'vitest'
import { copiarParaFicha, copiarParaFichas, duplicarFicha } from './copiar'
import { novaColuna, type ColunaFicha, type FichaTecnica, type GradeFichas } from './types'

const col = (
  id: string,
  grupoId: string,
  nome: string,
  chave: string,
  tipo: ColunaFicha['tipo'] = 'valor',
  extra: Partial<ColunaFicha> = {},
): ColunaFicha => ({
  ...novaColuna(grupoId, nome, tipo),
  id,
  chave,
  ...extra,
})
const item = (
  id: string,
  grupoId: string,
  nome: string,
  valores: FichaTecnica['valores'],
): FichaTecnica => ({ id, grupoId, nome, valores, status: 'ativo' })

// Matriz: frete + seguro (2% do frete). Filial: só o frete, com a mesma carreta e outro valor.
const grade = (): GradeFichas => ({
  grupos: [
    { id: 'matriz', nome: 'São Vicente x Itu - Matriz', status: 'ativo' },
    { id: 'filial', nome: 'São Vicente x Itu - Filial', status: 'ativo' },
  ],
  colunas: [
    col('m-frete', 'matriz', 'Frete Motorista', 'frete_motorista'),
    col('m-seguro', 'matriz', 'Seguro', 'seguro', 'calculo', { formula: 'frete_motorista * 2%' }),
    col('m-obs', 'matriz', 'Observação', 'observacao', 'texto'),
    col('f-frete', 'filial', 'Frete Motorista', 'frete_motorista'),
    col('f-obs', 'filial', 'Observação', 'observacao', 'valor'),
  ],
  fichas: [
    item('m-carreta', 'matriz', 'Carreta Simples - 5 Eixos', {
      'm-frete': 2900,
      'm-obs': 'pedágio incluso',
    }),
    item('m-truck', 'matriz', 'Truck', { 'm-frete': 1800 }),
    item('f-carreta', 'filial', 'Carreta simples - 5 eixos ', { 'f-frete': 3300 }),
  ],
})
const daMatriz = (g: GradeFichas) => g.colunas.filter((c) => c.grupoId === 'matriz')

describe('copiarParaFicha', () => {
  it('leva o custo pela coluna de mesmo nome, cria a que falta e avisa o que muda', () => {
    const g = grade()
    const { grade: nova, plano } = copiarParaFicha(g, daMatriz(g), [g.fichas[1]], 'filial', 'novo')
    const truck = nova.fichas.find((f) => f.grupoId === 'filial' && f.nome === 'Truck')!
    expect(truck.valores['f-frete']).toBe(1800)
    expect(truck.id).not.toBe('m-truck')
    const seguro = nova.colunas.find((c) => c.grupoId === 'filial' && c.chave === 'seguro')!
    expect(seguro).toMatchObject({ tipo: 'calculo', formula: 'frete_motorista * 2%' })
    expect(seguro.id).not.toBe('m-seguro')
    // A carreta da filial ganha o seguro calculado (2% de 3.300); a observação é texto × valor e não vai.
    expect(plano).toMatchObject({
      novos: 1,
      repetidos: [],
      colunasNovas: ['Seguro'],
      tipoDiferente: ['Observação'],
      mudamTotal: 1,
    })
    expect(g.colunas).toHaveLength(5) // a grade original não muda
  })

  it('item com o mesmo nome (sem acento/caixa): substitui os valores ou cria uma cópia', () => {
    const g = grade()
    const sub = copiarParaFicha(g, daMatriz(g), [g.fichas[0]], 'filial', 'substituir')
    expect(sub.plano).toMatchObject({ novos: 0, repetidos: ['Carreta Simples - 5 Eixos'] })
    expect(sub.grade.fichas.find((f) => f.id === 'f-carreta')!.valores['f-frete']).toBe(2900)
    expect(sub.grade.fichas.filter((f) => f.grupoId === 'filial')).toHaveLength(1)

    const nov = copiarParaFicha(g, daMatriz(g), [g.fichas[0]], 'filial', 'novo')
    expect(nov.grade.fichas.find((f) => f.id === 'f-carreta')!.valores['f-frete']).toBe(3300)
    expect(
      nov.grade.fichas.find((f) => f.nome === 'Carreta Simples - 5 Eixos (cópia)')!.valores[
        'f-frete'
      ],
    ).toBe(2900)
  })

  it('várias fichas de destino de uma vez', () => {
    const g = grade()
    g.grupos.push({ id: 'gru', nome: 'GRU - Aeroporto', status: 'ativo' })
    const { grade: nova, planos } = copiarParaFichas(
      g,
      daMatriz(g),
      [g.fichas[1]],
      ['filial', 'gru'],
      'novo',
    )
    expect(planos.map((p) => p.novos)).toEqual([1, 1])
    expect(nova.colunas.filter((c) => c.grupoId === 'gru').map((c) => c.nome)).toEqual([
      'Frete Motorista',
      'Seguro',
      'Observação',
    ])
    expect(nova.fichas.find((f) => f.grupoId === 'gru')!.nome).toBe('Truck')
  })
})

describe('duplicarFicha', () => {
  it('cria a cópia logo abaixo, com colunas, itens e valores próprios', () => {
    const g = grade()
    const { grade: nova, id } = duplicarFicha(g, 'matriz')
    expect(nova.grupos.map((x) => x.nome)).toEqual([
      'São Vicente x Itu - Matriz',
      'São Vicente x Itu - Matriz (cópia)',
      'São Vicente x Itu - Filial',
    ])
    const cols = nova.colunas.filter((c) => c.grupoId === id)
    expect(cols.map((c) => c.chave)).toEqual(['frete_motorista', 'seguro', 'observacao'])
    const itens = nova.fichas.filter((f) => f.grupoId === id)
    expect(itens.map((f) => f.nome)).toEqual(['Carreta Simples - 5 Eixos', 'Truck'])
    const frete = cols.find((c) => c.chave === 'frete_motorista')!.id
    const obs = cols.find((c) => c.chave === 'observacao')!.id
    expect(itens[0].valores).toEqual({ [frete]: 2900, [obs]: 'pedágio incluso' })
  })
})

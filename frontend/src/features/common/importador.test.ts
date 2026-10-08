import { describe, expect, it } from 'vitest'
import { lerLinhas, texto, type ColunaImport, type LinhaMapeada } from './importador'

const colunas: ColunaImport[] = [
  { titulo: 'Descrição', obrigatoria: true },
  { titulo: 'Valor', obrigatoria: true },
  { titulo: 'Observação' },
]

const mapear = (l: Record<string, string>): LinhaMapeada<{ nome: string; valor: number }> => {
  const valor = Number(l['Valor'].replace(',', '.'))
  if (!Number.isFinite(valor)) return { erro: 'Valor inválido' }
  return { item: { nome: l['Descrição'], valor }, resumo: `${l['Descrição']} · ${valor}` }
}

const cabecalho = ['Descrição *', 'Valor *', 'Observação']

describe('texto', () => {
  it('converte data para yyyy-MM-dd e apara espaços', () => {
    expect(texto(new Date(Date.UTC(2026, 8, 4)))).toBe('2026-09-04')
    expect(texto('  Pro Labore ')).toBe('Pro Labore')
    expect(texto(null)).toBe('')
  })
})

describe('lerLinhas', () => {
  it('lê as linhas ignorando o "*" e as maiúsculas do cabeçalho', () => {
    const res = lerLinhas([cabecalho, ['Sistema', '100', 'mensal']], colunas, mapear)
    expect('linhas' in res && res.linhas).toEqual([
      { linha: 2, item: { nome: 'Sistema', valor: 100 }, resumo: 'Sistema · 100' },
    ])
  })

  it('reclama de coluna obrigatória faltando', () => {
    const res = lerLinhas([['Descrição'], ['Sistema']], colunas, mapear)
    expect('erro' in res && res.erro).toContain('Valor')
  })

  it('reclama de planilha sem linhas de dados', () => {
    const res = lerLinhas([cabecalho], colunas, mapear)
    expect('erro' in res && res.erro).toContain('não tem linhas de dados')
  })

  it('ignora linha vazia e marca a linha com erro sem derrubar o resto', () => {
    const res = lerLinhas(
      [cabecalho, ['Sistema', '100', ''], ['', '', ''], ['Quebrado', 'abc', '']],
      colunas,
      mapear,
    )
    if (!('linhas' in res)) throw new Error('esperava linhas')
    expect(res.linhas).toHaveLength(2)
    expect(res.linhas[0].item).toEqual({ nome: 'Sistema', valor: 100 })
    expect(res.linhas[1]).toMatchObject({ linha: 4, erro: 'Valor inválido' })
  })
})

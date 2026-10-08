import { describe, expect, it } from 'vitest'
import { filtrarPorColunas, listaTemStatus, semInativos } from './grid'
import type { Column } from './DataTable'

interface Linha {
  id: string
  nome: string
  cidade: string
  status: 'ativo' | 'inativo'
}

const linhas: Linha[] = [
  { id: '1', nome: 'Alfa Serviços', cidade: 'São Paulo - SP', status: 'ativo' },
  { id: '2', nome: 'Beta Tecnologia', cidade: 'Campinas - SP', status: 'inativo' },
  { id: '3', nome: 'Gama Consultoria', cidade: 'Belo Horizonte - MG', status: 'ativo' },
]

const colunas: Column<Linha>[] = [
  { header: 'Nome', cell: (l) => l.nome, valor: (l) => l.nome },
  { header: 'Cidade', cell: (l) => l.cidade, valor: (l) => l.cidade },
  { header: 'Ações', cell: () => null },
]

describe('grid genérico', () => {
  it('esconde inativos só quando a lista tem status ativo/inativo', () => {
    expect(listaTemStatus(linhas)).toBe(true)
    expect(semInativos(linhas).map((l) => l.id)).toEqual(['1', '3'])
    expect(listaTemStatus([{ id: 'x', status: 'aprovada' }])).toBe(false)
    expect(semInativos([{ id: 'x', status: 'aprovada' }])).toHaveLength(1)
  })

  it('filtra por coluna sem acento e sem maiúsculas', () => {
    expect(filtrarPorColunas(linhas, colunas, { Cidade: 'sao paulo' }).map((l) => l.id)).toEqual(['1'])
    expect(filtrarPorColunas(linhas, colunas, { Nome: 'TECNO' }).map((l) => l.id)).toEqual(['2'])
  })

  it('vários filtros somam (E), coluna sem valor é ignorada', () => {
    expect(filtrarPorColunas(linhas, colunas, { Nome: 'a', Cidade: 'SP' }).map((l) => l.id)).toEqual(['1', '2'])
    expect(filtrarPorColunas(linhas, colunas, { Ações: 'x' })).toHaveLength(3)
    expect(filtrarPorColunas(linhas, colunas, {})).toHaveLength(3)
  })
})

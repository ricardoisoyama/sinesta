import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { CrudList } from './CrudList'
import type { Column } from './DataTable'

interface Linha {
  id: string
  nome: string
  empresa: string
  valor: number
  status: 'ativo' | 'inativo'
}

const linhas: Linha[] = [
  { id: '1', nome: 'Aluguel', empresa: 'Matriz', valor: 100, status: 'ativo' },
  { id: '2', nome: 'Internet', empresa: 'Filial', valor: 50, status: 'ativo' },
  { id: '3', nome: 'Antigo', empresa: 'Filial', valor: 999, status: 'inativo' },
]

const colunas: Column<Linha>[] = [
  { header: 'Nome', valor: (l) => l.nome, cell: (l) => l.nome },
  { header: 'Empresa', valor: (l) => l.empresa, cell: (l) => l.empresa },
]

const total = (v: Linha[]) => (
  <output aria-label="total">{v.reduce((a, l) => a + l.valor, 0)}</output>
)

const montar = () =>
  render(
    <CrudList
      id="teste"
      query=""
      onQuery={() => {}}
      searchPlaceholder="Buscar"
      columns={colunas}
      rows={linhas}
      getKey={(l) => l.id}
      resumo={total}
    />,
  )

describe('CrudList · resumo acima do grid', () => {
  it('soma só o que está visível: sem os inativos escondidos', () => {
    montar()
    expect(screen.getByLabelText('total').textContent).toBe('150')
  })

  it('acompanha o filtro por coluna', () => {
    montar()
    fireEvent.click(screen.getByRole('button', { name: /Filtros/ }))
    const filtros = screen.getAllByPlaceholderText('Filtrar...')
    fireEvent.change(filtros[1], { target: { value: 'filial' } })
    expect(screen.getByLabelText('total').textContent).toBe('50')
  })

  it('inclui os inativos quando a pessoa pede para mostrá-los', () => {
    montar()
    fireEvent.click(screen.getByRole('checkbox', { name: /Mostrar inativos/ }))
    expect(screen.getByLabelText('total').textContent).toBe('1149')
  })
})

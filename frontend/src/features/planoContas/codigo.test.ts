import { describe, expect, it } from 'vitest'
import { contaContabilDoCodigo, sugerirCodigoConta, type PlanoConta } from './types'

const conta = (id: string, codigo: string, paiId: string | null, grupoDre: 'Receita' | 'Despesa'): PlanoConta => ({
  id,
  codigo,
  nome: id,
  paiId,
  grupoDre,
  status: 'ativo',
})

describe('sugerirCodigoConta (padrão Receita 1 / Despesa 2)', () => {
  it('base vazia: raiz de Receita é 1 e de Despesa é 2', () => {
    expect(sugerirCodigoConta([], null, 'Receita')).toBe('1')
    expect(sugerirCodigoConta([], null, 'Despesa')).toBe('2')
  })

  it('subcontas seguem a conta-pai com dois dígitos', () => {
    const contas = [conta('r', '1', null, 'Receita'), conta('d', '2', null, 'Despesa')]
    expect(sugerirCodigoConta(contas, 'd', 'Despesa')).toBe('2.01')
    const comGrupo = [...contas, conta('d1', '2.01', 'd', 'Despesa')]
    expect(sugerirCodigoConta(comGrupo, 'd', 'Despesa')).toBe('2.02')
    expect(sugerirCodigoConta(comGrupo, 'd1', 'Despesa')).toBe('2.01.01')
  })

  it('respeita a largura já usada pelas irmãs (plano importado com 3 dígitos)', () => {
    const contas = [
      conta('d', '3', null, 'Despesa'),
      conta('g', '3.01', 'd', 'Despesa'),
      conta('a', '3.01.001', 'g', 'Despesa'),
      conta('b', '3.01.002', 'g', 'Despesa'),
    ]
    expect(sugerirCodigoConta(contas, 'g', 'Despesa')).toBe('3.01.003')
  })

  it('raiz preferida ocupada: vai para o próximo número livre', () => {
    const contas = [conta('x', '2', null, 'Despesa'), conta('y', '3', null, 'Despesa')]
    expect(sugerirCodigoConta(contas, null, 'Despesa')).toBe('4')
  })

  it('conta contábil é o código sem pontos', () => {
    expect(contaContabilDoCodigo('2.01.01')).toBe('20101')
  })
})

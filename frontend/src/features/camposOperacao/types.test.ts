import { describe, expect, it } from 'vitest'
import { campoUfDaCidade, novoCampo, textoCidade } from './types'

const campo = (nome: string, tipo: Parameters<typeof novoCampo>[1]) => ({ ...novoCampo(nome, tipo), id: nome })

describe('cidade ligada ao campo de UF', () => {
  it('pares origem/destino: cada cidade usa a UF logo acima dela', () => {
    const campos = [campo('UF origem', 'uf'), campo('Cidade origem', 'cidade'), campo('UF destino', 'uf'), campo('Cidade destino', 'cidade')]
    expect(campoUfDaCidade(campos, campos[1])?.id).toBe('UF origem')
    expect(campoUfDaCidade(campos, campos[3])?.id).toBe('UF destino')
  })

  it('sem UF acima, usa a primeira abaixo; sem nenhuma, não filtra', () => {
    const campos = [campo('Cidade', 'cidade'), campo('Produto', 'texto'), campo('UF', 'uf')]
    expect(campoUfDaCidade(campos, campos[0])?.id).toBe('UF')
    const semUf = [campo('Cidade', 'cidade'), campo('Produto', 'texto')]
    expect(campoUfDaCidade(semUf, semUf[0])).toBeUndefined()
  })

  it('o valor da cidade sai como "UF - Cidade"', () => {
    expect(textoCidade('SP', 'São Paulo')).toBe('SP - São Paulo')
  })
})

import { describe, expect, it } from 'vitest'
import { mascaraChassi, mascaraPlaca, nomeVeiculo, placaFormatada, placaValida, soDigitos, sugestoesMarca, sugestoesModelo } from './types'
import { emptyVeiculo, veiculoSchema } from './veiculo-schema'

describe('placa do veículo', () => {
  it('aceita a antiga e a Mercosul, com ou sem hífen', () => {
    expect(placaValida('ABC1234')).toBe(true)
    expect(placaValida('abc-1234')).toBe(true)
    expect(placaValida('ABC1D23')).toBe(true)
    expect(placaValida('AB12345')).toBe(false)
    expect(placaValida('ABCD123')).toBe(false)
  })

  it('digitando: maiúsculas, sem hífen, até 7; na tela a antiga ganha hífen', () => {
    expect(mascaraPlaca('abc-12345')).toBe('ABC1234')
    expect(placaFormatada('ABC1234')).toBe('ABC-1234')
    expect(placaFormatada('ABC1D23')).toBe('ABC1D23')
  })

  it('cada posição só aceita o que cabe nela', () => {
    expect(mascaraPlaca('ABCDEFG')).toBe('ABC') // depois das 3 letras vem número
    expect(mascaraPlaca('123ABC')).toBe('ABC') // começa com letras
    expect(mascaraPlaca('ABC1DD23')).toBe('ABC1D23') // 2ª letra da Mercosul não cabe
    expect(mascaraPlaca('ABC1D2E3')).toBe('ABC1D23')
  })
})

describe('outras máscaras e sugestões', () => {
  it('Renavam e RNTRC só números; chassi sem I, O e Q', () => {
    expect(soDigitos('01a2.345-678 90x', 11)).toBe('01234567890')
    expect(mascaraChassi('9bw zzz-377 vt0042510')).toBe('9BWZZZ377VT004251')
    expect(mascaraChassi('IOQ123')).toBe('123')
  })

  it('marcas da lista e as já cadastradas; modelos filtrados pela marca', () => {
    const cadastrados = [{ marca: 'Sinotruk', modelo: 'Howo' }, { marca: 'volvo', modelo: 'FH 500' }]
    expect(sugestoesMarca(cadastrados)).toEqual(expect.arrayContaining(['Volvo', 'Scania', 'Sinotruk']))
    const volvo = sugestoesModelo('Volvo', cadastrados)
    expect(volvo).toEqual(expect.arrayContaining(['VM 270', 'FH 540', 'FH 500']))
    expect(volvo).not.toContain('R 450')
    expect(sugestoesModelo('', cadastrados)).toEqual(expect.arrayContaining(['R 450', 'Howo']))
  })

  it('nome nas listas: placa, tipo e modelo', () => {
    expect(nomeVeiculo({ placaTracao: 'ABC1234', tipoVeiculo: 'Toco', marca: 'Volvo', modelo: 'VM 270' })).toBe('ABC-1234 · Toco · Volvo VM 270')
  })

  it('o formulário exige placa válida e tipo', () => {
    expect(veiculoSchema.safeParse({ ...emptyVeiculo, placaTracao: 'ABC1D23', tipoVeiculo: 'Truck' }).success).toBe(true)
    expect(veiculoSchema.safeParse({ ...emptyVeiculo, tipoVeiculo: 'Truck' }).success).toBe(false)
    expect(veiculoSchema.safeParse({ ...emptyVeiculo, placaTracao: 'ABC1D23' }).success).toBe(false)
    expect(veiculoSchema.safeParse({ ...emptyVeiculo, placaTracao: 'ABC1D23', tipoVeiculo: 'Truck', renavam: '123' }).success).toBe(false)
  })
})

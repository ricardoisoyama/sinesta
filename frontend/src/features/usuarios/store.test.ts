import { describe, expect, it } from 'vitest'
import { toSalvar } from './store'
import { emptyUsuario } from './usuario-schema'

describe('toSalvar (funcionário)', () => {
  it('leva endereço, cidade e banco e tira o id', () => {
    const salvar = toSalvar({
      ...emptyUsuario,
      id: 'u1',
      cidade: 'Santos - SP',
      endereco: { ...emptyUsuario.endereco, cep: '11030-101', numero: '61' },
      banco: { ...emptyUsuario.banco, banco: '323', pix: '42034840810' },
    })
    expect(salvar).not.toHaveProperty('id')
    expect(salvar.cidade).toBe('Santos - SP')
    expect(salvar.endereco?.numero).toBe('61')
    expect(salvar.banco?.pix).toBe('42034840810')
    expect(salvar.senha).toBe('')
  })
})

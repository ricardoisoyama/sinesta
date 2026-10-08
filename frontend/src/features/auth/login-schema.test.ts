import { describe, it, expect } from 'vitest'
import { loginSchema } from './login-schema'

describe('loginSchema', () => {
  it('aceita credenciais válidas', () => {
    const result = loginSchema.safeParse({
      email: 'admin@elrond.com.br',
      password: 'elrond@2024',
    })
    expect(result.success).toBe(true)
  })

  it('rejeita e-mail inválido', () => {
    const result = loginSchema.safeParse({ email: 'invalido', password: '123456' })
    expect(result.success).toBe(false)
  })

  it('rejeita senha curta', () => {
    const result = loginSchema.safeParse({ email: 'a@b.com', password: '123' })
    expect(result.success).toBe(false)
  })
})

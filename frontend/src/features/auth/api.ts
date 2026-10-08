import { apiFetch } from '@/lib/api'
import type { LoginInput } from './login-schema'
import type { CurrentUser, LoginResponse } from './types'

/**
 * Autenticação real contra o backend .NET (Elrond.API).
 * Endpoints: POST /api/auth/login e GET /api/auth/me.
 * O token JWT é guardado no localStorage e injetado pelo apiFetch.
 */

export async function login(input: LoginInput): Promise<LoginResponse> {
  return apiFetch<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: input.email.trim(), password: input.password }),
  })
}

export async function getMe(): Promise<CurrentUser> {
  return apiFetch<CurrentUser>('/auth/me')
}

import { describe, it, expect, vi, afterEach } from 'vitest'
import { apiFetch, ApiError } from './api'

afterEach(() => {
  vi.restoreAllMocks()
  localStorage.clear()
})

describe('apiFetch', () => {
  it('retorna JSON em caso de sucesso', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ value: 42 }) }) as unknown as Response),
    )
    const data = await apiFetch<{ value: number }>('/teste')
    expect(data.value).toBe(42)
  })

  it('lança ApiError em caso de erro', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: false, status: 401, json: async () => ({ message: 'falhou' }) }) as unknown as Response),
    )
    await expect(apiFetch('/teste')).rejects.toBeInstanceOf(ApiError)
  })

  it('injeta o header Authorization quando há token', async () => {
    localStorage.setItem('token', 'abc')
    const spy = vi.fn(
      async (_url: string, _init?: RequestInit) =>
        ({ ok: true, status: 200, json: async () => ({}) }) as unknown as Response,
    )
    vi.stubGlobal('fetch', spy)
    await apiFetch('/teste')
    const headers = (spy.mock.calls[0]?.[1]?.headers ?? {}) as Record<string, string>
    expect(headers.Authorization).toBe('Bearer abc')
  })
})

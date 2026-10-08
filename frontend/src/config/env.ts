/** Configuração derivada das variáveis de ambiente (Vite). */
export const env = {
  /** URL base da API. Em dev cai no proxy do Vite. */
  apiUrl: import.meta.env.VITE_API_URL ?? '/api',
} as const

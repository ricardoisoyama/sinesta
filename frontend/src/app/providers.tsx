import { lazy, Suspense, type ReactNode } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { queryClient } from '@/lib/query-client'
import { AuthProvider } from '@/features/auth/auth-context'
import { UsuariosProvider } from '@/features/usuarios/store'
import { PlanoContasProvider } from '@/features/planoContas/store'
import { PropostasProvider } from '@/features/propostas/store'
import { CrmProvider } from '@/features/crm/store'

// Devtools do React Query: carregado só em desenvolvimento
// (em produção vira um no-op e é removido do bundle).
// Desligado temporariamente p/ apresentação — religar mudando para true.
const SHOW_DEVTOOLS = false
const ReactQueryDevtools = import.meta.env.DEV && SHOW_DEVTOOLS
  ? lazy(() =>
      import('@tanstack/react-query-devtools').then((m) => ({
        default: m.ReactQueryDevtools,
      })),
    )
  : (_props: { initialIsOpen?: boolean }) => null

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <UsuariosProvider>
            <PlanoContasProvider>
              <PropostasProvider>
                <CrmProvider>{children}</CrmProvider>
              </PropostasProvider>
            </PlanoContasProvider>
          </UsuariosProvider>
        </AuthProvider>
      </BrowserRouter>
      <Suspense fallback={null}>
        <ReactQueryDevtools initialIsOpen={false} />
      </Suspense>
    </QueryClientProvider>
  )
}

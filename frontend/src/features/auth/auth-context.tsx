import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { getMe, login as loginRequest } from './api'
import type { LoginInput } from './login-schema'
import type { CurrentUser } from './types'

interface AuthContextValue {
  user: CurrentUser | null
  isAuthenticated: boolean
  isLoading: boolean
  signIn: (input: LoginInput, voltarPara?: string) => Promise<void>
  signOut: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

/** Momento (ms) em que o token vence, lido do próprio JWT (campo exp). Null se não der para ler. */
function venceEm(token: string | null): number | null {
  if (!token) return null
  try {
    const corpo = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))) as { exp?: number }
    return corpo.exp ? corpo.exp * 1000 : null
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [user, setUser] = useState<CurrentUser | null>(null)
  // só fica "carregando" se houver token para validar
  const [isLoading, setIsLoading] = useState(() => !!localStorage.getItem('token'))

  // Hidrata a sessão a partir do token salvo
  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) return

    let active = true
    getMe()
      .then((u) => active && setUser(u))
      .catch(() => localStorage.removeItem('token'))
      .finally(() => active && setIsLoading(false))

    return () => {
      active = false
    }
  }, [])

  const signIn = async (input: LoginInput, voltarPara?: string) => {
    const res = await loginRequest(input)
    localStorage.setItem('token', res.token)
    setUser({ email: res.email, name: res.name, perfil: res.perfil, permissoes: res.permissoes })
    navigate(voltarPara || '/dashboard', { replace: true })
  }

  // A sessão vence na hora gravada no token (exp): nesse momento volta para o login com o aviso,
  // em vez de deixar as telas abertas e vazias (o servidor já recusaria tudo com 401).
  useEffect(() => {
    if (!user) return
    const vence = venceEm(localStorage.getItem('token'))
    if (!vence) return
    const expirar = () => {
      localStorage.removeItem('token')
      queryClient.clear()
      const voltar = encodeURIComponent(window.location.pathname + window.location.search)
      window.location.assign(`/login?expirou=1&voltar=${voltar}`)
    }
    const falta = vence - Date.now()
    if (falta <= 0) {
      expirar()
      return
    }
    // setTimeout não passa de ~24,8 dias; o token dura horas.
    const t = window.setTimeout(expirar, Math.min(falta, 2_000_000_000))
    // Notebook que dormiu: o timer atrasa; ao voltar para a aba, confere de novo.
    const aoVoltar = () => {
      if (document.visibilityState === 'visible' && Date.now() >= vence) expirar()
    }
    document.addEventListener('visibilitychange', aoVoltar)
    return () => {
      window.clearTimeout(t)
      document.removeEventListener('visibilitychange', aoVoltar)
    }
  }, [user, queryClient])

  const signOut = () => {
    localStorage.removeItem('token')
    setUser(null)
    // Limpa o cache de dados: quem entrar depois no mesmo navegador não vê listas do usuário anterior.
    queryClient.clear()
    navigate('/login', { replace: true })
  }

  return (
    <AuthContext.Provider
      value={{ user, isAuthenticated: !!user, isLoading, signIn, signOut }}
    >
      {children}
    </AuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth deve ser usado dentro de <AuthProvider>.')
  return ctx
}

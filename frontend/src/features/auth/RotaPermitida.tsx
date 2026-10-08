import type { ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { Lock } from 'lucide-react'
import { FUNCIONALIDADES } from '@/features/usuarios/funcionalidades'
import { useAuth } from './auth-context'
import ui from '@/features/common/ui.module.css'

/** Chaves de tela (as especiais não são rotas), da mais específica para a mais curta. */
const CHAVES_DE_TELA = FUNCIONALIDADES.filter((f) => !f.extra)
  .map((f) => f.key)
  .sort((a, b) => b.length - a.length)

/** Funcionalidade dona de um caminho (ex.: "/propostas/123/pdf" → "/propostas"). */
const chaveDaRota = (pathname: string): string | undefined =>
  CHAVES_DE_TELA.find((k) => pathname === k || pathname.startsWith(k + '/'))

/**
 * Bloqueia a tela para quem não tem a funcionalidade liberada, mesmo digitando a URL.
 * (O servidor também nega as escritas; aqui é para não expor a tela nem as listas.)
 */
export function RotaPermitida({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const { pathname } = useLocation()
  const chave = chaveDaRota(pathname)
  const permitido = !chave || !user?.permissoes || user.permissoes.includes(chave)
  if (permitido) return <>{children}</>

  return (
    <div className={ui.semAcesso} role="alert">
      <Lock />
      <div>
        <b>Você não tem acesso a esta tela.</b>
        <div>Peça a um gestor para liberar a funcionalidade em Cadastros › Funcionários e permissões.</div>
      </div>
    </div>
  )
}

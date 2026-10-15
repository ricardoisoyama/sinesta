import type { ReactNode } from 'react'
import { Lock } from 'lucide-react'
import { useAuth } from './auth-context'

/**
 * Tela que só abre com uma permissão (ex.: as telas em protótipo). Sem ela, mostra o aviso em vez
 * da tela: o menu já esconde o item, isto cobre quem chega pelo endereço.
 */
export function ExigePermissao({ chave, children }: { chave: string; children: ReactNode }) {
  const { user } = useAuth()
  const perms = user?.permissoes
  if (perms && !perms.includes(chave))
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '18px 20px', borderRadius: 12, background: '#fff', border: '1px solid #e6e3db', color: '#4b5a51', fontSize: 14 }}>
        <Lock size={16} /> Esta tela não está liberada para o seu usuário. Peça a quem administra o sistema.
      </div>
    )
  return <>{children}</>
}

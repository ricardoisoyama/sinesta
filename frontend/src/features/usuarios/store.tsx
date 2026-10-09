import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import type { Usuario } from './types'
import { createUsuario, listUsuarios, updateUsuario, type SalvarUsuario } from '@/features/cadastros/api'

const KEY = ['usuarios']

/**
 * O que vai para a API: o cadastro inteiro, menos o id (que vai na rota). Não lista campo a campo
 * de propósito: antes, campo novo do formulário (endereço, banco) ficava de fora e não era salvo.
 */
// eslint-disable-next-line react-refresh/only-export-components
export const toSalvar = (u: Omit<Usuario, 'id'> & { id?: string; senha?: string }): SalvarUsuario => {
  const dados = { ...u }
  delete dados.id
  return dados
}

/** Mantido por compatibilidade (o estado agora vem do react-query). */
export function UsuariosProvider({ children }: { children: ReactNode }) {
  return <>{children}</>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useUsuarios() {
  const qc = useQueryClient()
  const { data } = useQuery({ queryKey: KEY, queryFn: listUsuarios })
  const usuarios = data ?? []

  const inval = () => qc.invalidateQueries({ queryKey: KEY })
  const addM = useMutation({ mutationFn: (u: SalvarUsuario) => createUsuario(u), onSuccess: inval })
  const updM = useMutation({
    mutationFn: (v: { id: string; u: SalvarUsuario }) => updateUsuario(v.id, v.u),
    onSuccess: inval,
  })

  return {
    usuarios,
    add: (u: Usuario & { senha?: string }) => addM.mutateAsync(toSalvar(u)),
    update: (id: string, patch: Partial<Usuario> & { senha?: string }) => {
      const cur = usuarios.find((x) => x.id === id)
      if (!cur) return Promise.resolve()
      return updM.mutateAsync({ id, u: toSalvar({ ...cur, ...patch }) })
    },
  }
}

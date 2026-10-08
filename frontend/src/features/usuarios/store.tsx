import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import type { Usuario } from './types'
import { createUsuario, listUsuarios, updateUsuario, type SalvarUsuario } from '@/features/cadastros/api'

const KEY = ['usuarios']

const toSalvar = (u: Omit<Usuario, 'id'> & { senha?: string }): SalvarUsuario => ({
  nome: u.nome,
  email: u.email,
  perfil: u.perfil,
  permissoes: u.permissoes,
  status: u.status,
  senha: u.senha,
  cargo: u.cargo,
  departamento: u.departamento,
  cpf: u.cpf,
  rg: u.rg,
  telefone: u.telefone,
  dataAdmissao: u.dataAdmissao,
})

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

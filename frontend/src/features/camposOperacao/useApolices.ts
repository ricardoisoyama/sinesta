import { useQuery } from '@tanstack/react-query'
import { listFornecedores } from '@/features/cadastros/api'
import { listApolices } from '@/features/apolices/api'
import { hojeLocal } from '@/features/apolices/types'
import { apoliceVigente, type ApoliceDaSeguradora } from './advalorem'

/** Apólice vigente da empresa por tipo de seguro (lê apólices e seguradoras só quando precisa). */
export function useApolices(empresaId: string, habilitado: boolean): (tipo: string) => ApoliceDaSeguradora | undefined {
  const { data: apolices } = useQuery({ queryKey: ['apolices'], queryFn: listApolices, enabled: habilitado })
  const { data: fornecedores } = useQuery({ queryKey: ['fornecedores'], queryFn: listFornecedores, enabled: habilitado })
  const hoje = hojeLocal()
  return (tipo) => apoliceVigente(apolices ?? [], fornecedores ?? [], tipo, empresaId, hoje)
}

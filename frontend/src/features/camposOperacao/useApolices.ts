import { useQuery } from '@tanstack/react-query'
import { listFornecedores } from '@/features/cadastros/api'
import { listApolices } from '@/features/apolices/api'
import { hojeLocal } from '@/features/apolices/types'
import { apoliceVigente, type ApoliceDaSeguradora } from './advalorem'

/** Apólice vigente da empresa por tipo de seguro (lê apólices e seguradoras só quando precisa). */
export function useApolices(empresaId: string, habilitado: boolean): (tipo: string) => ApoliceDaSeguradora | undefined {
  return useApolicesCarregadas(empresaId, habilitado).apoliceDe
}

/** Igual, dizendo se já carregou (a primeira carga do ad valorem espera as apólices). */
export function useApolicesCarregadas(empresaId: string, habilitado: boolean) {
  const { data: apolices } = useQuery({ queryKey: ['apolices'], queryFn: listApolices, enabled: habilitado })
  const { data: fornecedores } = useQuery({ queryKey: ['fornecedores'], queryFn: listFornecedores, enabled: habilitado })
  const hoje = hojeLocal()
  const apoliceDe = (tipo: string): ApoliceDaSeguradora | undefined => apoliceVigente(apolices ?? [], fornecedores ?? [], tipo, empresaId, hoje)
  return { apoliceDe, carregadas: !!apolices && !!fornecedores }
}

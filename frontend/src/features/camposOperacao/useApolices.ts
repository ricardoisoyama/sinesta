import { useQuery } from '@tanstack/react-query'
import { listFornecedores } from '@/features/cadastros/api'
import { apoliceVigente, type ApoliceDaSeguradora } from './advalorem'

/** Data de hoje no fuso do navegador (yyyy-MM-dd), para comparar com a vigência das apólices. */
const hojeLocal = () => new Date().toLocaleDateString('sv-SE')

/** Apólice vigente da empresa por tipo de seguro (lê o cadastro de fornecedores só quando precisa). */
export function useApolices(empresaId: string, habilitado: boolean): (tipo: string) => ApoliceDaSeguradora | undefined {
  const { data } = useQuery({ queryKey: ['fornecedores'], queryFn: listFornecedores, enabled: habilitado })
  const hoje = hojeLocal()
  return (tipo) => apoliceVigente(data ?? [], tipo, empresaId, hoje)
}

import { useQuery } from '@tanstack/react-query'
import { listCustosFixos, listEmpresas, listTaxas } from './api'
import { hydrateEmpresas } from '@/features/unidades/mock'
import { hydrateTaxas } from '@/features/taxas/mock'
import { hydrateCustosFixos } from '@/features/custosFixos/mock'

/**
 * A hidratação dos arrays síncronos (mockUnidades etc.) acontece DENTRO do
 * queryFn: quando o react-query entrega os dados e re-renderiza quem assina,
 * os arrays já estão atualizados. Telas que leem os arrays devem assinar a
 * query correspondente para re-renderizar quando os dados chegarem.
 */
export const useEmpresasQuery = () =>
  useQuery({
    queryKey: ['empresas'],
    queryFn: async () => {
      const data = await listEmpresas()
      hydrateEmpresas(data)
      return data
    },
  })

export const useTaxasQuery = () =>
  useQuery({
    queryKey: ['taxas'],
    queryFn: async () => {
      const data = await listTaxas()
      hydrateTaxas(data)
      return data
    },
  })

export const useCustosFixosQuery = () =>
  useQuery({
    queryKey: ['custos-fixos'],
    queryFn: async () => {
      const data = await listCustosFixos()
      hydrateCustosFixos(data)
      return data
    },
  })

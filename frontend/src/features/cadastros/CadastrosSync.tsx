import { useCustosFixosQuery, useEmpresasQuery, useTaxasQuery } from './hooks'

/**
 * Mantém as queries de cadastros ativas após o login (a hidratação dos arrays
 * síncronos acontece no queryFn de cada hook). Não renderiza nada.
 */
export function CadastrosSync() {
  useEmpresasQuery()
  useTaxasQuery()
  useCustosFixosQuery()
  return null
}

import { useCustosFixosQuery, useEmpresasQuery, useTaxasQuery } from './hooks'
import { useFeriados } from '@/features/feriados/api'

/**
 * Mantém as queries de cadastros ativas após o login (a hidratação dos arrays
 * síncronos acontece no queryFn de cada hook). Não renderiza nada.
 */
export function CadastrosSync() {
  useEmpresasQuery()
  useTaxasQuery()
  useCustosFixosQuery()
  // Feriados do cadastro: o "atrasado" e os KPIs de vencidos contam só depois do dia útil.
  useFeriados()
  return null
}

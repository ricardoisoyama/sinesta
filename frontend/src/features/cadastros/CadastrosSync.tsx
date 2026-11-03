import { useEffect } from 'react'
import { useCustosFixosQuery, useEmpresasQuery, useTaxasQuery } from './hooks'
import { useFeriados } from '@/features/feriados/api'
import { definirCidadesEmpresas } from '@/features/financeiro/diasUteis'

/**
 * Mantém as queries de cadastros ativas após o login (a hidratação dos arrays
 * síncronos acontece no queryFn de cada hook). Não renderiza nada.
 */
export function CadastrosSync() {
  const { data: empresas } = useEmpresasQuery()
  // Feriado municipal: a cidade de cada empresa (Matriz e Filial podem ser de cidades diferentes).
  useEffect(() => {
    if (empresas) definirCidadesEmpresas(empresas)
  }, [empresas])
  useTaxasQuery()
  useCustosFixosQuery()
  // Feriados do cadastro: o "atrasado" e os KPIs de vencidos contam só depois do dia útil.
  useFeriados()
  return null
}

import { useState } from 'react'
import { useEmpresasQuery } from '@/features/cadastros/hooks'
import { empresaPadrao } from '@/features/unidades/types'

/** Empresa selecionada nas telas parametrizáveis. Começa na empresa padrão (ou na primeira ativa). */
export function useEmpresaAtiva() {
  const { data, isLoading } = useEmpresasQuery()
  const empresas = (data ?? []).filter((e) => e.status === 'ativo')
  const [escolhida, setEmpresaId] = useState('')
  const empresaId = empresas.some((e) => e.id === escolhida) ? escolhida : (empresaPadrao(empresas)?.id ?? '')
  const empresa = empresas.find((e) => e.id === empresaId)
  return { empresas, empresa, empresaId, setEmpresaId, carregando: isLoading }
}

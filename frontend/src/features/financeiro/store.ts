import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { Carteira, Movimento, Periodicidade } from './types'
import {
  aprovarMovimento,
  atualizarCarteira,
  atualizarMovimento,
  cancelarMovimentos,
  criarCarteira,
  criarMovimento,
  estornarMovimento,
  liquidarMovimentos,
  listCarteiras,
  listMovimentos,
  reprovarMovimento,
} from './api'

export interface Baixa {
  pagoEm: string
  carteiraId: string
  desconto?: number
  juros?: number
  multa?: number
}

export const CHAVE_MOVIMENTOS = ['financeiro', 'movimentos']
export const CHAVE_CARTEIRAS = ['financeiro', 'carteiras']

/**
 * Financeiro gravado no servidor (react-query). As ações devolvem promessas e lançam o erro
 * do servidor (ex.: "só lançamento aprovado pode ser baixado"); a tela mostra a mensagem.
 */
export function useFinanceiro() {
  const qc = useQueryClient()
  const mov = useQuery({ queryKey: CHAVE_MOVIMENTOS, queryFn: listMovimentos })
  const cart = useQuery({ queryKey: CHAVE_CARTEIRAS, queryFn: listCarteiras })
  const recarregar = () => qc.invalidateQueries({ queryKey: ['financeiro'] })
  const depois = async <T,>(p: Promise<T>): Promise<T> => {
    try {
      return await p
    } finally {
      await recarregar()
    }
  }

  return {
    carteiras: (cart.data ?? []).map((c) => ({ ...c, status: c.status ?? 'ativo' })) as Carteira[],
    movimentos: (mov.data ?? []).map((m) => ({ ...m, aprovacao: m.aprovacao ?? 'pendente', aprovacoes: m.aprovacoes ?? [] })),
    carregando: mov.isLoading || cart.isLoading,
    adicionar: (base: Movimento, parcelas = 1, periodicidade: Periodicidade = 'mensal') => depois(criarMovimento(base, parcelas, periodicidade)),
    atualizar: (m: Movimento) => depois(atualizarMovimento(m)),
    /** Baixa um ou vários lançamentos (só aprovados). */
    liquidar: (ids: string[], b: Baixa) => depois(liquidarMovimentos({ ids, ...b })),
    estornar: (id: string) => depois(estornarMovimento(id)),
    cancelar: (ids: string[]) => depois(cancelarMovimentos(ids)),
    aprovar: (id: string) => depois(aprovarMovimento(id)),
    reprovar: (id: string, motivo: string) => depois(reprovarMovimento(id, motivo)),
    salvarCarteira: (c: Carteira) => depois(c.id && (cart.data ?? []).some((x) => x.id === c.id) ? atualizarCarteira(c) : criarCarteira({ ...c, id: c.id || crypto.randomUUID() })),
    recarregar,
  }
}

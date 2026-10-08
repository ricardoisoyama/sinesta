import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import type { ItemProposta, Proposta, StatusProposta } from './types'
import {
  aprovarPropostaApi,
  atualizarItensApi,
  atualizarPropostaApi,
  criarPropostaApi,
  listPropostas,
  setStatusApi,
} from '@/features/cadastros/api'

const KEY = ['propostas']

/** Dados que a precificação envia ao gerar (ou pedir aprovação de) uma proposta. */
export interface NovaProposta {
  cliente: string
  clienteId?: string
  vendedorId?: string
  vendedorNome?: string
  itens: ItemProposta[]
  total: number
  modeloId?: string | null
  prazoEntrega?: string
  validade?: string
  formaPagamento?: string
  prazoPagamentoDias?: number
  /** Soma dos preços calculados, quando algum item teve o preço editado. */
  precoOriginal?: number
  /** Preenchida = a proposta nasce pendente de aprovação. */
  justificativa?: string
}

/** Mantido por compatibilidade (o estado agora vem do react-query). */
export function PropostasProvider({ children }: { children: ReactNode }) {
  return <>{children}</>
}

// eslint-disable-next-line react-refresh/only-export-components
export function usePropostas() {
  const qc = useQueryClient()
  const { data } = useQuery({ queryKey: KEY, queryFn: listPropostas })
  const inval = () => qc.invalidateQueries({ queryKey: KEY })

  const criarM = useMutation({
    mutationFn: (v: NovaProposta) => criarPropostaApi(v),
    onSuccess: inval,
  })

  const atualizarM = useMutation({
    mutationFn: (v: { id: string; dados: NovaProposta }) => atualizarPropostaApi(v.id, v.dados),
    onSuccess: inval,
  })

  const itensM = useMutation({
    mutationFn: (v: { id: string; itens: ItemProposta[] }) => atualizarItensApi(v.id, v.itens),
    onSuccess: inval,
  })

  const statusM = useMutation({
    mutationFn: (v: { id: string; status: StatusProposta }) => setStatusApi(v.id, v.status),
    onSuccess: inval,
  })

  const aprovarM = useMutation({ mutationFn: (id: string) => aprovarPropostaApi(id), onSuccess: inval })

  return {
    propostas: data ?? [],
    criarProposta: (nova: NovaProposta): Promise<Proposta> => criarM.mutateAsync(nova),
    /** Só rascunho: reescreve itens e condições mantendo número e data. */
    atualizarProposta: (id: string, dados: NovaProposta): Promise<Proposta> => atualizarM.mutateAsync({ id, dados }),
    setStatus: (id: string, status: StatusProposta) => statusM.mutateAsync({ id, status }),
    salvarItens: (id: string, itens: ItemProposta[]) => itensM.mutateAsync({ id, itens }),
    aprovar: (id: string) => aprovarM.mutateAsync(id),
  }
}

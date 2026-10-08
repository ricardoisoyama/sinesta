import { useEffect, useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { calcularFator, calcularPreco, type CalcularFatorRequest, type CalcularPrecoRequest, type CalcularPrecoResponse, type FatorResultado } from './api'

function useDebounced<T>(value: T, ms = 350): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return debounced
}

/**
 * Preço calculado pelo servidor (.NET = fonte da verdade), com debounce.
 * Retorna `undefined` até responder (o chamador usa o engine local como preview/fallback).
 */
export function usePrecoServidor(req: CalcularPrecoRequest, enabled: boolean): CalcularPrecoResponse | undefined {
  const key = JSON.stringify(req)
  const debouncedKey = useDebounced(key, 350)

  const { data } = useQuery({
    queryKey: ['pricing', debouncedKey],
    queryFn: () => calcularPreco(JSON.parse(debouncedKey) as CalcularPrecoRequest),
    enabled: enabled && debouncedKey.length > 0,
    // O fator depende de custos fixos, meta, impostos e lucro, que mudam em outras telas:
    // sempre recalcula ao voltar para a tela.
    staleTime: 0,
  })

  return data
}

/**
 * Motor do fator no servidor. Com `empresa` (rascunho do formulário), simula antes de salvar:
 * a tela da empresa recalcula enquanto se digita. Mantém o último resultado enquanto o novo chega.
 */
export function useFator(req: CalcularFatorRequest, enabled = true) {
  const key = JSON.stringify(req)
  const debouncedKey = useDebounced(key, 300)
  // Decide pelo pedido que vai sair (o do debounce): na abertura da tela a empresa chega antes
  // do debounce e o pedido antigo, ainda sem empresa, era enviado e voltava 400.
  const pedido = JSON.parse(debouncedKey) as CalcularFatorRequest
  const q = useQuery({
    queryKey: ['fator', debouncedKey],
    queryFn: () => calcularFator(pedido),
    enabled: enabled && (!!pedido.empresaId || !!pedido.empresa),
    staleTime: 0,
    placeholderData: keepPreviousData,
  })
  return { fator: q.data as FatorResultado | undefined, carregando: q.isFetching, erro: q.error }
}

/**
 * Fator da empresa no formato dos painéis (Dashboard, Break-even): a mesma conta do Pricing,
 * vinda do motor. Null enquanto carrega.
 */
export function useFatorEmpresa(empresaId: string) {
  const { fator: f } = useFator({ empresaId }, !!empresaId)
  if (!f) return null
  return {
    totalDF: f.totalDf,
    dfPct: f.dfPct,
    dvSem: f.dvSemLucro,
    dvCom: f.dvSemLucro + f.lucro,
    markup: f.markup,
    fator: f.fator,
    receita: f.faturamentoMensal,
    pronto: f.pronto,
    aviso: f.aviso,
  }
}

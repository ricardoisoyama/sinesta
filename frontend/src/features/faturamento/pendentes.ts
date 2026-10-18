import { useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'

/** CT-e ou minuta lido da SIIMP para faturar pelo ELROND (espelho de DocumentoFaturavel). */
export type SituacaoPendente = 'pendente' | 'faturado-siimp' | 'faturado-elrond' | 'incompleto' | 'cancelado'

export interface DocumentoFaturavel {
  id: string
  tipo: 'cte' | 'minuta'
  siimpId: number
  numero: string
  serie: string
  chave: string
  situacao: SituacaoPendente
  motivo: string
  empresaId: string
  emitenteCnpj: string
  emitenteNome: string
  tomadorNome: string
  tomadorDocumento: string
  clienteId: string
  criadoEm: string
  emissao: string
  valor: number
  descricao: string
  nfseNumero: string
  faturaSiimp: string
  faturaId: string
  lidoEm: string
}

export interface ResumoPendentes {
  lidos: number
  pendentes: number
  faturadosSiimp: number
  faturadosElrond: number
  incompletos: number
  cancelados: number
  semEmpresa: number
  semCliente: number
  faturasLidas: number
  /** Tomadores cadastrados como cliente com os dados da SIIMP nesta consulta. */
  clientesCriados: number
}

export interface SituacaoConsulta {
  rodando: boolean
  de: string
  ate: string
  etapa: string
  feito: number
  total: number
  iniciadaEm: string
  terminadaEm: string
  por: string
  erro: string
  resumo: ResumoPendentes | null
}

export const ROTULO_PENDENTE: Record<SituacaoPendente, string> = {
  pendente: 'A faturar',
  'faturado-siimp': 'Faturado na SIIMP',
  'faturado-elrond': 'Faturado no ELROND',
  incompleto: 'Incompleto',
  cancelado: 'Cancelado',
}

const base = '/faturamento-pendente'
const chave = (de: string, ate: string) => ['faturamento-pendente', de, ate]

export const listPendentes = (de: string, ate: string) => apiFetch<DocumentoFaturavel[]>(`${base}?de=${de}&ate=${ate}`)
export const situacaoConsulta = () => apiFetch<SituacaoConsulta>(`${base}/situacao`)
export const consultarSiimp = (de: string, ate: string) => apiFetch<SituacaoConsulta>(`${base}/consultar`, { method: 'POST', body: JSON.stringify({ de, ate }) })

export function usePendentes(de: string, ate: string) {
  return useQuery({ queryKey: chave(de, ate), queryFn: () => listPendentes(de, ate) })
}

/** Situação da consulta em segundo plano: enquanto roda, pergunta a cada 2 s; ao terminar, recarrega a lista. */
export function useSituacaoConsulta() {
  const qc = useQueryClient()
  return useQuery({
    queryKey: ['faturamento-pendente', 'situacao'],
    queryFn: async () => {
      const s = await situacaoConsulta()
      const antes = qc.getQueryData<SituacaoConsulta>(['faturamento-pendente', 'situacao'])
      if (antes?.rodando && !s.rodando) await qc.invalidateQueries({ queryKey: ['faturamento-pendente'], predicate: (q) => q.queryKey[1] !== 'situacao' })
      return s
    },
    refetchInterval: (q) => (q.state.data?.rodando ? 2000 : false),
  })
}

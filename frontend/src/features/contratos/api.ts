import { useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import type { ModeloContrato } from './modelos'
import type { CobrancaExtra, CondicoesContrato, ComponenteContrato, Contrato, ContratosEFaturas, DocumentoVinculado, ExtraContrato, Fatura, ItemEscopo, Modalidade } from './types'

/**
 * Contratos, Modelos de Contrato e Central de Faturamento (ContratosControllers.cs).
 * As características viajam como lista {apelido, valor} (número com ponto) e viram um mapa aqui.
 */
type Caracteristica = { apelido: string; valor: string }
type ContratoApi = Omit<Contrato, 'caracteristicas'> & { caracteristicas: Caracteristica[] }
type RespostaApi = { contratos: ContratoApi[]; faturas: Fatura[] }

const NUMERO = /^-?\d+(\.\d+)?$/
const deApi = (c: ContratoApi): Contrato => ({
  ...c,
  caracteristicas: Object.fromEntries(c.caracteristicas.map((x) => [x.apelido, NUMERO.test(x.valor) ? Number(x.valor) : x.valor])),
})
const paraApi = (m: Record<string, string | number>): Caracteristica[] =>
  Object.entries(m).filter(([, v]) => v !== '' && v !== undefined).map(([apelido, v]) => ({ apelido, valor: String(v) }))
const resposta = (r: RespostaApi): ContratosEFaturas => ({ contratos: r.contratos.map(deApi), faturas: r.faturas })
const J = (b: unknown) => JSON.stringify(b)

/** O que a tela manda ao criar ou alterar. Itens = o escopo que vale a partir de agora. */
export interface SalvarContrato {
  empresaId: string
  clienteId: string
  modeloId: string
  modalidade: Modalidade
  inicio: string
  fim: string
  condicoes: CondicoesContrato
  itens: ItemEscopo[]
  contato: string
  situacao?: string
  localServico: string
  propostaId?: string
  servicoId: string
  textoAdicionalNota: string
  caracteristicas: Record<string, string | number>
  componentes: ComponenteContrato[]
  aditivoDesde?: string
  aditivoMotivo?: string
}

const salvarCorpo = (d: SalvarContrato) => J({ ...d, caracteristicas: paraApi(d.caracteristicas) })

export const listContratos = async () => resposta(await apiFetch<RespostaApi>('/contratos'))
export const obterContrato = async (id: string) => resposta(await apiFetch<RespostaApi>(`/contratos/${id}`))
export const criarContrato = async (d: SalvarContrato) => deApi(await apiFetch<ContratoApi>('/contratos', { method: 'POST', body: salvarCorpo(d) }))
export const atualizarContrato = async (id: string, d: SalvarContrato) => deApi(await apiFetch<ContratoApi>(`/contratos/${id}`, { method: 'PUT', body: salvarCorpo(d) }))
export const lancarExtra = (id: string, e: Omit<ExtraContrato, 'id' | 'faturadoEm' | 'lancadoPor'>) => apiFetch<ContratoApi>(`/contratos/${id}/extras`, { method: 'POST', body: J(e) })
export const mudarCobrancaExtra = (id: string, extraId: string, cobranca: CobrancaExtra) => apiFetch<ContratoApi>(`/contratos/${id}/extras/${extraId}`, { method: 'PUT', body: J({ cobranca }) })
export const alternarComponente = (id: string, componenteId: string) => apiFetch<ContratoApi>(`/contratos/${id}/componentes/${componenteId}/alternar`, { method: 'POST' })
export const salvarDocumento = (id: string, d: DocumentoVinculado) => apiFetch<ContratoApi>(`/contratos/${id}/documentos`, { method: 'POST', body: J(d) })

export const listModelosContrato = () => apiFetch<ModeloContrato[]>('/modelos-contrato')
export const salvarModeloContrato = (m: ModeloContrato) =>
  m.id ? apiFetch<ModeloContrato>(`/modelos-contrato/${m.id}`, { method: 'PUT', body: J(m) }) : apiFetch<ModeloContrato>('/modelos-contrato', { method: 'POST', body: J(m) })

export type EtapaFatura = 'conferir' | 'devolver' | 'reenviar' | 'nf' | 'boleto' | 'recebimento'
export interface DadosEtapa {
  descontos?: number
  extrasFora?: string[]
  motivo?: string
  numero?: string
  data?: string
}
export const faturasDoMes = async (competencia: string) => resposta(await apiFetch<RespostaApi>(`/faturas?competencia=${competencia}`))
export const avancarFatura = (id: string, etapa: EtapaFatura, dados: DadosEtapa = {}) => apiFetch<Fatura>(`/faturas/${id}/${etapa}`, { method: 'POST', body: J(dados) })
export const conferirLote = (ids: string[]) => apiFetch<{ conferidas: number }>('/faturas/lote/conferir', { method: 'POST', body: J({ ids }) })

// ── hooks ──

const CHAVE = ['contratos'] as const
export const useContratos = () => useQuery({ queryKey: [...CHAVE, 'lista'], queryFn: listContratos })
export const useContrato = (id: string | undefined) => useQuery({ queryKey: [...CHAVE, 'um', id], queryFn: () => obterContrato(id!), enabled: !!id })
export const useFaturasDoMes = (competencia: string) => useQuery({ queryKey: [...CHAVE, 'faturas', competencia], queryFn: () => faturasDoMes(competencia) })
export const useModelosContrato = () => useQuery({ queryKey: ['modelos-contrato'], queryFn: listModelosContrato })

/** Mudou contrato ou fatura: as três telas (lista, pasta, Central) recarregam. */
export function useRecarregarContratos() {
  const qc = useQueryClient()
  return () => qc.invalidateQueries({ queryKey: CHAVE })
}

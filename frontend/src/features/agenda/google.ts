import { useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'

export interface StatusGoogle {
  /** O servidor tem as chaves do app ELROND no Google. */
  configurado: boolean
  conectado: boolean
  email: string
  /** ISO (UTC) da última leitura de alterações no Google. */
  ultimaSincronia: string
  ultimoErro: string
}

/** Evento da agenda pessoal do Google (só aparece para o próprio dono). */
export interface Ocupado {
  /** Id do evento no Google (para editar daqui). */
  id: string
  inicio: string
  fim: string
  diaInteiro: boolean
  titulo: string
  local: string
  /** Link do evento no Google Agenda. */
  link: string
  /** Falso em convite de outra pessoa (só o organizador muda). */
  podeEditar: boolean
  /** Ocorrência de um evento que se repete. */
  recorrente: boolean
  /** Link do Google Meet (vazio sem videoconferência). */
  linkReuniao: string
}

const BASE = '/integracoes/google'
const CHAVE = ['google-agenda', 'status']

export const statusGoogle = () => apiFetch<StatusGoogle>(`${BASE}/status`)
const pedirConexao = () => apiFetch<{ url: string }>(`${BASE}/conectar`)
const desconectarGoogle = () => apiFetch<void>(`${BASE}/desconectar`, { method: 'POST' })
const sincronizarGoogle = () => apiFetch<{ enviados: number }>(`${BASE}/sincronizar`, { method: 'POST' })
export const ocupadoGoogle = (de: string, ate: string) => apiFetch<Ocupado[]>(`${BASE}/ocupado?de=${de}&ate=${ate}`)

/** Situação da conexão e as ações (conectar leva o navegador para o Google). */
export function useGoogleAgenda() {
  const qc = useQueryClient()
  const q = useQuery({ queryKey: CHAVE, queryFn: statusGoogle, staleTime: 60_000 })
  const recarregar = () => qc.invalidateQueries({ queryKey: ['google-agenda'] })
  return {
    status: q.data,
    carregando: q.isLoading,
    conectar: async () => {
      const { url } = await pedirConexao()
      window.location.assign(url)
    },
    desconectar: async () => {
      await desconectarGoogle()
      await recarregar()
    },
    sincronizar: async () => {
      const r = await sincronizarGoogle()
      await Promise.all([recarregar(), qc.invalidateQueries({ queryKey: ['compromissos'] })])
      return r.enviados
    },
  }
}

/** Eventos do Google no período da tela (só com a conta conectada e na própria agenda). */
export function useOcupadoGoogle(de: string, ate: string, ligado: boolean) {
  const q = useQuery({ queryKey: ['google-agenda', 'ocupado', de, ate], queryFn: () => ocupadoGoogle(de, ate), enabled: ligado, staleTime: 120_000 })
  // Desligado (outra pessoa, filtro desmarcado) não mostra nada, nem o que ficou em cache.
  return ligado ? (q.data ?? []) : []
}

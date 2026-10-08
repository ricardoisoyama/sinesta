import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { createFunil, createOportunidade, listFunis, listOportunidades, updateFunil, updateOportunidade } from './api'
import type { Funil, Oportunidade } from './types'

const KEY_FUNIS = ['funis']
const KEY_OPS = ['oportunidades']

/** Mantido por compatibilidade (o estado agora vem do react-query / backend). */
export function CrmProvider({ children }: { children: ReactNode }) {
  return <>{children}</>
}

/** Registros antigos (do mock) podem vir sem os campos novos: completa com o padrão. */
const normalizarFunil = (f: Funil): Funil => ({
  ...f,
  horasAlerta: f.horasAlerta ?? 48,
  corCard: f.corCard ?? '',
  etapas: f.etapas ?? [],
  camposCustomizados: f.camposCustomizados ?? [],
  status: f.status ?? 'ativo',
})
const normalizarOp = (o: Oportunidade): Oportunidade => ({
  ...o,
  anotacoes: o.anotacoes ?? [],
  camposValores: o.camposValores ?? [],
  status: o.status ?? 'ativo',
})

/**
 * CRM persistido no backend. Nada é apagado: funil e card inativos saem das telas
 * (`funis`/`oportunidades` só trazem os ativos) mas ficam guardados com quem/quando.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useCrm() {
  const qc = useQueryClient()
  const funisQ = useQuery({ queryKey: KEY_FUNIS, queryFn: listFunis })
  const opsQ = useQuery({ queryKey: KEY_OPS, queryFn: listOportunidades })
  const todosFunis = (funisQ.data ?? []).map(normalizarFunil)
  const todasOportunidades = (opsQ.data ?? []).map(normalizarOp)
  const funis = todosFunis.filter((f) => f.status !== 'inativo')
  const oportunidades = todasOportunidades.filter((o) => o.status !== 'inativo')

  const invalFunis = () => qc.invalidateQueries({ queryKey: KEY_FUNIS })
  const invalOps = () => qc.invalidateQueries({ queryKey: KEY_OPS })

  const salvarFunilM = useMutation({
    mutationFn: async (funil: Funil) => {
      const existe = todosFunis.some((f) => f.id === funil.id)
      const salvo = existe ? await updateFunil(funil) : await createFunil(funil)
      // Etapa removida na edição: os cards órfãos voltam para a primeira etapa.
      const orfaos = oportunidades.filter((o) => o.funilId === funil.id && !funil.etapas.some((e) => e.id === o.etapaId))
      for (const o of orfaos)
        await updateOportunidade({ ...o, etapaId: funil.etapas[0].id, entrouNaEtapaEm: new Date().toISOString() })
      return salvo
    },
    onSuccess: () => {
      invalFunis()
      invalOps()
    },
  })
  const criarOpM = useMutation({ mutationFn: (op: Oportunidade) => createOportunidade(op), onSuccess: invalOps })
  const salvarOpM = useMutation({ mutationFn: (op: Oportunidade) => updateOportunidade(op), onSuccess: invalOps })

  /** Exclusão lógica do funil. Só com nenhum card ativo dentro e mantendo ao menos um funil ativo. */
  const inativarFunil = async (id: string): Promise<{ ok: boolean; motivo?: string }> => {
    const f = todosFunis.find((x) => x.id === id)
    if (!f) return { ok: false, motivo: 'Funil não encontrado.' }
    if (funis.length <= 1) return { ok: false, motivo: 'É preciso manter ao menos um funil ativo.' }
    if (oportunidades.some((o) => o.funilId === id))
      return { ok: false, motivo: 'Este funil tem oportunidades abertas. Mova, conclua ou arquive os cards antes de inativar.' }
    await salvarFunilM.mutateAsync({ ...f, status: 'inativo' })
    return { ok: true }
  }
  const reativarFunil = async (id: string) => {
    const f = todosFunis.find((x) => x.id === id)
    if (f) await salvarFunilM.mutateAsync({ ...f, status: 'ativo' })
  }

  const moverOportunidade = (id: string, etapaId: string) => {
    const o = oportunidades.find((x) => x.id === id)
    if (!o || o.etapaId === etapaId) return Promise.resolve(o)
    // Atualização otimista: o card muda de coluna na hora, antes de o servidor responder.
    qc.setQueryData<Oportunidade[]>(KEY_OPS, (lista) =>
      (lista ?? []).map((x) => (x.id === id ? { ...x, etapaId, entrouNaEtapaEm: new Date().toISOString() } : x)),
    )
    return salvarOpM.mutateAsync({ ...o, etapaId, entrouNaEtapaEm: new Date().toISOString() })
  }

  const salvarOportunidade = (op: Oportunidade) => {
    const atual = oportunidades.find((o) => o.id === op.id)
    const entrou = atual && atual.etapaId === op.etapaId ? atual.entrouNaEtapaEm : new Date().toISOString()
    return salvarOpM.mutateAsync({ ...op, entrouNaEtapaEm: entrou })
  }

  /** Arquivar = exclusão lógica do card (sai do kanban, fica no histórico com quem/quando). */
  const arquivarOportunidade = async (id: string) => {
    const o = todasOportunidades.find((x) => x.id === id)
    if (o) await salvarOpM.mutateAsync({ ...o, status: 'inativo' })
  }

  return {
    funis,
    todosFunis,
    oportunidades,
    carregando: funisQ.isLoading || opsQ.isLoading,
    salvarFunil: (funil: Funil) => salvarFunilM.mutateAsync(funil),
    inativarFunil,
    reativarFunil,
    moverOportunidade,
    novaOportunidade: (op: Oportunidade) => criarOpM.mutateAsync(op),
    salvarOportunidade,
    arquivarOportunidade,
  }
}

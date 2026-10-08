import { useEffect, useRef, useState } from 'react'
import { useQuery, useQueryClient, type QueryKey } from '@tanstack/react-query'
import { getErrorMessage } from '@/lib/api'

export type SituacaoSalvamento = 'salvo' | 'pendente' | 'salvando' | 'erro'

interface Opcoes<T> {
  chave: QueryKey
  carregar: () => Promise<T>
  salvar: (dados: T) => Promise<unknown>
  /** Espera depois da última alteração antes de gravar (ms). */
  atraso?: number
  habilitado?: boolean
}

/**
 * Edição "tipo planilha": a tela mexe num rascunho local e o hook grava sozinho um instante
 * depois da última alteração. O que vem do servidor não sobrescreve o que está sendo digitado.
 * Ao trocar de chave (ex.: outra empresa) ou sair da tela, grava o que estiver pendente.
 */
export function useSalvamentoAutomatico<T>({ chave, carregar, salvar, atraso = 900, habilitado = true }: Opcoes<T>) {
  const qc = useQueryClient()
  const q = useQuery({ queryKey: chave, queryFn: carregar, enabled: habilitado })
  const id = JSON.stringify(chave)
  const [rascunho, setRascunho] = useState<{ id: string; dados: T } | null>(null)
  const [situacao, setSituacao] = useState<SituacaoSalvamento>('salvo')
  const [erro, setErro] = useState('')

  const timer = useRef<number | undefined>(undefined)
  const pendente = useRef<{ dados: T; salvar: (d: T) => Promise<unknown>; chave: QueryKey } | null>(null)

  const gravar = async () => {
    const p = pendente.current
    if (!p) return
    pendente.current = null
    window.clearTimeout(timer.current)
    setSituacao('salvando')
    try {
      await p.salvar(p.dados)
      // Outras telas (a Precificação) passam a ler a versão nova; o rascunho desta continua valendo.
      qc.invalidateQueries({ queryKey: p.chave, refetchType: 'none' })
      setSituacao(pendente.current ? 'pendente' : 'salvo')
      setErro('')
    } catch (e) {
      // Volta para a fila: a próxima alteração (ou "Tentar de novo") grava tudo junto.
      pendente.current ??= p
      setSituacao('erro')
      setErro(getErrorMessage(e))
    }
  }

  const alterar = (dados: T) => {
    setRascunho({ id, dados })
    pendente.current = { dados, salvar, chave }
    setSituacao('pendente')
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(gravar, atraso)
  }

  // Trocou de empresa ou saiu da tela: grava o que ficou pendente na hora.
  useEffect(
    () => () => {
      if (pendente.current) {
        const p = pendente.current
        pendente.current = null
        window.clearTimeout(timer.current)
        p.salvar(p.dados).then(() => qc.invalidateQueries({ queryKey: p.chave })).catch(() => undefined)
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [id],
  )

  const dados: T | undefined = rascunho?.id === id ? rascunho.dados : q.data
  return { dados, alterar, situacao, erro, tentarDeNovo: gravar, carregando: q.isLoading, erroCarga: q.error ? getErrorMessage(q.error) : '' }
}

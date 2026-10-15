import { useSyncExternalStore } from 'react'
import { CONTRATOS_EXEMPLO } from './mock'
import { MODELOS_EXEMPLO, type ModeloContrato } from './modelos'
import type { AjusteFatura, VersaoFatura } from './faturas'
import type { Contrato } from './types'

/**
 * Estado do PROTÓTIPO (contratos, modelos e ajustes de fatura), compartilhado entre as telas e
 * guardado só neste navegador (localStorage). Some com "Restaurar os exemplos". Com o backend,
 * vira API; as telas não mudam.
 */
export interface EstadoPrototipo {
  versao: 2
  contratos: Contrato[]
  modelos: ModeloContrato[]
  ajustes: Record<string, AjusteFatura>
}

const CHAVE = 'elrond.prototipo.contratos.v2'
const inicial = (): EstadoPrototipo => ({ versao: 2, contratos: CONTRATOS_EXEMPLO, modelos: MODELOS_EXEMPLO, ajustes: {} })

function carregar(): EstadoPrototipo {
  try {
    const bruto = localStorage.getItem(CHAVE)
    if (bruto) {
      const e = JSON.parse(bruto) as EstadoPrototipo
      if (e.versao === 2 && Array.isArray(e.contratos)) return e
    }
  } catch {
    // armazenamento indisponível: começa dos exemplos
  }
  return inicial()
}

let estado = carregar()
const ouvintes = new Set<() => void>()

function definir(novo: EstadoPrototipo) {
  estado = novo
  try {
    localStorage.setItem(CHAVE, JSON.stringify(novo))
  } catch {
    // sem armazenamento: vale até recarregar a página
  }
  ouvintes.forEach((f) => f())
}

const assinar = (f: () => void) => {
  ouvintes.add(f)
  return () => ouvintes.delete(f)
}

export const usePrototipo = () => useSyncExternalStore(assinar, () => estado)

const agora = () => new Date().toISOString()

export const prototipo = {
  salvarContrato(c: Contrato) {
    const existe = estado.contratos.some((x) => x.id === c.id)
    definir({ ...estado, contratos: existe ? estado.contratos.map((x) => (x.id === c.id ? c : x)) : [...estado.contratos, c] })
  },
  atualizarContrato(id: string, fn: (c: Contrato) => Contrato) {
    definir({ ...estado, contratos: estado.contratos.map((x) => (x.id === id ? fn(x) : x)) })
  },
  salvarModelo(m: ModeloContrato) {
    const existe = estado.modelos.some((x) => x.id === m.id)
    definir({ ...estado, modelos: existe ? estado.modelos.map((x) => (x.id === m.id ? m : x)) : [...estado.modelos, m] })
  },
  /** Muda a fatura (etapa, NF, desconto...) e, se vier, registra a versão no histórico dela. */
  ajustarFatura(id: string, parcial: AjusteFatura, versao?: Omit<VersaoFatura, 'em'>) {
    const atual = estado.ajustes[id] ?? {}
    const versoes = versao ? [...(atual.versoes ?? []), { ...versao, em: agora() }] : atual.versoes
    definir({ ...estado, ajustes: { ...estado.ajustes, [id]: { ...atual, ...parcial, versoes } } })
  },
  ajustarFaturas(lista: { id: string; parcial: AjusteFatura; versao?: Omit<VersaoFatura, 'em'> }[]) {
    const ajustes = { ...estado.ajustes }
    for (const { id, parcial, versao } of lista) {
      const atual = ajustes[id] ?? {}
      ajustes[id] = { ...atual, ...parcial, versoes: versao ? [...(atual.versoes ?? []), { ...versao, em: agora() }] : atual.versoes }
    }
    definir({ ...estado, ajustes })
  },
  restaurarExemplos() {
    definir(inicial())
  },
}

/** Próximo número do contrato na numeração da empresa (prefixo customizável, como a proposta). */
export function proximoNumero(contratos: Contrato[], empresaId: string): string {
  const prefixo = empresaId === 'filial' ? 'MRF' : 'MIR'
  const usados = contratos.filter((c) => c.numero.startsWith(`${prefixo}-`)).map((c) => Number(c.numero.slice(prefixo.length + 1)) || 0)
  return `${prefixo}-${String(Math.max(0, ...usados) + 1).padStart(4, '0')}`
}

/** Identificador novo para registros do protótipo (fora dos componentes: Date.now não é puro). */
export const gerarId = (prefixo: string) => `${prefixo}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`

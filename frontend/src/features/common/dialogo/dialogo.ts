import type { ReactNode } from 'react'

/**
 * Confirmações e avisos no padrão visual do sistema, no lugar de window.confirm/alert
 * (a janela do navegador destoa da tela). Funciona fora de componentes também:
 *   if (!(await confirmar('Excluir?'))) return
 *   avisar('Não foi possível salvar.')
 * Quem desenha é o <DialogoHost/>, montado uma vez na raiz do app.
 */
export interface OpcoesDialogo {
  titulo?: string
  mensagem: ReactNode
  /** Texto do botão principal (padrão: "Confirmar" / "Entendi"). */
  confirmar?: string
  /** Texto do botão de voltar (padrão: "Cancelar"). */
  cancelar?: string
  /** Ação destrutiva (excluir, inativar): botão principal em vermelho e foco no Cancelar. */
  perigo?: boolean
}

export interface PedidoDialogo extends OpcoesDialogo {
  id: number
  tipo: 'confirmar' | 'avisar'
  responder: (ok: boolean) => void
}

let abrir: ((p: PedidoDialogo) => void) | null = null
let seq = 0

/** Usado pelo DialogoHost: liga (ou desliga, com null) quem exibe os pedidos. */
export function registrarHost(fn: ((p: PedidoDialogo) => void) | null) {
  abrir = fn
}

const opcoes = (o: string | OpcoesDialogo): OpcoesDialogo => (typeof o === 'string' ? { mensagem: o } : o)
const texto = (m: ReactNode) => (typeof m === 'string' ? m : '')

/** Pergunta e espera a resposta: true = confirmou. */
export function confirmar(o: string | OpcoesDialogo): Promise<boolean> {
  const op = opcoes(o)
  if (!abrir) return Promise.resolve(window.confirm(texto(op.mensagem)))
  return new Promise((responder) => abrir!({ ...op, id: ++seq, tipo: 'confirmar', responder }))
}

/** Avisa e espera o "Entendi" (pode ser ignorado com await ou não). */
export function avisar(o: string | OpcoesDialogo): Promise<void> {
  const op = opcoes(o)
  if (!abrir) {
    window.alert(texto(op.mensagem))
    return Promise.resolve()
  }
  return new Promise((ok) => abrir!({ ...op, id: ++seq, tipo: 'avisar', responder: () => ok() }))
}

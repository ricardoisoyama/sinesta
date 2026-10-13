import { useEffect, useState } from 'react'
import { AlertTriangle, HelpCircle, Info } from 'lucide-react'
import ui from '@/features/common/ui.module.css'
import { registrarHost, type PedidoDialogo } from './dialogo'
import s from './dialogo.module.css'

/** Exibe, um de cada vez, os pedidos de confirmar()/avisar(). Montado uma vez na raiz. */
export function DialogoHost() {
  const [fila, setFila] = useState<PedidoDialogo[]>([])

  useEffect(() => {
    registrarHost((p) => setFila((f) => [...f, p]))
    return () => registrarHost(null)
  }, [])

  const atual = fila[0]

  // Esc = Cancelar (no aviso, fecha).
  useEffect(() => {
    if (!atual) return
    const tecla = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.stopPropagation()
      atual.responder(false)
      setFila((f) => f.slice(1))
    }
    window.addEventListener('keydown', tecla, true)
    return () => window.removeEventListener('keydown', tecla, true)
  }, [atual])

  if (!atual) return null
  const responder = (ok: boolean) => {
    atual.responder(ok)
    setFila((f) => f.slice(1))
  }
  const ehAviso = atual.tipo === 'avisar'
  const Icone = atual.perigo ? AlertTriangle : ehAviso ? Info : HelpCircle
  const titulo = atual.titulo ?? (ehAviso ? 'Aviso' : 'Confirmar')

  return (
    <div className={s.fundo}>
      <div className={s.caixa} role="alertdialog" aria-modal="true" aria-labelledby={`dlg-${atual.id}`} key={atual.id}>
        <div className={s.topo}>
          <span className={`${s.icone} ${atual.perigo ? s.iconePerigo : ''}`}>
            <Icone />
          </span>
          <h3 id={`dlg-${atual.id}`}>{titulo}</h3>
        </div>
        <div className={s.mensagem}>{atual.mensagem}</div>
        <div className={s.rodape}>
          {!ehAviso && (
            <button type="button" className={`${ui.btn} ${ui.btnGhost}`} onClick={() => responder(false)} autoFocus={atual.perigo}>
              {atual.cancelar ?? 'Cancelar'}
            </button>
          )}
          <button
            type="button"
            className={`${ui.btn} ${atual.perigo ? s.btnPerigo : ui.btnPrimary}`}
            onClick={() => responder(true)}
            autoFocus={!atual.perigo}
          >
            {atual.confirmar ?? (ehAviso ? 'Entendi' : 'Confirmar')}
          </button>
        </div>
      </div>
    </div>
  )
}

import { useState, type ReactNode } from 'react'
import { X, AlertTriangle, Maximize2, Minimize2 } from 'lucide-react'
import styles from './Modal.module.css'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  subtitle?: string
  icon?: ReactNode
  footer?: ReactNode
  children: ReactNode
  /** largura máxima em px (padrão 920) */
  maxWidth?: number
  /** mensagem de erro exibida acima do rodapé (ex.: falha ao salvar) */
  error?: string | null
  /** true enquanto grava: trava os botões do rodapé (evita duplicar no clique duplo) */
  busy?: boolean
  /**
   * Botão de maximizar ao lado do X (padrão: sim, em todos os modais). Maximizado, o
   * modal ocupa a tela toda em altura; o conteúdo fica com largura limitada e
   * centralizado, para os campos não virarem faixas em monitores largos.
   */
  maximizavel?: boolean
}

/**
 * Modal SÓLIDO: clicar no fundo (backdrop) NÃO fecha — só o X ou os botões do rodapé.
 * Evita fechar sem querer e perder o que foi digitado.
 */
export function Modal({
  open,
  onClose,
  title,
  subtitle,
  icon,
  footer,
  children,
  maxWidth = 920,
  error,
  busy,
  maximizavel = true,
}: ModalProps) {
  const [maximizado, setMaximizado] = useState(false)
  // Ao reabrir, volta ao tamanho normal (padrão "ajustar estado quando a prop muda").
  const [abriuEm, setAbriuEm] = useState(open)
  if (open !== abriuEm) {
    setAbriuEm(open)
    if (open) setMaximizado(false)
  }

  if (!open) return null
  const cheio = maximizavel && maximizado

  return (
    <div className={`${styles.backdrop} ${cheio ? styles.backdropCheio : ''}`}>
      <div
        className={`${styles.modal} ${cheio ? styles.modalCheio : ''}`}
        style={cheio ? undefined : { maxWidth }}
        role="dialog"
        aria-modal="true"
      >
        <div className={styles.head}>
          <div className={styles.headLeft}>
            {icon && <div className={styles.icon}>{icon}</div>}
            <div>
              <h3>{title}</h3>
              {subtitle && <div className={styles.sub}>{subtitle}</div>}
            </div>
          </div>
          <div className={styles.headBtns}>
            {maximizavel && (
              <button
                className={styles.x}
                onClick={() => setMaximizado((v) => !v)}
                aria-label={maximizado ? 'Restaurar tamanho' : 'Maximizar'}
                title={maximizado ? 'Restaurar tamanho' : 'Maximizar'}
              >
                {maximizado ? <Minimize2 /> : <Maximize2 />}
              </button>
            )}
            <button className={styles.x} onClick={onClose} aria-label="Fechar">
              <X />
            </button>
          </div>
        </div>
        <div className={styles.body}>
          <div className={cheio ? styles.conteudoCheio : undefined}>{children}</div>
        </div>
        {error && (
          <div className={styles.errorBar} role="alert">
            <AlertTriangle />
            <span>{error}</span>
          </div>
        )}
        {footer && (
          <div className={styles.foot}>
            {/* fieldset desabilitado trava todos os botões do rodapé de uma vez */}
            <fieldset className={styles.footFields} disabled={busy}>{footer}</fieldset>
          </div>
        )}
      </div>
    </div>
  )
}

import type { ReactNode } from 'react'
import { Hint } from './Hint'
import ui from './ui.module.css'

interface FieldProps {
  label: string
  req?: boolean
  error?: string
  className?: string
  /** Explicação do campo, exibida num balão ao lado do rótulo. */
  hint?: string
  children: ReactNode
}

export function Field({ label, req, error, className, hint, children }: FieldProps) {
  return (
    <div className={`${ui.field} ${error ? ui.fieldError : ''} ${className ?? ''}`}>
      <label>
        {label}
        {req && <span className={ui.req}>*</span>}
        {hint && <Hint text={hint} />}
      </label>
      {children}
      {error && <span className={ui.errMsg}>{error}</span>}
    </div>
  )
}

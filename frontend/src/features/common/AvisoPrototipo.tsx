import type { ReactNode } from 'react'
import { FlaskConical } from 'lucide-react'
import s from './prototipo.module.css'

/** Faixa das telas em protótipo: deixa claro que os dados são de exemplo e nada é gravado. */
export function AvisoPrototipo({ children }: { children?: ReactNode }) {
  return (
    <div className={s.faixa} role="note">
      <FlaskConical size={15} />
      <span>
        <b>Protótipo</b> · {children ?? 'dados de exemplo; nada é gravado. Serve para aprovar o layout antes do backend.'}
      </span>
    </div>
  )
}

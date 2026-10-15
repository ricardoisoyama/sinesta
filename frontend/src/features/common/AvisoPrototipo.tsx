import type { ReactNode } from 'react'
import { FlaskConical } from 'lucide-react'
import s from './prototipo.module.css'

/** Faixa das telas em protótipo: deixa claro que os dados são de exemplo e nada é gravado. */
export function AvisoPrototipo({ children, onRestaurar }: { children?: ReactNode; onRestaurar?: () => void }) {
  return (
    <div className={s.faixa} role="note">
      <FlaskConical size={15} />
      <span>
        <b>Protótipo</b> · {children ?? 'dados de exemplo; nada é gravado. Serve para aprovar o layout antes do backend.'}
      </span>
      {onRestaurar && (
        <button type="button" className={s.restaurar} onClick={onRestaurar}>
          Restaurar os exemplos
        </button>
      )}
    </div>
  )
}

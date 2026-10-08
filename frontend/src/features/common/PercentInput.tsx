import { useState, type ChangeEvent, type FocusEvent } from 'react'
import { formatNumberBRL } from '@/lib/format'
import { parseDigitado } from '@/lib/numero'
import s from './PercentInput.module.css'

interface PercentInputProps {
  /** Valor em fração (0,11 = 11%). */
  value: number
  onChange: (frac: number) => void
  invalid?: boolean
  /** Só leitura (ex.: total que vem da soma de outros campos). */
  disabled?: boolean
}

/**
 * Campo percentual com digitação natural: "11" vira 11,00% e "7,5" vira 7,50%.
 * Exibe em percentual e guarda em fração (0,11).
 */
export function PercentInput({ value, onChange, invalid, disabled }: PercentInputProps) {
  const [texto, setTexto] = useState<string | null>(null)
  const pct = (value || 0) * 100
  const exibido = texto ?? (pct ? formatNumberBRL(pct) : '')

  const onFocus = (e: FocusEvent<HTMLInputElement>) => {
    setTexto(pct ? formatNumberBRL(pct) : '')
    window.setTimeout(() => e.target.select(), 0)
  }

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const limpo = e.target.value.replace(/[^\d.,]/g, '')
    setTexto(limpo)
    onChange(parseDigitado(limpo) / 100)
  }

  return (
    <div className={`${s.pct} ${invalid ? s.invalid : ''}`}>
      <input
        value={exibido}
        onChange={handleChange}
        onFocus={onFocus}
        onBlur={() => setTexto(null)}
        inputMode="decimal"
        placeholder="0,00"
        disabled={disabled}
      />
      <span>%</span>
    </div>
  )
}

import { useState, type ChangeEvent, type FocusEvent } from 'react'
import { formatNumberBRL } from '@/lib/format'
import { parseDigitado } from '@/lib/numero'
import s from './MoneyInput.module.css'

interface MoneyInputProps {
  value: number
  onChange: (n: number) => void
  invalid?: boolean
  placeholder?: string
}

/**
 * Campo monetário com digitação natural: "1000" vira R$ 1.000,00 e "1000,50"
 * mantém os centavos. Enquanto o campo está em foco o texto fica como o usuário
 * digitou; ao sair, é formatado. (A máscara antiga preenchia por centavos e o
 * cliente entendia que o sistema "acrescentava zeros".)
 */
export function MoneyInput({ value, onChange, invalid, placeholder = '0,00' }: MoneyInputProps) {
  // null = não está editando: mostra o valor formatado vindo do pai.
  const [texto, setTexto] = useState<string | null>(null)

  const exibido = texto ?? (value ? formatNumberBRL(value) : '')

  const onFocus = (e: FocusEvent<HTMLInputElement>) => {
    setTexto(value ? formatNumberBRL(value) : '')
    // Seleciona tudo: digitar por cima substitui o valor antigo.
    window.setTimeout(() => e.target.select(), 0)
  }

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const limpo = e.target.value.replace(/[^\d.,]/g, '')
    setTexto(limpo)
    onChange(parseDigitado(limpo))
  }

  return (
    <div className={`${s.money} ${invalid ? s.invalid : ''}`}>
      <span>R$</span>
      <input
        value={exibido}
        onChange={handleChange}
        onFocus={onFocus}
        onBlur={() => setTexto(null)}
        inputMode="decimal"
        placeholder={placeholder}
      />
    </div>
  )
}

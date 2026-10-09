import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import ui from '@/features/common/ui.module.css'
import { getErrorMessage } from '@/lib/api'
import { formatCep } from '@/lib/format'
import { consultarCep, type CepConsulta } from './consultas'

interface Props {
  value: string
  onChange: (cep: string) => void
  /** Chamado quando o CEP é encontrado: quem usa decide o que preencher (rua, bairro, cidade). */
  onEncontrado: (endereco: CepConsulta) => void
  id?: string
}

/**
 * Campo de CEP com consulta automática: ao completar os 8 números, busca o endereço (com mini
 * loader dentro do campo) e entrega o resultado. Erro aparece embaixo; sucesso não mostra nada.
 */
export function CampoCep({ value, onChange, onEncontrado, id }: Props) {
  const [buscando, setBuscando] = useState(false)
  const [erro, setErro] = useState('')

  const buscar = async (cep: string) => {
    if (cep.replace(/\D/g, '').length !== 8) return
    setErro('')
    setBuscando(true)
    try {
      onEncontrado(await consultarCep(cep))
    } catch (err) {
      setErro(getErrorMessage(err).replace(/^Não foi possível salvar \(\d+\)\. /, ''))
    } finally {
      setBuscando(false)
    }
  }

  return (
    <>
      <div className={ui.comLoader}>
        <input
          id={id}
          value={value}
          onChange={(e) => {
            const cep = formatCep(e.target.value)
            onChange(cep)
            buscar(cep)
          }}
          placeholder="00000-000"
          inputMode="numeric"
          maxLength={9}
          aria-busy={buscando}
        />
        {buscando && <Loader2 className={ui.loaderCampo} aria-label="Consultando o CEP" />}
      </div>
      {erro && <span className={ui.errMsg}>{erro}</span>}
    </>
  )
}

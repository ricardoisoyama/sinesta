import { Store } from 'lucide-react'
import { ParceirosPage } from './ParceirosPage'

export function FornecedoresPage() {
  return (
    <ParceirosPage
      recurso="fornecedores"
      titulo="Fornecedores"
      subtitulo="Quem emite as despesas do negócio, vinculado às despesas fixas."
      botao="Novo fornecedor"
      singular="Fornecedor"
      icon={Store}
    />
  )
}

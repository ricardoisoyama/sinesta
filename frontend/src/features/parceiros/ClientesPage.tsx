import { Contact } from 'lucide-react'
import { ParceirosPage } from './ParceirosPage'

export function ClientesPage() {
  return (
    <ParceirosPage
      recurso="clientes"
      titulo="Clientes"
      subtitulo="Empresas e pessoas atendidas, usadas nas propostas e no CRM."
      botao="Novo cliente"
      singular="Cliente"
      icon={Contact}
    />
  )
}

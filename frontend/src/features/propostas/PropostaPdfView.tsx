import { useQuery } from '@tanstack/react-query'
import { useEmpresasQuery } from '@/features/cadastros/hooks'
import { listVendedores } from '@/features/cadastros/api'
import { useUsuarios } from '@/features/usuarios/store'
import type { ModeloProposta } from '@/features/modelosProposta/types'
import { PaginaView, type ContatoProposta } from './PaginaView'
import type { Proposta } from './types'

/**
 * Documento completo da proposta: uma folha A4 por página do modelo. O responsável é dinâmico:
 * o vendedor da proposta; sem vendedor, quem a gerou. E-mail e telefone vêm do cadastro da
 * pessoa e, faltando, do contato padrão do modelo.
 */
export function PropostaPdfView({ modelo, proposta, exemplo = false }: { modelo: ModeloProposta; proposta: Proposta; exemplo?: boolean }) {
  const { data: empresas } = useEmpresasQuery()
  const { data: vendedores } = useQuery({ queryKey: ['vendedores'], queryFn: listVendedores, enabled: !exemplo })
  const { usuarios } = useUsuarios()
  const empresaId = modelo.empresaId || proposta.itens[0]?.empresaId
  const logo = (empresas ?? []).find((u) => u.id === empresaId)?.logo || '/sinesta-logo.png'

  const vendedor = (vendedores ?? []).find((v) => v.id === proposta.vendedorId)
  const usuario = vendedor?.usuarioId
    ? usuarios.find((u) => u.id === vendedor.usuarioId)
    : usuarios.find((u) => u.nome === proposta.criadoPor)
  const contato: ContatoProposta | undefined = exemplo
    ? undefined
    : {
        nome: vendedor?.nome || proposta.vendedorNome || usuario?.nome || proposta.criadoPor || modelo.responsavel,
        email: vendedor?.email || usuario?.email || modelo.email,
        telefone: vendedor?.telefone || usuario?.telefone || modelo.telefone,
      }

  return (
    <>
      {modelo.paginas.map((p, i) => (
        <PaginaView key={p.id} pagina={p} modelo={modelo} proposta={proposta} logo={logo} numero={i + 1} total={modelo.paginas.length} contato={contato} />
      ))}
    </>
  )
}

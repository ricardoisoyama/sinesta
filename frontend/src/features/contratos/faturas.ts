import { useQuery } from '@tanstack/react-query'
import { useEmpresasQuery } from '@/features/cadastros/hooks'
import { listServicos } from '@/features/cadastros/api'
import { listCarteiras } from '@/features/financeiro/api'
import { travada } from './regras'
import type { Contrato, Fatura, Modalidade } from './types'

/** Fatura como a Central e a pasta mostram: a fatura do servidor + o que vem do contrato e dos cadastros. */
export interface FaturaCentral extends Fatura {
  numero: string
  clienteNome: string
  tipoOperacao: string
  empresaNome: string
  modalidade: Modalidade
  servicoNome: string
  textoAdicionalNota: string
  carteiraNome: string
  formaCobranca: string
  /** Frete com CT-e: o documento fiscal já sai na viagem; não emite NFS-e. */
  documentoDaOperacao: boolean
  /** NF registrada: não recalcula mais. */
  travada: boolean
  /** Documentos do contrato: sem nota fiscal (só a fatura) e/ou sem boleto (Pix, transferência). */
  semNotaFiscal: boolean
  semBoleto: boolean
}

/** Nomes dos cadastros que a fatura e o contrato só guardam pelo id. */
export interface Nomes {
  empresa: (id: string) => string
  servico: (id: string) => string
  carteira: (id: string) => string
}

export function useNomes(): Nomes {
  const { data: empresas } = useEmpresasQuery()
  const { data: servicos } = useQuery({ queryKey: ['servicos'], queryFn: listServicos })
  const { data: carteiras } = useQuery({ queryKey: ['carteiras'], queryFn: listCarteiras })
  const nome = (lista: { id: string; nome: string }[] | undefined, id: string, vazio: string) => (id ? lista?.find((x) => x.id === id)?.nome ?? '…' : vazio)
  return {
    empresa: (id) => nome(empresas, id, '—'),
    servico: (id) => nome(servicos, id, 'nenhum escolhido'),
    carteira: (id) => nome(carteiras, id, 'nenhuma escolhida'),
  }
}

export function paraCentral(f: Fatura, c: Contrato, nomes: Nomes): FaturaCentral {
  return {
    ...f,
    numero: c.numero,
    clienteNome: c.clienteNome,
    tipoOperacao: c.tipoOperacao,
    empresaNome: nomes.empresa(c.empresaId),
    modalidade: c.modalidade,
    servicoNome: nomes.servico(c.servicoId),
    textoAdicionalNota: c.textoAdicionalNota,
    carteiraNome: nomes.carteira(c.condicoes.carteiraId),
    formaCobranca: c.condicoes.formaCobranca,
    documentoDaOperacao: f.documentos.some((d) => d.tipo === 'CT-e'),
    travada: travada(f),
    semNotaFiscal: !!c.condicoes.semNotaFiscal,
    semBoleto: !!c.condicoes.semBoleto,
  }
}

/** As faturas (não canceladas) prontas para a tela, na ordem do vencimento. */
export function faturasCentrais(contratos: Contrato[], faturas: Fatura[], nomes: Nomes): FaturaCentral[] {
  const porId = new Map(contratos.map((c) => [c.id, c]))
  return faturas
    .filter((f) => f.situacao !== 'cancelada' && porId.has(f.contratoId))
    .map((f) => paraCentral(f, porId.get(f.contratoId)!, nomes))
    .sort((a, b) => a.vencimento.localeCompare(b.vencimento))
}

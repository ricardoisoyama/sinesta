import { CONTRATOS_EXEMPLO } from '@/features/contratos/mock'
import { escopoVigente, extrasPendentes, mesAnoCurto, valorExtra } from '@/features/contratos/regras'
import type { Contrato, ExtraContrato, Modalidade, SituacaoFatura } from '@/features/contratos/types'

/**
 * Fatura como a Central enxerga (protótipo): a do mês de cada contrato recorrente, a de cada spot
 * e a de cada extra marcado para faturar separado. Montada a partir dos contratos de exemplo.
 */
export interface FaturaCentral {
  id: string
  contratoId: string
  numero: string
  clienteNome: string
  tipoOperacao: string
  empresaId: string
  empresaNome: string
  modalidade: Modalidade
  /** Fatura de um extra cobrado separado do contrato. */
  avulsa: boolean
  descricao: string
  competencia: string
  /** O que está sendo cobrado: "set/2026" (mês anterior), a data do spot... */
  referencia: string
  vencimento: string
  previsto: number
  extras: ExtraContrato[]
  descontos: number
  situacao: SituacaoFatura
  nf?: string
  boleto?: string
  servicoNfse: string
  servicoNfseDetalhe: string
  /** Transporte: o documento fiscal (CT-e) já sai na viagem; não emite NFS-e. */
  documentoDaOperacao: boolean
  carteira: string
  formaCobranca: string
  itens: number
}

const mesAnterior = (comp: string) => {
  const [a, m] = comp.split('-').map(Number)
  const d = new Date(a, m - 2, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

const base = (c: Contrato) => ({
  contratoId: c.id,
  numero: c.numero,
  clienteNome: c.clienteNome,
  tipoOperacao: c.tipoOperacao,
  empresaId: c.empresaId,
  empresaNome: c.empresaNome,
  modalidade: c.modalidade,
  servicoNfse: c.servicoNfse,
  servicoNfseDetalhe: c.servicoNfseDetalhe,
  documentoDaOperacao: c.servicoNfse.includes('CT-e'),
  carteira: c.condicoes.carteira,
  formaCobranca: c.condicoes.formaCobranca,
})

/** Faturas da competência (yyyy-MM) em todos os contratos. */
export function faturasDoMes(competencia: string, hoje: string): FaturaCentral[] {
  const lista: FaturaCentral[] = []
  for (const c of CONTRATOS_EXEMPLO) {
    const escopo = escopoVigente(c, `${competencia}-01` < c.inicio ? c.inicio : `${competencia}-01`)
    for (const f of c.faturas.filter((x) => x.competencia === competencia)) {
      // A fatura do mês corrente leva os extras "na próxima fatura" ainda não faturados.
      const extras = competencia === hoje.slice(0, 7) ? extrasPendentes(c).filter((e) => e.cobranca === 'proxima-fatura') : []
      lista.push({
        ...base(c),
        id: f.id,
        avulsa: false,
        descricao: c.modalidade === 'spot' ? escopo.itens[0]?.descricao ?? 'Serviço spot' : `Mensalidade · ${escopo.itens.length} ite${escopo.itens.length === 1 ? 'm' : 'ns'}`,
        competencia,
        referencia: c.modalidade === 'spot' ? `dia ${c.inicio.slice(8, 10)}/${c.inicio.slice(5, 7)}` : c.condicoes.referencia === 'mes-anterior' ? mesAnoCurto(mesAnterior(competencia)) : mesAnoCurto(competencia),
        vencimento: f.vencimento,
        previsto: f.previsto,
        extras,
        descontos: f.descontos,
        situacao: f.situacao,
        nf: f.nf ?? (c.servicoNfse.includes('CT-e') ? c.documentos.find((d) => d.tipo === 'cte')?.nome.replace('.xml', '') : undefined),
        boleto: f.boleto,
        itens: escopo.itens.length,
      })
    }
    // Extras "faturar separado" viram uma fatura própria no mês em que foram lançados.
    for (const e of extrasPendentes(c).filter((x) => x.cobranca === 'separado' && x.data.slice(0, 7) === competencia)) {
      lista.push({
        ...base(c),
        id: `x-${e.id}`,
        avulsa: true,
        descricao: e.descricao,
        competencia,
        referencia: `extra de ${e.data.slice(8, 10)}/${e.data.slice(5, 7)}`,
        vencimento: `${competencia}-28`,
        previsto: valorExtra(e),
        extras: [],
        descontos: 0,
        situacao: 'a-conferir',
        documentoDaOperacao: false,
        itens: 1,
      })
    }
  }
  return lista
}

export const totalDaFatura = (f: Pick<FaturaCentral, 'previsto' | 'extras' | 'descontos'>) =>
  Math.round((f.previsto + f.extras.reduce((a, e) => a + valorExtra(e), 0) - f.descontos) * 100) / 100

/** Próximo passo possível da fatura (o que o botão "avançar" faz). */
export type Acao = 'conferir' | 'emitir' | 'boleto'
export const acaoPossivel = (f: FaturaCentral): Acao | null =>
  f.situacao === 'prevista' || f.situacao === 'a-conferir' ? 'conferir' : f.situacao === 'conferida' ? 'emitir' : f.situacao === 'nf-emitida' ? 'boleto' : null

export const ROTULO_ACAO: Record<Acao, string> = { conferir: 'Conferir', emitir: 'Emitir NFS-e', boleto: 'Gerar boleto' }

import { previaCobranca, type LinhaPrevia } from './modelos'
import { escopoVigente, mesAnoCurto, totalEscopo, valorExtra } from './regras'
import type { Contrato, DocumentoVinculado, ExtraContrato, Modalidade, SituacaoFatura } from './types'

/**
 * Faturas (protótipo): a fatura é uma FOTOGRAFIA CALCULADA do contrato.
 * - Enquanto não foi emitida (prevista, a conferir, conferida, devolvida), ela se recalcula do
 *   contrato: lançou um extra, ligou um componente, mudou o escopo → a fatura muda junto.
 * - Emitida a NF, trava: vale o que foi emitido; mudança vai para a fatura seguinte.
 * Recorrente com mensalidade: uma por mês. Com documentos vinculados (fretes): por período de
 * fechamento ou uma por documento. Spot: uma. Extra "faturar separado": uma própria.
 */

export interface VersaoFatura {
  em: string
  quem: string
  texto: string
  total: number
}

/** O que mudou na fatura fora do cálculo (etapa, NF, boleto, desconto, extras tirados, devolução). */
export interface AjusteFatura {
  situacao?: SituacaoFatura
  nf?: string
  boleto?: string
  descontos?: number
  /** Extras tirados desta fatura na conferência: vão para a seguinte. */
  extrasFora?: string[]
  motivo?: string
  versoes?: VersaoFatura[]
}

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
  referencia: string
  vencimento: string
  /** Contrato (mensalidade, fórmulas, cobrança única) ou soma dos documentos do período. */
  previsto: number
  composicao: LinhaPrevia[]
  documentos: DocumentoVinculado[]
  extras: ExtraContrato[]
  descontos: number
  situacao: SituacaoFatura
  nf?: string
  boleto?: string
  motivo?: string
  versoes: VersaoFatura[]
  /** NF emitida: não recalcula mais. */
  travada: boolean
  servicoNfse: string
  servicoNfseDetalhe: string
  /** Transporte: o documento fiscal (CT-e) já sai na viagem; não emite NFS-e. */
  documentoDaOperacao: boolean
  carteira: string
  formaCobranca: string
}

export const EMITIDAS: SituacaoFatura[] = ['nf-emitida', 'boleto-emitido', 'recebida', 'atrasada']

const r2 = (v: number) => Math.round(v * 100) / 100
const indice = (comp: string) => Number(comp.slice(0, 4)) * 12 + Number(comp.slice(5, 7)) - 1
const compDe = (i: number) => `${Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, '0')}`
const ultimoDia = (comp: string) => new Date(Number(comp.slice(0, 4)), Number(comp.slice(5, 7)), 0).getDate()
const somaDias = (iso: string, n: number) => {
  const d = new Date(`${iso}T12:00:00`)
  d.setDate(d.getDate() + n)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export const totalDaFatura = (f: Pick<FaturaCentral, 'previsto' | 'extras' | 'descontos'>) =>
  r2(f.previsto + f.extras.reduce((a, e) => a + valorExtra(e), 0) - f.descontos)

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

/** O contrato fatura pelos documentos vinculados (tem um componente "documento" ligado). */
export const faturaPorDocumento = (c: Contrato) => (c.componentes ?? []).some((x) => x.regra === 'documento' && x.ativo)

interface Periodo {
  chave: string
  de: string
  ate: string
  rotulo: string
}

function periodosDoMes(comp: string, fechamento: 'mensal' | 'quinzenal' | 'semanal'): Periodo[] {
  const fim = ultimoDia(comp)
  const faixa = (de: number, ate: number, rotulo: string, k: string): Periodo => ({ chave: `${comp}-${k}`, de: `${comp}-${String(de).padStart(2, '0')}`, ate: `${comp}-${String(ate).padStart(2, '0')}`, rotulo })
  if (fechamento === 'mensal') return [faixa(1, fim, mesAnoCurto(comp), 'm')]
  if (fechamento === 'quinzenal') return [faixa(1, 15, `1ª quinzena ${mesAnoCurto(comp)}`, 'q1'), faixa(16, fim, `2ª quinzena ${mesAnoCurto(comp)}`, 'q2')]
  return [faixa(1, 7, `sem. 1 ${mesAnoCurto(comp)}`, 's1'), faixa(8, 14, `sem. 2 ${mesAnoCurto(comp)}`, 's2'), faixa(15, 21, `sem. 3 ${mesAnoCurto(comp)}`, 's3'), faixa(22, fim, `sem. 4 ${mesAnoCurto(comp)}`, 's4')]
}

/** Todas as faturas de um contrato (do início até o mês que vem), com os ajustes aplicados. */
export function faturasDoContrato(c: Contrato, hoje: string, ajustes: Record<string, AjusteFatura>): FaturaCentral[] {
  const mesHoje = indice(hoje.slice(0, 7))
  const lista: FaturaCentral[] = []
  const aplicar = (f: Omit<FaturaCentral, 'versoes' | 'travada'>): FaturaCentral => {
    const a = ajustes[f.id] ?? {}
    const situacao = a.situacao ?? f.situacao
    return { ...f, situacao, nf: a.nf ?? f.nf, boleto: a.boleto ?? f.boleto, descontos: a.descontos ?? f.descontos, motivo: a.motivo, versoes: a.versoes ?? [], travada: EMITIDAS.includes(situacao) }
  }
  const pendentes = c.extras.filter((e) => !e.faturadoEm && e.cobranca === 'proxima-fatura')
  const usados = new Set<string>()
  /** Extras pendentes que entram nesta fatura aberta (os da data até o fim do período; tirados na conferência ficam para a seguinte). */
  const extrasPara = (id: string, ate: string, aberta: boolean) => {
    if (!aberta) return []
    const fora = new Set(ajustes[id]?.extrasFora ?? [])
    const lst = pendentes.filter((e) => !usados.has(e.id) && e.data <= ate && !fora.has(e.id))
    lst.forEach((e) => usados.add(e.id))
    return lst
  }

  if (c.modalidade === 'spot') {
    const f = c.faturas[0]
    if (f) {
      const v = escopoVigente(c, c.inicio)
      lista.push(aplicar({
        ...base(c), id: f.id, avulsa: false, descricao: v.itens[0]?.descricao ?? 'Serviço spot', competencia: f.competencia,
        referencia: `dia ${c.inicio.slice(8, 10)}/${c.inicio.slice(5, 7)}`, vencimento: f.vencimento, previsto: totalEscopo(v),
        composicao: previaCobranca(v.itens, c.componentes ?? [], c.caracteristicas, true).linhas, documentos: [], extras: [], descontos: f.descontos, situacao: f.situacao,
        nf: f.nf ?? (c.servicoNfse.includes('CT-e') ? c.documentos.find((d) => d.tipo === 'cte')?.nome.replace('.xml', '') : undefined), boleto: f.boleto,
      }))
    }
  } else if (faturaPorDocumento(c)) {
    const docs = (c.documentosVinculados ?? []).filter((d) => d.situacao !== 'cancelado')
    const fech = c.condicoes.fechamento ?? 'mensal'
    const primeiro = docs.length ? Math.min(...docs.map((d) => indice(d.data.slice(0, 7)))) : mesHoje
    for (let m = primeiro; m <= mesHoje; m++) {
      for (const p of periodosDoMes(compDe(m), fech)) {
        const doPeriodo = docs.filter((d) => d.data >= p.de && d.data <= p.ate)
        const grupos = c.condicoes.agrupamento === 'por-documento' ? doPeriodo.map((d) => ({ id: `d-${c.id}-${d.id}`, docs: [d], rotulo: `${d.tipo} ${d.numero}` })) : doPeriodo.length ? [{ id: `d-${c.id}-${p.chave}`, docs: doPeriodo, rotulo: p.rotulo }] : []
        for (const g of grupos) {
          // Período fechado antes deste mês: já cobrado e recebido; fechado neste mês: a conferir; aberto: previsto.
          const situacao: SituacaoFatura = indice(p.ate.slice(0, 7)) < mesHoje ? 'recebida' : p.ate < hoje ? 'a-conferir' : 'prevista'
          const emitida = EMITIDAS.includes(ajustes[g.id]?.situacao ?? situacao)
          const nums = g.docs.map((d) => d.numero)
          lista.push(aplicar({
            ...base(c), id: g.id, avulsa: false, descricao: `${g.docs.length} frete(s) · ${g.docs.map((d) => d.descricao.split(' · ')[0]).filter((x, i, a) => a.indexOf(x) === i).join(', ')}`,
            competencia: compDe(m), referencia: g.rotulo, vencimento: somaDias(p.ate, c.condicoes.prazoPagamentoDias || 15), previsto: r2(g.docs.reduce((a, d) => a + d.valor, 0)),
            composicao: [], documentos: g.docs, extras: extrasPara(g.id, p.ate, !emitida), descontos: 0, situacao,
            nf: `CT-e ${nums.length > 1 ? `${nums[0]} a ${nums[nums.length - 1]}` : nums[0]}`, boleto: situacao === 'recebida' ? `00${2300 + m % 100}`.slice(-6) : undefined,
          }))
        }
      }
    }
  } else {
    // Mensalidade: as faturas gravadas (exemplo) e, para contrato novo, as geradas do início até o mês que vem.
    const gravadas = new Map(c.faturas.map((f) => [f.competencia, f]))
    const primeira = indice(c.inicio.slice(0, 7)) + 1
    const ultima = Math.min(mesHoje + 1, indice(c.fim.slice(0, 7)) + 1)
    for (let m = primeira; m <= ultima; m++) {
      const comp = compDe(m)
      const g = gravadas.get(comp)
      const id = g?.id ?? `g-${c.id}-${comp}`
      const situacaoBase: SituacaoFatura = g?.situacao ?? (m < mesHoje ? 'a-conferir' : m === mesHoje ? (Number(hoje.slice(8, 10)) >= c.condicoes.diaFaturamento ? 'a-conferir' : 'prevista') : 'prevista')
      const emitida = EMITIDAS.includes(ajustes[id]?.situacao ?? situacaoBase)
      const v = escopoVigente(c, `${comp}-01` < c.inicio ? c.inicio : `${comp}-01`)
      const previa = previaCobranca(v.itens, c.componentes ?? [], c.caracteristicas, m === primeira)
      lista.push(aplicar({
        ...base(c), id, avulsa: false, descricao: `Mensalidade · ${v.itens.length} ite${v.itens.length === 1 ? 'm' : 'ns'}`, competencia: comp,
        referencia: c.condicoes.referencia === 'mes-anterior' ? mesAnoCurto(compDe(m - 1)) : mesAnoCurto(comp),
        vencimento: g?.vencimento ?? `${comp}-${String(Math.min(c.condicoes.diaVencimento || 10, ultimoDia(comp))).padStart(2, '0')}`,
        // Emitida: vale a fotografia gravada. Aberta: recalcula do contrato.
        previsto: emitida && g ? r2(g.previsto + g.extras) : previa.total,
        composicao: previa.linhas, documentos: [], extras: extrasPara(id, `${comp}-${String(ultimoDia(comp)).padStart(2, '0')}`, !emitida), descontos: g?.descontos ?? 0,
        situacao: situacaoBase, nf: g?.nf, boleto: g?.boleto,
      }))
    }
  }

  // Extras "faturar separado": uma fatura própria cada.
  for (const e of c.extras.filter((x) => !x.faturadoEm && x.cobranca === 'separado')) {
    lista.push(aplicar({
      ...base(c), id: `x-${e.id}`, avulsa: true, descricao: e.descricao, competencia: e.data.slice(0, 7), referencia: `extra de ${e.data.slice(8, 10)}/${e.data.slice(5, 7)}`,
      vencimento: somaDias(e.data, 15), previsto: valorExtra(e), composicao: [], documentos: [], extras: [], descontos: 0, situacao: 'a-conferir', documentoDaOperacao: false,
    }))
  }
  return lista
}

/** Faturas de uma competência (yyyy-MM) em todos os contratos. */
export const faturasDoMes = (contratos: Contrato[], competencia: string, hoje: string, ajustes: Record<string, AjusteFatura>) =>
  contratos.flatMap((c) => faturasDoContrato(c, hoje, ajustes)).filter((f) => f.competencia === competencia)

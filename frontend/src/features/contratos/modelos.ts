import { avaliar, referencias } from '@/lib/formula'
import type { ComponenteContrato, CondicoesContrato, ItemEscopo, LinhaComposicao, RegraComponente } from './types'

/**
 * Modelos de Contrato (espelho de ModeloContrato no servidor). O sistema não sabe o que é
 * terceirização ou frete: o cliente monta os modelos do negócio dele. Cada modelo tem CAMPOS
 * (características, com apelido) e COMPONENTES DE COBRANÇA (o que entra na fatura e como se
 * calcula). Mesma ideia da Ficha Técnica e dos Dados da Operação; as fórmulas usam lib/formula.
 */

export type TipoCampo = 'texto' | 'numero' | 'valor' | 'percentual' | 'lista' | 'data' | 'cadastro'

export interface CampoModelo {
  id: string
  apelido: string
  nome: string
  tipo: TipoCampo
  /** Lista: as opções. Cadastro: qual cadastro (Veículos, Funcionários...). */
  opcoes: string[]
  obrigatorio: boolean
  ajuda: string
}

export interface ComponenteModelo {
  id: string
  apelido: string
  nome: string
  regra: RegraComponente
  unidade: string
  valorPadrao: number
  formula: string
  documento: string
  /** Opcional: cada contrato liga ou desliga (ex.: a terceirizada que cobra o adicional X e a que não cobra). */
  opcional: boolean
}

export interface ModeloContrato {
  id: string
  nome: string
  tipoOperacao: string
  descricao: string
  /** Serviço (cadastro de serviços) que sai na nota por padrão; o contrato pode trocar. */
  servicoId: string
  campos: CampoModelo[]
  componentes: ComponenteModelo[]
  /** Padrão para documentos vinculados (o contrato pode trocar). */
  agrupamento: 'periodo' | 'por-documento'
  fechamento: 'mensal' | 'quinzenal' | 'semanal'
  /** Cláusulas padrão que o contrato copia ao nascer. */
  clausulas: string
  /** Condições padrão (fechamento, documentos, reajuste, renovação). Nulo = as do sistema. */
  condicoesPadrao: CondicoesContrato | null
  status: 'ativo' | 'inativo'
}

export const ROTULO_TIPO_CAMPO: Record<TipoCampo, string> = {
  texto: 'Texto', numero: 'Número', valor: 'Valor (R$)', percentual: 'Percentual', lista: 'Lista', data: 'Data', cadastro: 'Cadastro',
}

export const ROTULO_REGRA: Record<RegraComponente, string> = {
  fixo: 'Fixo por período',
  lancamento: 'Por lançamento (qtd × preço)',
  documento: 'Por documento vinculado',
  formula: 'Fórmula',
  unico: 'Cobrança única',
}

/** Modelo novo, em branco: as cláusulas e as condições padrão (a cobrança vem da proposta). */
export const modeloVazio = (): ModeloContrato => ({
  id: '',
  nome: 'Novo modelo',
  tipoOperacao: '',
  descricao: '',
  servicoId: '',
  campos: [],
  componentes: [],
  agrupamento: 'periodo',
  fechamento: 'mensal',
  clausulas: '',
  condicoesPadrao: null,
  status: 'ativo',
})

const r2 = (v: number) => Math.round(v * 100) / 100
const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

/**
 * Prévia da cobrança de um período, para o cadastro mostrar ao vivo (a conta que vale é a do
 * servidor, FaturamentoContrato.Calcular, que esta espelha): os fixos do escopo por apelido, as
 * fórmulas (sobre os fixos, as características numéricas e "subtotal") e a cobrança única.
 */
export function previaCobranca(itens: ItemEscopo[], componentes: ComponenteContrato[], caracteristicas: Record<string, string | number> = {}, primeiraFatura = false): { linhas: LinhaComposicao[]; total: number } {
  const vars: Record<string, number> = {}
  for (const [k, v] of Object.entries(caracteristicas)) if (typeof v === 'number') vars[k] = v
  const linhas: LinhaComposicao[] = []
  for (const i of itens.filter((x) => !x.tabela)) {
    const t = r2(i.quantidade * i.valorUnitario)
    if (i.apelido) vars[i.apelido] = (vars[i.apelido] ?? 0) + t
    linhas.push({ apelido: i.apelido, nome: i.descricao || i.servico, regra: 'fixo', valor: t, detalhe: `${i.quantidade} × ${brl(i.valorUnitario)}`, erro: '' })
  }
  vars.subtotal = linhas.reduce((a, l) => a + (l.valor ?? 0), 0)
  const ativos = componentes.filter((c) => c.ativo)
  for (const c of ativos.filter((x) => x.regra === 'formula')) {
    const desconhecida = referencias(c.formula).find((ref) => !(ref in vars))
    const r = desconhecida ? { valor: null, erro: `Apelido desconhecido: ${desconhecida}` } : avaliar(c.formula, vars)
    const v = r.valor === null ? null : r2(r.valor)
    if (v !== null) vars[c.apelido] = v
    linhas.push({ apelido: c.apelido, nome: c.nome, regra: 'formula', valor: v, detalhe: c.formula, erro: r.erro ?? '' })
  }
  for (const c of ativos.filter((x) => x.regra === 'unico'))
    linhas.push({ apelido: c.apelido, nome: c.nome, regra: 'unico', valor: primeiraFatura ? r2(Math.max(1, c.quantidade) * c.valorUnitario) : null, detalhe: primeiraFatura ? 'só na primeira fatura' : 'já cobrada na primeira fatura', erro: '' })
  for (const c of ativos.filter((x) => x.regra === 'lancamento'))
    linhas.push({ apelido: c.apelido, nome: c.nome, regra: 'lancamento', valor: null, detalhe: `conforme lançado · ${brl(c.valorUnitario)}/${c.unidade || 'un.'}`, erro: '' })
  for (const c of ativos.filter((x) => x.regra === 'documento'))
    linhas.push({ apelido: c.apelido, nome: c.nome, regra: 'documento', valor: null, detalhe: `soma dos ${c.documento || 'documentos'} do período`, erro: '' })
  return { linhas, total: r2(linhas.reduce((a, l) => a + (l.valor ?? 0), 0)) }
}

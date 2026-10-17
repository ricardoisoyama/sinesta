import type { ApoliceSeguro, Parceiro } from '@/features/parceiros/types'
import { numeroDe, type CampoOperacao, type ValoresOperacao } from './types'

/**
 * Ad valorem nos Dados da Operação. O percentual vem da apólice vigente da seguradora (tabela de
 * prêmio por UF de origem × destino) e pode ser ajustado. O valor em R$ é o percentual sobre a
 * mercadoria e NÃO passa pelo markup: soma ao frete peso (frete peso + ad valorem = frete total).
 */

/** Apólice escolhida para um tipo de seguro, com o nome da seguradora (para mostrar de onde veio). */
export interface ApoliceDaSeguradora {
  apolice: ApoliceSeguro
  seguradora: string
}

/** "SP - São Paulo" → "SP"; "SP" → "SP". */
export const ufDoValor = (v: string | number | undefined): string => {
  const m = /^([A-Za-z]{2})(\s*-|$)/.exec(String(v ?? '').trim())
  return m ? m[1].toUpperCase() : ''
}

const vigente = (a: ApoliceSeguro, hoje: string) =>
  (!a.vigenciaInicio || a.vigenciaInicio <= hoje) && (!a.vigenciaFim || a.vigenciaFim >= hoje)

/**
 * Apólice que vale hoje para a empresa: seguradora ativa, apólice ativa do tipo pedido, vigente e
 * que cobre a empresa (sem empresas marcadas = cobre todas). Havendo mais de uma, a de início mais recente.
 */
export function apoliceVigente(fornecedores: Parceiro[], tipo: string, empresaId: string, hoje: string): ApoliceDaSeguradora | undefined {
  const candidatas: ApoliceDaSeguradora[] = []
  for (const f of fornecedores) {
    if (!f.seguradora || f.status !== 'ativo') continue
    for (const a of f.apolices ?? []) {
      if (a.status !== 'ativo' || a.tipo !== tipo || !vigente(a, hoje)) continue
      if (a.empresaIds.length > 0 && !a.empresaIds.includes(empresaId)) continue
      candidatas.push({ apolice: a, seguradora: f.nomeFantasia || f.nome })
    }
  }
  return candidatas.sort((x, y) => y.apolice.vigenciaInicio.localeCompare(x.apolice.vigenciaInicio))[0]
}

/** De onde saiu o percentual da rota (para a tela explicar). */
export type FonteTaxa = 'urbana' | 'tabela' | 'padrao'

/**
 * Prêmio da rota: mesma cidade com taxa urbana → urbana; par de UFs na tabela → tabela;
 * senão a taxa padrão da apólice (0 = sem padrão → null, a pessoa digita).
 */
export function taxaDaRota(a: ApoliceSeguro, origem: string | number | undefined, destino: string | number | undefined): { pct: number; fonte: FonteTaxa } | null {
  const o = String(origem ?? '').trim()
  const d = String(destino ?? '').trim()
  const ufO = ufDoValor(o)
  const ufD = ufDoValor(d)
  if (!ufO || !ufD) return null
  const ehCidade = o.length > 2 && d.length > 2
  if (ehCidade && a.taxaUrbana > 0 && o.localeCompare(d, 'pt-BR', { sensitivity: 'base' }) === 0) return { pct: a.taxaUrbana, fonte: 'urbana' }
  const linha = a.taxas.find((t) => t.ufOrigem === ufO && t.ufDestino === ufD)
  if (linha) return { pct: linha.percentual, fonte: 'tabela' }
  return a.taxaPadrao > 0 ? { pct: a.taxaPadrao, fonte: 'padrao' } : null
}

/**
 * Gatilho: depois que a pessoa muda um campo, refaz o percentual dos campos de ad valorem
 * ligados a ele (origem ou destino). Mexer em outro campo não sobrescreve o que foi ajustado à mão.
 */
export function preencherAdValorem(
  campos: CampoOperacao[],
  valores: ValoresOperacao,
  chaveAlterada: string,
  apoliceDe: (tipo: string) => ApoliceSeguro | undefined,
): ValoresOperacao {
  let novos = valores
  for (const c of campos) {
    if (c.tipo !== 'advalorem' || !c.seguro) continue
    if (chaveAlterada !== c.campoOrigem && chaveAlterada !== c.campoDestino) continue
    const a = apoliceDe(c.seguro)
    const taxa = a && taxaDaRota(a, valores[c.campoOrigem ?? ''], valores[c.campoDestino ?? ''])
    if (taxa) novos = { ...novos, [c.chave]: taxa.pct }
  }
  return novos
}

/** Ad valorem em R$ de cada campo (percentual × valor da mercadoria) e o total. */
export function adValoremDosCampos(campos: CampoOperacao[], valores: ValoresOperacao) {
  const linhas: { nome: string; pct: number; base: number; valor: number }[] = []
  for (const c of campos) {
    if (c.tipo !== 'advalorem') continue
    const pct = numeroDe(valores[c.chave])
    const base = c.campoBase ? numeroDe(valores[c.campoBase]) : 0
    if (pct <= 0) continue
    linhas.push({ nome: c.nome, pct, base, valor: Math.round(pct * base * 100) / 100 })
  }
  return { total: Math.round(linhas.reduce((t, l) => t + l.valor, 0) * 100) / 100, linhas }
}

/** Ligações sugeridas ao criar um ad valorem: valor da mercadoria e campos de origem/destino pelo nome. */
export function ligacoesSugeridas(campos: CampoOperacao[]): Pick<CampoOperacao, 'campoBase' | 'campoOrigem' | 'campoDestino'> {
  const ativos = campos.filter((c) => c.status === 'ativo')
  const nome = (c: CampoOperacao) => c.nome.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  const valores = ativos.filter((c) => c.tipo === 'valor')
  const base = valores.find((c) => /mercadoria|nota|nf\b|carga/.test(nome(c))) ?? valores[0]
  // Cidade vale mais que UF: dá a UF e ainda permite a taxa urbana.
  const lugar = (re: RegExp) =>
    ativos.find((c) => c.tipo === 'cidade' && re.test(nome(c))) ?? ativos.find((c) => c.tipo === 'uf' && re.test(nome(c)))
  return { campoBase: base?.chave ?? '', campoOrigem: lugar(/orig|coleta/)?.chave ?? '', campoDestino: lugar(/dest|entrega/)?.chave ?? '' }
}

import type { AliquotaIcms } from '@/features/icms/api'
import { ufDoValor } from './advalorem'
import type { CampoOperacao, ValoresOperacao } from './types'

/**
 * ICMS nos Dados da Operação: a alíquota vem da tabela de ICMS (origem × destino) e pode ser
 * ajustada. Só vale para empresa contribuinte (fora do Simples); incide no frete, não no ad valorem.
 */
export function aliquotaDaRota(tabela: AliquotaIcms[], origem: string | number | undefined, destino: string | number | undefined): number | null {
  const o = ufDoValor(origem)
  const d = ufDoValor(destino)
  if (!o || !d) return null
  return tabela.find((t) => t.ufOrigem === o && t.ufDestino === d)?.aliquota ?? null
}

/** Gatilho: mudar a origem ou o destino de um campo ICMS refaz a alíquota dele pela tabela. */
export function preencherIcms(campos: CampoOperacao[], valores: ValoresOperacao, chaveAlterada: string, tabela: AliquotaIcms[]): ValoresOperacao {
  let novos = valores
  for (const c of campos) {
    if (c.tipo !== 'icms') continue
    if (chaveAlterada !== c.campoOrigem && chaveAlterada !== c.campoDestino) continue
    const aliq = aliquotaDaRota(tabela, valores[c.campoOrigem ?? ''], valores[c.campoDestino ?? ''])
    if (aliq !== null) novos = { ...novos, [c.chave]: aliq }
  }
  return novos
}

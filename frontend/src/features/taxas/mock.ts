import type { Taxa } from './types'

/**
 * Taxas e seguros (ad valorem) da planilha "simulação".
 * - Seguro = 0,3% × NF — fórmula da planilha (C34 = C33*0,3%).
 * - RCTR-C + RCF-DC = 0,04% × NF (levantamento).
 * - Taxas diversas = valor fixo (incide na cobrança via CT-e + NFS-e). Valor a confirmar com o autor.
 */
export const mockTaxas: Taxa[] = [
  { id: 'tx-seguro', nome: 'Seguro (ad valorem)', tipo: 'percentual', valor: 0.003, status: 'ativo' },
  { id: 'tx-rctr', nome: 'RCTR-C + RCF-DC (ad valorem)', tipo: 'percentual', valor: 0.0004, status: 'ativo' },
  { id: 'tx-diversas', nome: 'Taxas diversas (CT-e + NFS-e)', tipo: 'fixo', valor: 680, status: 'ativo' },
]

/** Seguro ad valorem (fração sobre a NF) entre as taxas ativas. */
export const aliquotaSeguro = (): number =>
  mockTaxas.find((t) => t.id === 'tx-seguro' && t.status === 'ativo')?.valor ?? 0

/** Substitui o conteúdo (in place) pelos dados vindos do backend. */
export function hydrateTaxas(list: Taxa[]): void {
  mockTaxas.length = 0
  mockTaxas.push(...list)
}

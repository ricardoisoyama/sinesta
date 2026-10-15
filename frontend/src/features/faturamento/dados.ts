import type { FaturaCentral } from '@/features/contratos/faturas'

export { faturasDoMes, totalDaFatura, type FaturaCentral } from '@/features/contratos/faturas'

/** Próximo passo possível da fatura (o que o botão "avançar" faz). Devolvida volta pela pasta do contrato. */
export type Acao = 'conferir' | 'emitir' | 'boleto'
export const acaoPossivel = (f: FaturaCentral): Acao | null =>
  f.situacao === 'prevista' || f.situacao === 'a-conferir' ? 'conferir' : f.situacao === 'conferida' ? 'emitir' : f.situacao === 'nf-emitida' ? 'boleto' : null

export const ROTULO_ACAO: Record<Acao, string> = { conferir: 'Conferir', emitir: 'Emitir NFS-e', boleto: 'Gerar boleto' }

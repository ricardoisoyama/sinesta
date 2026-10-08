/**
 * Gera o seed do backend a partir dos mocks do front (fonte única).
 * Rodar: `npx vite-node scripts/dump-seed.ts` (resolve o alias @ via vite.config).
 */
import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { mockTaxas } from '@/features/taxas/mock'
import { mockPlanoContas } from '@/features/planoContas/mock'
import { mockCustosFixos } from '@/features/custosFixos/mock'
import { mockUnidades } from '@/features/unidades/mock'
import { cenariosMeta } from '@/features/metas/mock'

const seed = {
  taxas: mockTaxas,
  planoContas: mockPlanoContas,
  custosFixos: mockCustosFixos,
  empresas: mockUnidades,
  // Propostas de exemplo NÃO entram no seed (cliente começa sem propostas).
  propostas: [],
  metas: cenariosMeta,
}

const out = resolve(process.cwd(), '../backend/Elrond.API/seed.json')
writeFileSync(out, JSON.stringify(seed, null, 2), 'utf-8')
console.log(`seed.json gerado em ${out}`)
console.log(
  `  taxas=${seed.taxas.length} planoContas=${seed.planoContas.length} custosFixos=${seed.custosFixos.length} empresas=${seed.empresas.length} propostas=${seed.propostas.length}`,
)

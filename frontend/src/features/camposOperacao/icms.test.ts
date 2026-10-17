import { describe, expect, it } from 'vitest'
import type { AliquotaIcms } from '@/features/icms/api'
import { aliquotaDaRota, preencherIcms } from './icms'
import { novoCampo, type CampoOperacao } from './types'

const tabela: AliquotaIcms[] = [
  { id: 'SP-RJ', ufOrigem: 'SP', ufDestino: 'RJ', aliquota: 0.12, fundamentacao: '' },
  { id: 'SP-BA', ufOrigem: 'SP', ufDestino: 'BA', aliquota: 0.07, fundamentacao: '' },
  { id: 'SP-SP', ufOrigem: 'SP', ufDestino: 'SP', aliquota: 0, fundamentacao: 'isento' },
]
const campo = (nome: string, tipo: CampoOperacao['tipo'], extra: Partial<CampoOperacao> = {}): CampoOperacao => ({
  ...novoCampo(nome, tipo),
  chave: nome.toLowerCase().replace(/\W+/g, '_'),
  ...extra,
})

describe('ICMS pela origem × destino', () => {
  it('acha a alíquota pela UF ou pela cidade; isento é 0 e rota sem linha é null', () => {
    expect(aliquotaDaRota(tabela, 'SP - Campinas', 'RJ - Niterói')).toBe(0.12)
    expect(aliquotaDaRota(tabela, 'SP', 'BA')).toBe(0.07)
    expect(aliquotaDaRota(tabela, 'SP', 'SP')).toBe(0)
    expect(aliquotaDaRota(tabela, 'RJ', 'SP')).toBeNull()
    expect(aliquotaDaRota(tabela, '', 'SP')).toBeNull()
  })

  it('gatilho preenche quando origem e destino estão completos; o ajuste à mão fica', () => {
    const campos = [campo('Origem', 'uf'), campo('Destino', 'uf'), campo('ICMS', 'icms', { campoOrigem: 'origem', campoDestino: 'destino' })]
    let v = preencherIcms(campos, { origem: 'SP' }, 'origem', tabela)
    expect(v.icms).toBeUndefined()
    v = preencherIcms(campos, { ...v, destino: 'BA' }, 'destino', tabela)
    expect(v.icms).toBe(0.07)
    v = preencherIcms(campos, { ...v, icms: 0.12 }, 'icms', tabela)
    expect(v.icms).toBe(0.12)
  })
})

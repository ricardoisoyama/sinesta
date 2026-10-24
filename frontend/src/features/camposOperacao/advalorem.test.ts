import { describe, expect, it } from 'vitest'
import { novaApolice, type Apolice } from '@/features/apolices/types'
import type { Parceiro } from '@/features/parceiros/types'
import { adValoremDosCampos, apoliceVigente, ligacoesSugeridas, preencherAdValorem, taxaDaRota, ufDoValor } from './advalorem'
import { novoCampo, type CampoOperacao } from './types'

const apolice = (p: Partial<Apolice> = {}): Apolice => ({
  ...novaApolice(),
  id: 'x',
  seguradoraId: 's',
  numero: '4465',
  taxas: [
    { ufOrigem: 'SP', ufDestino: 'RJ', percentual: 0.0014 },
    { ufOrigem: 'SP', ufDestino: 'SP', percentual: 0.0005 },
  ],
  ...p,
})

const seguradora = (p: Partial<Parceiro> = {}) =>
  ({ id: 's', nome: 'MAPFRE SEGUROS GERAIS S.A.', nomeFantasia: '', status: 'ativo', seguradora: true, ...p }) as Parceiro

const campo = (nome: string, tipo: CampoOperacao['tipo'], extra: Partial<CampoOperacao> = {}): CampoOperacao => ({
  ...novoCampo(nome, tipo),
  chave: nome.toLowerCase().replace(/\W+/g, '_'),
  ...extra,
})

describe('ad valorem', () => {
  it('lê a UF do valor de UF ou de cidade', () => {
    expect(ufDoValor('SP - São Paulo')).toBe('SP')
    expect(ufDoValor('rj')).toBe('RJ')
    expect(ufDoValor('São Paulo')).toBe('')
  })

  it('acha o prêmio pela tabela, pela taxa urbana ou pela padrão', () => {
    const a = apolice({ taxaUrbana: 0.0002, taxaPadrao: 0.003 })
    // Sem % de venda cadastrado, cobra o custo (e avisa).
    expect(taxaDaRota(a, 'SP', 'RJ')).toEqual({ pct: 0.0014, custo: 0.0014, semVenda: true, fonte: 'tabela' })
    expect(taxaDaRota(a, 'SP - Santos', 'SP - Campinas')).toEqual({ pct: 0.0005, custo: 0.0005, semVenda: true, fonte: 'tabela' })
    expect(taxaDaRota(a, 'SP - São Paulo', 'SP - são paulo')).toEqual({ pct: 0.0002, custo: 0.0002, semVenda: true, fonte: 'urbana' })
    expect(taxaDaRota(a, 'AC', 'RR')).toEqual({ pct: 0.003, custo: 0.003, semVenda: true, fonte: 'padrao' })
    expect(taxaDaRota(apolice(), 'AC', 'RR')).toBeNull()
    expect(taxaDaRota(a, '', 'RJ')).toBeNull()
  })

  it('cobra a venda da rota quando a apólice tem, e mostra o custo', () => {
    const base = apolice({ taxaUrbana: 0.0002, taxaUrbanaVenda: 0.0003, taxaPadrao: 0.003, taxaPadraoVenda: 0.004 })
    const a = { ...base, taxas: base.taxas.map((t) => (t.ufOrigem === 'SP' && t.ufDestino === 'RJ' ? { ...t, percentualVenda: 0.0018 } : t)) }
    expect(taxaDaRota(a, 'SP', 'RJ')).toEqual({ pct: 0.0018, custo: 0.0014, semVenda: false, fonte: 'tabela' })
    expect(taxaDaRota(a, 'SP - São Paulo', 'SP - São Paulo')).toEqual({ pct: 0.0003, custo: 0.0002, semVenda: false, fonte: 'urbana' })
    expect(taxaDaRota(a, 'AC', 'RR')).toEqual({ pct: 0.004, custo: 0.003, semVenda: false, fonte: 'padrao' })
  })

  it('usa a apólice vigente do tipo, da seguradora ativa e que cobre a empresa', () => {
    const vencida = apolice({ id: 'v', vigenciaInicio: '2025-01-01', vigenciaFim: '2025-12-31' })
    const atual = apolice({ id: 'a', vigenciaInicio: '2026-01-01', vigenciaFim: '2026-12-31' })
    const outraEmpresa = apolice({ id: 'o', vigenciaInicio: '2026-06-01', empresaIds: ['outra'] })
    const rcf = apolice({ id: 'r', tipo: 'RCF-DC' })
    const lista = [vencida, atual, outraEmpresa, rcf]
    const segs = [seguradora()]
    expect(apoliceVigente(lista, segs, 'RCTR-C', 'emp', '2026-10-17')?.apolice.id).toBe('a')
    expect(apoliceVigente(lista, segs, 'RCTR-C', 'outra', '2026-10-17')?.apolice.id).toBe('o')
    expect(apoliceVigente(lista, segs, 'RCF-DC', 'emp', '2026-10-17')?.seguradora).toBe('MAPFRE SEGUROS GERAIS S.A.')
    expect(apoliceVigente([atual], [seguradora({ seguradora: false })], 'RCTR-C', 'emp', '2026-10-17')).toBeUndefined()
    expect(apoliceVigente([atual], [seguradora({ status: 'inativo' })], 'RCTR-C', 'emp', '2026-10-17')).toBeUndefined()
    expect(apoliceVigente([{ ...atual, seguradoraId: 'outra' }], segs, 'RCTR-C', 'emp', '2026-10-17')).toBeUndefined()
  })

  it('gatilho: origem e destino preenchem o percentual; outro campo não sobrescreve o ajuste', () => {
    const campos = [
      campo('Origem', 'uf'),
      campo('Destino', 'uf'),
      campo('Valor da mercadoria', 'valor'),
      campo('Ad valorem', 'advalorem', { seguro: 'RCTR-C', campoBase: 'valor_da_mercadoria', campoOrigem: 'origem', campoDestino: 'destino' }),
    ]
    const a = apolice()
    let v = preencherAdValorem(campos, { origem: 'SP' }, 'origem', () => a)
    expect(v.ad_valorem).toBeUndefined() // falta o destino
    v = preencherAdValorem(campos, { ...v, destino: 'RJ' }, 'destino', () => a)
    expect(v.ad_valorem).toBe(0.0014)
    v = preencherAdValorem(campos, { ...v, ad_valorem: 0.002, valor_da_mercadoria: 50000 }, 'valor_da_mercadoria', () => a)
    expect(v.ad_valorem).toBe(0.002) // ajuste manual fica
    expect(adValoremDosCampos(campos, v)).toEqual({ total: 100, linhas: [{ nome: 'Ad valorem', pct: 0.002, base: 50000, valor: 100 }] })
  })

  it('sugere as ligações pelos nomes dos campos', () => {
    const campos = [
      campo('UF de origem', 'uf'),
      campo('Cidade de origem', 'cidade'),
      campo('UF de destino', 'uf'),
      campo('Frete mínimo', 'valor'),
      campo('Valor da mercadoria', 'valor'),
    ]
    expect(ligacoesSugeridas(campos)).toEqual({ campoBase: 'valor_da_mercadoria', campoOrigem: 'cidade_de_origem', campoDestino: 'uf_de_destino' })
  })
})

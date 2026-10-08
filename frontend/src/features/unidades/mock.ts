import { mockIcms } from '@/features/icms/mock'
import type { Unidade } from './types'

const semImposto = { aliquota: 0, retido: false, reducaoBase: 0 }
const icmsPadrao = () => mockIcms.map((u) => ({ ...u }))

/**
 * Empresas reais da planilha: Matriz e Filial 02 (cada uma com seus parâmetros).
 * CNPJ/razão social/endereço e a tributação detalhada são exemplos (vêm do cadastro).
 */
export const mockUnidades: Unidade[] = [
  {
    id: 'matriz',
    nome: 'Matriz',
    razaoSocial: 'Sinesta Transportes Ltda',
    nomeFantasia: 'Sinesta',
    cnpj: '00.000.000/0001-00',
    tipo: 'Matriz',
    endereco: 'Cajamar - SP',
    logo: '',
    status: 'ativo',
    dv: { impostos: 0.11, custos: 0, comissoes: 0, lucro: 0.07, despFinanceira: 0.023, receitaEstimadaMensal: 225000 },
    regime: 'Lucro Presumido',
    das: 0,
    // Sem tributos detalhados: a DV usa os 11% da planilha até o cliente cadastrar
    // as alíquotas reais (aí elas passam a compor a DV automaticamente).
    ir: { ...semImposto },
    csll: { ...semImposto },
    inss: { ...semImposto },
    pis: { ...semImposto },
    cofins: { ...semImposto },
    iss: { ...semImposto },
    ibsMunicipal: 0,
    ibsEstadual: 0,
    cbs: 0,
    icmsAtivo: true,
    icms: icmsPadrao(),
  },
  {
    id: 'filial-02',
    nome: 'Filial 02',
    razaoSocial: 'Sinesta Transportes Ltda',
    nomeFantasia: 'Sinesta Filial 02',
    cnpj: '00.000.000/0002-00',
    tipo: 'Filial',
    endereco: 'Penápolis - SP',
    logo: '',
    status: 'ativo',
    dv: { impostos: 0.11, custos: 0, comissoes: 0.015, lucro: 0.1, despFinanceira: 0.023, receitaEstimadaMensal: 225000 },
    regime: 'Simples Nacional',
    // Simples: o DAS é o imposto da DV (a planilha usava 11%, que era do regime da Matriz).
    das: 0.06,
    ir: { ...semImposto },
    csll: { ...semImposto },
    inss: { ...semImposto },
    pis: { ...semImposto },
    cofins: { ...semImposto },
    iss: { ...semImposto },
    ibsMunicipal: 0,
    ibsEstadual: 0,
    cbs: 0,
    icmsAtivo: true,
    icms: icmsPadrao(),
  },
]

export const nomeUnidade = (id: string): string =>
  mockUnidades.find((u) => u.id === id)?.nome ?? '—'

/** Substitui o conteúdo (in place) pelos dados vindos do backend. */
export function hydrateEmpresas(list: Unidade[]): void {
  mockUnidades.length = 0
  mockUnidades.push(...list)
}

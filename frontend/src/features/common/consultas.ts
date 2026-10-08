import { apiFetch } from '@/lib/api'

/** Dados públicos do CNPJ (base aberta da Receita), já no formato do cadastro. */
export interface CnpjConsulta {
  cnpj: string
  razaoSocial: string
  nomeFantasia: string
  /** Ativa, Baixada, Inapta, Suspensa, Nula. */
  situacao: string
  abertura: string
  porte: string
  naturezaJuridica: string
  optanteSimples: boolean | null
  optanteMei: boolean | null
  /** Simples Nacional, MEI, Lucro Presumido, Lucro Real ou vazio. */
  regime: string
  cep: string
  logradouro: string
  numero: string
  complemento: string
  bairro: string
  /** "Cidade - UF", igual à base de cidades do sistema. */
  cidade: string
  uf: string
  telefone: string
  email: string
  atividadePrincipal: string
  fonte: string
  atualizadoEm: string
}

/** Endereço do CEP, com a cidade no formato da base do sistema. */
export interface CepConsulta {
  cep: string
  logradouro: string
  /** Observação do CEP (ex.: "lado ímpar"), não é o complemento. */
  observacao: string
  bairro: string
  cidade: string
  uf: string
  ibge: string
  fonte: string
}

const so = (s: string) => s.replace(/\D/g, '')

export const consultarCnpj = (cnpj: string) => apiFetch<CnpjConsulta>(`/consultas/cnpj/${so(cnpj)}`)
export const consultarCep = (cep: string) => apiFetch<CepConsulta>(`/consultas/cep/${so(cep)}`)

/** Uma linha de resumo do CNPJ para mostrar abaixo do campo ("Ativa · Microempresa · Simples · base de 12/09/2026"). */
export function resumoCnpj(c: CnpjConsulta): string {
  const data = c.atualizadoEm ? new Date(c.atualizadoEm).toLocaleDateString('pt-BR') : ''
  return [
    c.situacao && `Situação: ${c.situacao}`,
    c.porte,
    c.regime || (c.optanteSimples === false ? 'Não optante do Simples' : ''),
    data && `base de ${data}`,
  ]
    .filter(Boolean)
    .join(' · ')
}

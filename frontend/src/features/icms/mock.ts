import type { IcmsUf } from './types'

/**
 * Os 27 estados (UF) com a alíquota de ICMS nas DUAS faixas da planilha:
 * Sul e Sudeste = 12% (gross-up ÷ 0,88); Norte, Nordeste e Centro-Oeste = 7% (÷ 0,93).
 * Estrutura por UF para permitir alíquota específica por estado, se necessário.
 */
export const mockIcms: IcmsUf[] = [
  { id: 'ac', uf: 'AC', nome: 'Acre', regiao: 'Norte', aliquota: 0.07 },
  { id: 'al', uf: 'AL', nome: 'Alagoas', regiao: 'Nordeste', aliquota: 0.07 },
  { id: 'ap', uf: 'AP', nome: 'Amapá', regiao: 'Norte', aliquota: 0.07 },
  { id: 'am', uf: 'AM', nome: 'Amazonas', regiao: 'Norte', aliquota: 0.07 },
  { id: 'ba', uf: 'BA', nome: 'Bahia', regiao: 'Nordeste', aliquota: 0.07 },
  { id: 'ce', uf: 'CE', nome: 'Ceará', regiao: 'Nordeste', aliquota: 0.07 },
  { id: 'df', uf: 'DF', nome: 'Distrito Federal', regiao: 'Centro-Oeste', aliquota: 0.07 },
  { id: 'es', uf: 'ES', nome: 'Espírito Santo', regiao: 'Sudeste', aliquota: 0.12 },
  { id: 'go', uf: 'GO', nome: 'Goiás', regiao: 'Centro-Oeste', aliquota: 0.07 },
  { id: 'ma', uf: 'MA', nome: 'Maranhão', regiao: 'Nordeste', aliquota: 0.07 },
  { id: 'mt', uf: 'MT', nome: 'Mato Grosso', regiao: 'Centro-Oeste', aliquota: 0.07 },
  { id: 'ms', uf: 'MS', nome: 'Mato Grosso do Sul', regiao: 'Centro-Oeste', aliquota: 0.07 },
  { id: 'mg', uf: 'MG', nome: 'Minas Gerais', regiao: 'Sudeste', aliquota: 0.12 },
  { id: 'pa', uf: 'PA', nome: 'Pará', regiao: 'Norte', aliquota: 0.07 },
  { id: 'pb', uf: 'PB', nome: 'Paraíba', regiao: 'Nordeste', aliquota: 0.07 },
  { id: 'pr', uf: 'PR', nome: 'Paraná', regiao: 'Sul', aliquota: 0.12 },
  { id: 'pe', uf: 'PE', nome: 'Pernambuco', regiao: 'Nordeste', aliquota: 0.07 },
  { id: 'pi', uf: 'PI', nome: 'Piauí', regiao: 'Nordeste', aliquota: 0.07 },
  { id: 'rj', uf: 'RJ', nome: 'Rio de Janeiro', regiao: 'Sudeste', aliquota: 0.12 },
  { id: 'rn', uf: 'RN', nome: 'Rio Grande do Norte', regiao: 'Nordeste', aliquota: 0.07 },
  { id: 'rs', uf: 'RS', nome: 'Rio Grande do Sul', regiao: 'Sul', aliquota: 0.12 },
  { id: 'ro', uf: 'RO', nome: 'Rondônia', regiao: 'Norte', aliquota: 0.07 },
  { id: 'rr', uf: 'RR', nome: 'Roraima', regiao: 'Norte', aliquota: 0.07 },
  { id: 'sc', uf: 'SC', nome: 'Santa Catarina', regiao: 'Sul', aliquota: 0.12 },
  { id: 'sp', uf: 'SP', nome: 'São Paulo', regiao: 'Sudeste', aliquota: 0.12 },
  { id: 'se', uf: 'SE', nome: 'Sergipe', regiao: 'Nordeste', aliquota: 0.07 },
  { id: 'to', uf: 'TO', nome: 'Tocantins', regiao: 'Norte', aliquota: 0.07 },
]

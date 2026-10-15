const SIGLAS = new Set([
  'AC', 'AL', 'AM', 'AP', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MG', 'MS', 'MT', 'PA',
  'PB', 'PE', 'PI', 'PR', 'RJ', 'RN', 'RO', 'RR', 'RS', 'SC', 'SE', 'SP', 'TO',
])

/**
 * Separa nome e UF de um texto de cidade nos dois formatos do sistema: "Campinas - SP"
 * (endereços) e "SP - Campinas" (Dados da Operação). Só aceita UF válida ("Ji-Paraná - RO"
 * dá Ji-Paraná/RO). Espelho de `BuscaCidade.Separar` do backend.
 */
export function separarCidade(texto: string): { nome: string; uf: string } {
  const t = (texto ?? '').trim()
  const i = t.lastIndexOf('-')
  if (i > 0 && SIGLAS.has(t.slice(i + 1).trim().toUpperCase())) return { nome: t.slice(0, i).trim(), uf: t.slice(i + 1).trim().toUpperCase() }
  const m = /^\s*([A-Za-z]{2})\s*-\s*(.*)$/.exec(t)
  if (m && SIGLAS.has(m[1].toUpperCase())) return { nome: m[2].trim(), uf: m[1].toUpperCase() }
  return { nome: t, uf: '' }
}

/** As 27 unidades da federação, em ordem alfabética de sigla. */
export const UFS: { sigla: string; nome: string }[] = [
  { sigla: 'AC', nome: 'Acre' },
  { sigla: 'AL', nome: 'Alagoas' },
  { sigla: 'AM', nome: 'Amazonas' },
  { sigla: 'AP', nome: 'Amapá' },
  { sigla: 'BA', nome: 'Bahia' },
  { sigla: 'CE', nome: 'Ceará' },
  { sigla: 'DF', nome: 'Distrito Federal' },
  { sigla: 'ES', nome: 'Espírito Santo' },
  { sigla: 'GO', nome: 'Goiás' },
  { sigla: 'MA', nome: 'Maranhão' },
  { sigla: 'MG', nome: 'Minas Gerais' },
  { sigla: 'MS', nome: 'Mato Grosso do Sul' },
  { sigla: 'MT', nome: 'Mato Grosso' },
  { sigla: 'PA', nome: 'Pará' },
  { sigla: 'PB', nome: 'Paraíba' },
  { sigla: 'PE', nome: 'Pernambuco' },
  { sigla: 'PI', nome: 'Piauí' },
  { sigla: 'PR', nome: 'Paraná' },
  { sigla: 'RJ', nome: 'Rio de Janeiro' },
  { sigla: 'RN', nome: 'Rio Grande do Norte' },
  { sigla: 'RO', nome: 'Rondônia' },
  { sigla: 'RR', nome: 'Roraima' },
  { sigla: 'RS', nome: 'Rio Grande do Sul' },
  { sigla: 'SC', nome: 'Santa Catarina' },
  { sigla: 'SE', nome: 'Sergipe' },
  { sigla: 'SP', nome: 'São Paulo' },
  { sigla: 'TO', nome: 'Tocantins' },
]

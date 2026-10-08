import type { PlanoConta } from './types'

/**
 * Plano de contas em árvore (amostra realista de empresa de serviços).
 * Raízes DESPESAS (3) e RECEITAS (4) → grupos (sintéticas) → contas (analíticas).
 * Os ids `pc-*` são preservados porque os Custos Fixos já os referenciam.
 */
export const mockPlanoContas: PlanoConta[] = [
  // ── DESPESAS ──────────────────────────────────────────────────────────────
  { id: 'd', codigo: '3', nome: 'DESPESAS', paiId: null, grupoDre: 'Despesa', status: 'ativo' },

  { id: 'd-pessoal', codigo: '3.01', nome: 'Despesas com Pessoal', paiId: 'd', grupoDre: 'Despesa', status: 'ativo' },
  { id: 'pc-pessoal', codigo: '3.01.001', nome: 'Pessoal', paiId: 'd-pessoal', grupoDre: 'Despesa', contaContabil: '301001', status: 'ativo' },
  { id: 'pc-prolabore', codigo: '3.01.002', nome: 'Pró-labore', paiId: 'd-pessoal', grupoDre: 'Despesa', contaContabil: '301002', status: 'ativo' },
  { id: 'pc-encargos', codigo: '3.01.003', nome: 'Encargos e benefícios', paiId: 'd-pessoal', grupoDre: 'Despesa', contaContabil: '301003', status: 'ativo' },

  { id: 'd-adm', codigo: '3.02', nome: 'Despesas Administrativas', paiId: 'd', grupoDre: 'Despesa', status: 'ativo' },
  { id: 'pc-contabil', codigo: '3.02.001', nome: 'Contábil/Jurídico', paiId: 'd-adm', grupoDre: 'Despesa', contaContabil: '302001', status: 'ativo' },
  { id: 'pc-ti', codigo: '3.02.002', nome: 'Sistemas/TI', paiId: 'd-adm', grupoDre: 'Despesa', contaContabil: '302002', status: 'ativo' },
  { id: 'pc-marketing', codigo: '3.02.003', nome: 'Marketing', paiId: 'd-adm', grupoDre: 'Despesa', contaContabil: '302003', status: 'ativo' },

  { id: 'd-oper', codigo: '3.03', nome: 'Despesas Operacionais', paiId: 'd', grupoDre: 'Despesa', status: 'ativo' },
  { id: 'pc-operacional', codigo: '3.03.001', nome: 'Operacional', paiId: 'd-oper', grupoDre: 'Despesa', contaContabil: '303001', status: 'ativo' },
  { id: 'pc-seguros', codigo: '3.03.002', nome: 'Seguros', paiId: 'd-oper', grupoDre: 'Despesa', contaContabil: '303002', status: 'ativo' },

  { id: 'd-frota', codigo: '3.04', nome: 'Despesas Operacionais', paiId: 'd', grupoDre: 'Despesa', status: 'ativo' },
  { id: 'pc-combustivel', codigo: '3.04.001', nome: 'Combustível', paiId: 'd-frota', grupoDre: 'Despesa', contaContabil: '304001', status: 'ativo' },
  { id: 'pc-manutencao', codigo: '3.04.002', nome: 'Manutenção de equipamentos', paiId: 'd-frota', grupoDre: 'Despesa', contaContabil: '304002', status: 'ativo' },
  { id: 'pc-pedagio', codigo: '3.04.003', nome: 'Deslocamentos', paiId: 'd-frota', grupoDre: 'Despesa', contaContabil: '304003', status: 'ativo' },

  { id: 'd-servicos', codigo: '3.05', nome: 'Serviços Prestados', paiId: 'd', grupoDre: 'Despesa', status: 'ativo' },
  { id: 'pc-fretes-contr', codigo: '3.05.001', nome: 'Serviços contratados', paiId: 'd-servicos', grupoDre: 'Despesa', contaContabil: '305001', status: 'ativo' },

  { id: 'd-trib-fed', codigo: '3.06', nome: 'Tributos Federais', paiId: 'd', grupoDre: 'Despesa', status: 'ativo' },
  { id: 'pc-pis-cofins', codigo: '3.06.001', nome: 'PIS/COFINS', paiId: 'd-trib-fed', grupoDre: 'Despesa', contaContabil: '306001', status: 'ativo' },
  { id: 'pc-irpj-csll', codigo: '3.06.002', nome: 'IRPJ/CSLL', paiId: 'd-trib-fed', grupoDre: 'Despesa', contaContabil: '306002', status: 'ativo' },

  { id: 'd-trib-est', codigo: '3.07', nome: 'Tributos Estaduais', paiId: 'd', grupoDre: 'Despesa', status: 'ativo' },
  { id: 'pc-icms', codigo: '3.07.001', nome: 'ICMS', paiId: 'd-trib-est', grupoDre: 'Despesa', contaContabil: '307001', status: 'ativo' },

  { id: 'd-trib-mun', codigo: '3.08', nome: 'Tributos Municipais', paiId: 'd', grupoDre: 'Despesa', status: 'ativo' },
  { id: 'pc-iss', codigo: '3.08.001', nome: 'ISS', paiId: 'd-trib-mun', grupoDre: 'Despesa', contaContabil: '308001', status: 'ativo' },

  { id: 'd-emprestimos', codigo: '3.09', nome: 'Empréstimos / Financiamentos', paiId: 'd', grupoDre: 'Despesa', status: 'ativo' },
  { id: 'pc-fin-veiculos', codigo: '3.09.001', nome: 'Financiamento de veículos', paiId: 'd-emprestimos', grupoDre: 'Despesa', contaContabil: '209001', status: 'ativo' },
  { id: 'pc-capital-giro', codigo: '3.09.002', nome: 'Capital de giro', paiId: 'd-emprestimos', grupoDre: 'Despesa', contaContabil: '209002', status: 'ativo' },

  // ── RECEITAS ──────────────────────────────────────────────────────────────
  { id: 'r', codigo: '4', nome: 'RECEITAS', paiId: null, grupoDre: 'Receita', status: 'ativo' },

  { id: 'r-vendas', codigo: '4.01', nome: 'Receitas de Vendas', paiId: 'r', grupoDre: 'Receita', status: 'ativo' },
  { id: 'pc-frete-receita', codigo: '4.01.001', nome: 'Receita de serviços', paiId: 'r-vendas', grupoDre: 'Receita', contaContabil: '401001', status: 'ativo' },

  { id: 'r-financeiras', codigo: '4.02', nome: 'Receitas Financeiras', paiId: 'r', grupoDre: 'Receita', status: 'ativo' },
  { id: 'pc-rendimentos', codigo: '4.02.001', nome: 'Rendimentos de aplicações', paiId: 'r-financeiras', grupoDre: 'Receita', contaContabil: '402001', status: 'ativo' },

  { id: 'r-outras', codigo: '4.03', nome: 'Outras Receitas', paiId: 'r', grupoDre: 'Receita', status: 'ativo' },
  { id: 'pc-sucata', codigo: '4.03.001', nome: 'Venda de sucata', paiId: 'r-outras', grupoDre: 'Receita', contaContabil: '403001', status: 'ativo' },
]

export const nomePlanoConta = (id: string): string => {
  const c = mockPlanoContas.find((x) => x.id === id)
  return c ? `${c.codigo} · ${c.nome}` : '—'
}

import type { Perfil } from './types'

/** Uma funcionalidade do portal que pode ser liberada por perfil (RBAC). */
export interface Funcionalidade {
  /** Chave = rota da funcionalidade. */
  key: string
  label: string
  grupo: string
  /**
   * Permissão especial: não é tela e fica DESLIGADA por padrão para todos os
   * perfis (inclusive Gestor). Só entra quando alguém liga no cadastro do funcionário.
   */
  extra?: boolean
  /**
   * Administrativa: só o perfil Admin (a nossa equipe) tem, sempre. Não se concede e não
   * aparece para o cliente no cadastro do funcionário.
   */
  admin?: boolean
}

export const GRUPO_ESPECIAIS = 'Permissões especiais'
export const GRUPO_EQUIPE = 'Só a equipe ELROND (Suporte)'

/**
 * Catálogo de funcionalidades (espelha o menu). A `key` é a rota, então a
 * mesma lista serve para montar a matriz de permissões e para filtrar o menu.
 */
export const FUNCIONALIDADES: Funcionalidade[] = [
  { key: '/dashboard', label: 'Dashboard', grupo: 'Geral' },
  { key: '/simulador', label: 'Pricing', grupo: 'Comercial' },
  { key: '/propostas', label: 'Proposta', grupo: 'Comercial' },
  { key: '/crm', label: 'CRM', grupo: 'Comercial' },
  { key: '/agenda', label: 'Agenda', grupo: 'Comercial' },
  { key: '/analises/metas', label: 'Metas', grupo: 'Comercial' },
  { key: '/analises/rpo', label: 'RPO (Orçado × Real)', grupo: 'Relatórios' },
  { key: '/financeiro/entradas-saidas', label: 'Entradas e Saídas (a pagar / a receber)', grupo: 'Financeiro' },
  { key: '/financeiro/caixa', label: 'Caixa (saldos e previsão)', grupo: 'Financeiro' },
  { key: '/financeiro/conciliacao', label: 'Conciliação bancária (extrato .ofx)', grupo: 'Financeiro' },
  // Não é tela: permite assinar a aprovação dos lançamentos (quem assina vem da regra). Gestor já nasce com ela.
  { key: '/financeiro/aprovar', label: 'Aprovar lançamentos financeiros', grupo: 'Financeiro' },
  { key: '/cadastros/custos-fixos', label: 'Despesas Fixas (DF)', grupo: 'Financeiro' },
  { key: '/analises/break-even', label: 'Break-even', grupo: 'Relatórios' },
  { key: '/analises/mix', label: 'Mix / Equilíbrio', grupo: 'Relatórios' },
  { key: '/cadastros/unidades', label: 'Empresas', grupo: 'Cadastros' },
  // Não é tela: libera o campo de lucro da empresa (compõe o fator). Gestor já nasce com ela.
  { key: '/cadastros/unidades/markup', label: 'Alterar o lucro da empresa (compõe o fator)', grupo: 'Cadastros' },
  { key: '/cadastros/clientes', label: 'Clientes', grupo: 'Cadastros' },
  { key: '/cadastros/fornecedores', label: 'Fornecedores', grupo: 'Cadastros' },
  { key: '/cadastros/vendedores', label: 'Vendedores', grupo: 'Cadastros' },
  { key: '/cadastros/servicos', label: 'Serviços', grupo: 'Cadastros' },
  { key: '/cadastros/veiculos', label: 'Veículos', grupo: 'Cadastros' },
  { key: '/cadastros/apolices', label: 'Apólices de seguro', grupo: 'Cadastros' },
  { key: '/cadastros/fichas-tecnicas', label: 'Ficha Técnica (custos parametrizáveis)', grupo: 'Parametrizações' },
  { key: '/cadastros/campos-operacao', label: 'Dados da Operação (campos da Precificação)', grupo: 'Parametrizações' },
  { key: '/cadastros/icms', label: 'Tabela de ICMS (origem × destino)', grupo: 'Parametrizações' },
  { key: '/cadastros/categorias', label: 'Centro de Custo', grupo: 'Financeiro' },
  { key: '/cadastros/plano-contas', label: 'Plano de Contas', grupo: 'Financeiro' },
  { key: '/cadastros/taxas', label: 'Taxas e Seguros', grupo: 'Cadastros' },
  { key: '/cadastros/usuarios', label: 'Funcionários e permissões', grupo: 'Cadastros' },
  { key: '/cadastros/aprovadores', label: 'Aprovadores e Regras', grupo: 'Parametrizações' },
  // Não é tela: libera o botão de aprovar proposta na lista.
  { key: '/propostas/aprovar', label: 'Aprovação de propostas', grupo: 'Comercial' },
  { key: '/cadastros/modelos-proposta', label: 'Modelos de Proposta', grupo: 'Parametrizações' },
  { key: '/cadastros/funis', label: 'Funis do CRM', grupo: 'Parametrizações' },
  { key: '/cadastros/auditoria', label: 'Auditoria (histórico de alterações)', grupo: 'Administrativo' },
  { key: '/contratos', label: 'Contratos', grupo: 'Comercial' },
  { key: '/cadastros/modelos-contrato', label: 'Modelos de Contrato', grupo: 'Parametrizações' },
  { key: '/financeiro/faturamento', label: 'Central de Faturamento', grupo: 'Financeiro' },
  { key: '/analises/projecao', label: 'Projeção', grupo: 'Relatórios' },

  // ── Especiais: desligadas por padrão para todo mundo ─────────────────────
  { key: '/simulador/calculo', label: 'Ver o cálculo do preço no Pricing (custos, fator, margem)', grupo: GRUPO_ESPECIAIS, extra: true },
  { key: '/propostas/conferencia', label: 'Conferir o resultado de cada item na lista de propostas (custo, DF, DV, margem)', grupo: GRUPO_ESPECIAIS, extra: true },
  { key: '/cadastros/vendedores/transferir', label: 'Transferir a carteira de clientes de um vendedor', grupo: GRUPO_ESPECIAIS, extra: true },
  { key: '/propostas/alterar-pagamento', label: 'Alterar forma e prazo de pagamento na proposta', grupo: GRUPO_ESPECIAIS, extra: true },
  { key: '/fiscal/nfse', label: 'Emitir, consultar e cancelar NFS-e (motor fiscal, em teste)', grupo: GRUPO_ESPECIAIS, extra: true },

  // ── Administrativas: só o perfil Admin (a nossa equipe), sempre ─────────
  { key: '/administrativo/integracoes', label: 'Integrações Bancárias (bancos das empresas: credenciais, certificado, boleto, pagamentos)', grupo: GRUPO_EQUIPE, admin: true },
  { key: '/financeiro/boleto-teste', label: 'Página de testes de boleto (/boleto)', grupo: GRUPO_EQUIPE, admin: true },
]

export const TODAS_FUNCIONALIDADES = FUNCIONALIDADES.map((f) => f.key)
/** Funcionalidades comuns (telas e ações do dia a dia). Gestor recebe todas. */
export const FUNCIONALIDADES_BASE = FUNCIONALIDADES.filter((f) => !f.extra && !f.admin).map((f) => f.key)
export const FUNCIONALIDADES_EXTRAS = FUNCIONALIDADES.filter((f) => f.extra).map((f) => f.key)
/** O que se concede no cadastro (comuns + especiais); as administrativas vêm do perfil Admin. */
export const FUNCIONALIDADES_CONCEDIVEIS = [...FUNCIONALIDADES_BASE, ...FUNCIONALIDADES_EXTRAS]
export const ehExtra = (key: string) => FUNCIONALIDADES_EXTRAS.includes(key)
export const ehAdministrativa = (key: string) => FUNCIONALIDADES.some((f) => f.key === key && f.admin)

/** Ordem dos grupos na matriz de permissões (espelha o menu). */
export const GRUPOS_FUNCIONALIDADE = ['Geral', 'Cadastros', 'Comercial', 'Parametrizações', 'Financeiro', 'Relatórios', 'Administrativo', GRUPO_ESPECIAIS, GRUPO_EQUIPE]

/** Funcionalidades agrupadas, na ordem de exibição. O grupo da equipe só aparece para o Admin. */
export function funcionalidadesPorGrupo(comEquipe = false): { grupo: string; itens: Funcionalidade[] }[] {
  return GRUPOS_FUNCIONALIDADE.filter((g) => comEquipe || g !== GRUPO_EQUIPE).map((grupo) => ({
    grupo,
    itens: FUNCIONALIDADES.filter((f) => f.grupo === grupo),
  }))
}

/** Permissões padrão de cada perfil. Admin = todas; Gestor = todas as comuns; as especiais ninguém tem por padrão. */
export const PERFIL_PRESET: Record<Perfil, string[]> = {
  Admin: TODAS_FUNCIONALIDADES,
  Gestor: FUNCIONALIDADES_BASE,
  Colaborador: [
    '/dashboard',
    '/simulador',
    '/propostas',
    '/analises/break-even',
    '/analises/mix',
    '/analises/metas',
  ],
}

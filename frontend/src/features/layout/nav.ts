import {
  LayoutDashboard,
  Calculator,
  Route,
  Wallet,
  Building2,
  Users,
  FolderTree,
  FileText,
  Filter,
  Scale,
  SquareKanban,
  PieChart,
  Target,
  Briefcase,
  CalendarDays,
  ClipboardList,
  Handshake,
  Landmark,
  Layers,
  Settings2,
  Contact,
  Store,
  UserRound,
  Tags,
  ShieldCheck,
  History,
  ArrowLeftRight,
  PiggyBank,
  SlidersHorizontal,
  ListChecks,
  Link2,
  BarChart3,
  UserCog,
  LifeBuoy,
  Truck,
  type LucideIcon,
} from 'lucide-react'

export interface NavItem {
  label: string
  path: string
  icon: LucideIcon
  /** Item que executa uma ação em vez de abrir uma tela (ex.: abrir a janela do suporte). */
  acao?: 'suporte'
  /** Aparece para todos, sem permissão própria. */
  livre?: boolean
}

export interface NavGroup {
  label?: string
  /** Ícone do grupo (usado no cabeçalho recolhível do menu). */
  icon?: LucideIcon
  items: NavItem[]
}

// Os endereços seguem os antigos (/cadastros/...): mudar o grupo no menu não quebra link salvo.
export const navGroups: NavGroup[] = [
  {
    items: [{ label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard }],
  },
  {
    label: 'Cadastros',
    icon: Layers,
    items: [
      { label: 'Empresas', path: '/cadastros/unidades', icon: Building2 },
      { label: 'Clientes', path: '/cadastros/clientes', icon: Contact },
      { label: 'Fornecedores', path: '/cadastros/fornecedores', icon: Store },
      { label: 'Vendedores', path: '/cadastros/vendedores', icon: UserRound },
      { label: 'Serviços', path: '/cadastros/servicos', icon: Briefcase },
      { label: 'Veículos', path: '/cadastros/veiculos', icon: Truck },
      // Taxas e Seguros e Tipos de Custo ficam ocultos; as rotas continuam existindo.
      // O funcionário é o usuário do portal: cadastro e permissões no mesmo lugar.
      { label: 'Funcionários', path: '/cadastros/usuarios', icon: Users },
    ],
  },
  {
    label: 'Comercial',
    icon: Handshake,
    items: [
      { label: 'Pricing', path: '/simulador', icon: Calculator },
      { label: 'Proposta', path: '/propostas', icon: Route },
      { label: 'CRM', path: '/crm', icon: SquareKanban },
      { label: 'Agenda', path: '/agenda', icon: CalendarDays },
      { label: 'Metas', path: '/analises/metas', icon: Target },
    ],
  },
  {
    label: 'Parametrizações',
    icon: Settings2,
    items: [
      { label: 'Dados da Operação', path: '/cadastros/campos-operacao', icon: SlidersHorizontal },
      { label: 'Ficha Técnica', path: '/cadastros/fichas-tecnicas', icon: ListChecks },
      { label: 'Modelos de Proposta', path: '/cadastros/modelos-proposta', icon: FileText },
      { label: 'Funis do CRM', path: '/cadastros/funis', icon: Filter },
      { label: 'Aprovadores e Regras', path: '/cadastros/aprovadores', icon: ShieldCheck },
    ],
  },
  {
    label: 'Financeiro',
    icon: Landmark,
    items: [
      { label: 'Entradas e Saídas', path: '/financeiro/entradas-saidas', icon: ArrowLeftRight },
      { label: 'Caixa', path: '/financeiro/caixa', icon: PiggyBank },
      { label: 'Conciliação', path: '/financeiro/conciliacao', icon: Link2 },
      { label: 'Despesas Fixas (DF)', path: '/cadastros/custos-fixos', icon: Wallet },
      { label: 'Plano de Contas', path: '/cadastros/plano-contas', icon: FolderTree },
      { label: 'Centro de Custo', path: '/cadastros/categorias', icon: Tags },
    ],
  },
  {
    label: 'Relatórios',
    icon: BarChart3,
    items: [
      { label: 'Break-even', path: '/analises/break-even', icon: Scale },
      { label: 'Mix / Equilíbrio', path: '/analises/mix', icon: PieChart },
      { label: 'RPO (Orçado × Real)', path: '/analises/rpo', icon: ClipboardList },
    ],
  },
  {
    label: 'Administrativo',
    icon: UserCog,
    items: [
      // Abre a janela do suporte (canto inferior direito). Vira tela quando houver o módulo de chamados.
      { label: 'Suporte (prévia)', path: '#suporte', icon: LifeBuoy, acao: 'suporte', livre: true },
      { label: 'Auditoria', path: '/cadastros/auditoria', icon: History },
    ],
  },
]

/**
 * Filtra os grupos/itens visíveis para o conjunto de permissões do usuário.
 * `perms` = chaves (rotas) liberadas. `null`/`undefined` = libera tudo
 * (fallback quando o usuário logado não está cadastrado).
 */
export function visibleGroups(perms: string[] | null | undefined): NavGroup[] {
  return navGroups
    .map((g) => ({
      ...g,
      items: g.items.filter((it) => !perms || it.livre || perms.includes(it.path)),
    }))
    .filter((g) => g.items.length > 0)
}

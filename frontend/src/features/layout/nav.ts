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
  ShieldPlus,
  Mail,
  Percent,
  History,
  ArrowLeftRight,
  PiggyBank,
  SlidersHorizontal,
  ListChecks,
  Link2,
  BarChart3,
  UserCog,
  LifeBuoy,
  FolderOpen,
  ReceiptText,
  LineChart,
  LayoutTemplate,
  Truck,
  Plug,
  IdCard,
  Blocks,
  ChartColumnDecreasing,
  Hash,
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
      // Nasce desligado: a equipe ELROND liga em Administrativo › Módulos do sistema.
      { label: 'Motoristas', path: '/cadastros/motoristas', icon: IdCard },
      { label: 'Apólices de seguro', path: '/cadastros/apolices', icon: ShieldPlus },
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
      // Protótipo (dados de exemplo): só com a permissão especial "Ver protótipos".
      { label: 'Contratos', path: '/contratos', icon: FolderOpen },
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
      { label: 'Tabela de ICMS', path: '/cadastros/icms', icon: Percent },
      { label: 'Ficha Técnica', path: '/cadastros/fichas-tecnicas', icon: ListChecks },
      { label: 'Modelos de Proposta', path: '/cadastros/modelos-proposta', icon: FileText },
      { label: 'Funis do CRM', path: '/cadastros/funis', icon: Filter },
      { label: 'Modelos de Contrato', path: '/cadastros/modelos-contrato', icon: LayoutTemplate },
      { label: 'Aprovadores e Regras', path: '/cadastros/aprovadores', icon: ShieldCheck },
    ],
  },
  {
    label: 'Financeiro',
    icon: Landmark,
    items: [
      // Protótipo (dados de exemplo): só com a permissão especial "Ver protótipos".
      { label: 'Faturamento', path: '/financeiro/faturamento', icon: ReceiptText },
      { label: 'Entradas e Saídas', path: '/financeiro/entradas-saidas', icon: ArrowLeftRight },
      { label: 'Caixa', path: '/financeiro/caixa', icon: PiggyBank },
      { label: 'Conciliação', path: '/financeiro/conciliacao', icon: Link2 },
      { label: 'Despesas Fixas (DF)', path: '/cadastros/custos-fixos', icon: Wallet },
      { label: 'Plano de Contas', path: '/cadastros/plano-contas', icon: FolderTree },
      { label: 'Centro de Custo', path: '/cadastros/categorias', icon: Tags },
    ],
  },
  {
    label: 'Gerencial',
    icon: BarChart3,
    items: [
      // Protótipo: a base é real (DF, metas, fator); os cenários ficam no navegador.
      { label: 'Projeção', path: '/analises/projecao', icon: LineChart },
      { label: 'Break-even', path: '/analises/break-even', icon: Scale },
      { label: 'Curva ABC', path: '/analises/curva-abc', icon: ChartColumnDecreasing },
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
      // Só o perfil Suporte (a equipe ELROND): bancos das empresas.
      { label: 'Integrações Bancárias', path: '/administrativo/integracoes', icon: Plug },
      // Só o perfil Suporte: servidor de e-mail do ambiente.
      { label: 'Integração SMTP', path: '/administrativo/smtp', icon: Mail },
      // Só o perfil Suporte: o que o menu deste ambiente mostra.
      { label: 'Módulos do sistema', path: '/administrativo/modulos', icon: Blocks },
      // Só o perfil Suporte: de onde parte a numeração da fatura, NF, CT-e... (implantação).
      { label: 'Numerações', path: '/administrativo/numeracoes', icon: Hash },
    ],
  },
]

/**
 * Filtra os grupos/itens visíveis para o conjunto de permissões do usuário.
 * `perms` = chaves (rotas) liberadas. `null`/`undefined` = libera tudo
 * (fallback quando o usuário logado não está cadastrado).
 */
export function visibleGroups(perms: string[] | null | undefined, desligados: string[] = []): NavGroup[] {
  return navGroups
    .map((g) => ({
      ...g,
      // Desligado em Módulos do sistema some do menu do ambiente inteiro (a tela de módulos nunca).
      items: g.items.filter((it) => (!perms || it.livre || perms.includes(it.path)) && (it.path === '/administrativo/modulos' || !desligados.includes(it.path))),
    }))
    .filter((g) => g.items.length > 0)
}

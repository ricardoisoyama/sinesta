export type TipoPagina = 'capa' | 'conteudo' | 'composicao' | 'sobre' | 'escopo' | 'proximos'

export const TIPOS_PAGINA: { tipo: TipoPagina; label: string }[] = [
  { tipo: 'capa', label: 'Capa' },
  { tipo: 'sobre', label: 'Quem somos' },
  { tipo: 'composicao', label: 'Composição do investimento' },
  { tipo: 'escopo', label: 'Escopo e condições' },
  { tipo: 'proximos', label: 'Próximos passos' },
  { tipo: 'conteudo', label: 'Texto livre' },
]

/** Um bloco editável de uma página (indicador, cartão, linha de lista, passo...). */
export interface ItemPagina {
  /** Seção da página: destaque, apoio, modulo, contemplado, premissa, fora, validade, faixa, passo, aceite, tributacao... */
  grupo: string
  titulo: string
  texto: string
}

/** Uma página do modelo de proposta. */
export interface Pagina {
  id: string
  tipo: TipoPagina
  titulo: string
  /** Capa: subtítulo. Demais páginas: o rótulo pequeno acima do título (ex.: "Quem somos"). */
  subtitulo: string
  /** Texto da página (HTML do editor rico): conteúdo, introdução ou o objetivo da capa. */
  conteudo: string
  /** Blocos das páginas estruturadas. */
  itens?: ItemPagina[]
}

/** Modelo (template) de proposta, amarrado a uma empresa. Composto por páginas. */
export interface ModeloProposta {
  id: string
  empresaId: string
  nome: string
  /** Cor de destaque (rótulos, números, detalhes). */
  cor: string
  /** Cor principal: fundo da capa, da última página e das faixas. */
  corPrincipal?: string
  /** Logo para fundo escuro (capa e última página), em data URL. Vazio = o logo da empresa num selo claro. */
  logoCapa?: string
  rodapeEmpresa: string
  /** Contato padrão: vale quando a proposta não tem vendedor nem quem a gerou com contato. */
  responsavel: string
  email: string
  telefone: string
  site: string
  paginas: Pagina[]
  /** Modelo nunca é apagado: inativo some da escolha, propostas antigas seguem imprimindo. */
  status: 'ativo' | 'inativo'
}

export const COR_PRINCIPAL_PADRAO = '#0D532D'

const it = (grupo: string, titulo: string, texto = ''): ItemPagina => ({ grupo, titulo, texto })

/** Página nova já com um conteúdo de partida (o da proposta Sinesta), para editar. */
export function novaPagina(tipo: TipoPagina): Pagina {
  const id = crypto.randomUUID()
  switch (tipo) {
    case 'capa':
      return {
        id,
        tipo,
        titulo: 'SINESTA Tecnologia',
        subtitulo: 'Precificação, CRM, agenda e financeiro em um só sistema, com implantação e suporte.',
        conteudo: 'Apresentar a solução, a composição do investimento, o escopo e os próximos passos para colocar a plataforma em uso na sua empresa.',
      }
    case 'sobre':
      return {
        id,
        tipo,
        titulo: 'Tecnologia feita para quem vende serviços',
        subtitulo: 'Quem somos',
        conteudo:
          '<p>A Sinesta desenvolve e opera o ELROND, plataforma que reúne a precificação, o comercial e o financeiro de empresas de serviços. A proposta é simples: preço calculado com o custo real da operação, proposta saindo do mesmo lugar e o financeiro acompanhando o que foi vendido.</p>',
        itens: [
          it('destaque', '[indicador]', 'Ex.: clientes atendidos, anos de mercado'),
          it('destaque', '[indicador]', 'Ex.: propostas geradas na plataforma'),
          it('destaque', '[indicador]', 'Ex.: tempo médio de implantação'),
          it('titulo-apoio', 'Como vamos apoiar a sua operação'),
          it('apoio', 'Implantação', 'Cadastro das empresas, ficha técnica de custos, despesas fixas e metas, para o primeiro preço já sair certo.'),
          it('apoio', 'Suporte', 'Atendimento à equipe no dia a dia, com acompanhamento do uso e dúvidas resolvidas por quem conhece a operação.'),
          it('apoio', 'Evolução', 'Melhorias contínuas na plataforma, com novas funções e ajustes a partir do que a sua empresa precisa.'),
          it('titulo-modulos', 'Módulos da plataforma'),
          ...['Pricing', 'Ficha técnica', 'CRM', 'Agenda', 'Propostas', 'Financeiro', 'Relatórios'].map((m) => it('modulo', m)),
        ],
      }
    case 'composicao':
      return {
        id,
        tipo,
        titulo: 'O que está incluído e quanto custa',
        subtitulo: 'Composição do investimento',
        conteudo: '<p>Cada linha é um serviço precificado, com os dados da operação e a quantidade combinados com você.</p>',
        itens: [it('tributacao', 'Sujeita às alíquotas vigentes')],
      }
    case 'escopo':
      return {
        id,
        tipo,
        titulo: 'Escopo, premissas e limites',
        subtitulo: 'Escopo e condições',
        conteudo: '<p>O que esta proposta cobre, o que consideramos para chegar ao valor e o que fica de fora.</p>',
        itens: [
          ...[
            'Acesso à plataforma no ambiente exclusivo da empresa',
            'Cadastro das empresas, usuários e permissões',
            'Parametrização da ficha técnica, despesas fixas e metas',
            'Modelo de proposta com a identidade da empresa',
            'Treinamento da equipe que vai operar',
          ].map((t) => it('contemplado', t)),
          ...[
            'Quantidade de usuários e empresas informada nesta proposta',
            'Dados de custos e despesas fornecidos pela empresa',
            'Uso por navegador, com acesso à internet',
            'Um responsável da empresa para validar a implantação',
          ].map((t) => it('premissa', t)),
          ...[
            'Integrações com outros sistemas não descritas aqui',
            'Migração de histórico além dos cadastros iniciais',
            'Desenvolvimentos sob medida e relatórios exclusivos',
            'Equipamentos, internet e licenças de terceiros',
          ].map((t) => it('fora', t)),
          it('validade', 'Validade e reajuste', 'Mudança no número de usuários, empresas ou no escopo pode exigir revisão do investimento. Reajuste anual pelo índice combinado em contrato.'),
          it('faixa', 'Seus dados são da sua empresa.', 'Ambiente separado, acesso por usuário e permissão, e trilha de auditoria de tudo o que é alterado.'),
        ],
      }
    case 'proximos':
      return {
        id,
        tipo,
        titulo: 'Que tal um café para avançarmos?',
        subtitulo: 'Próximos passos',
        conteudo: '<p>Se a solução fizer sentido, estes são os próximos alinhamentos para colocar a plataforma em uso.</p>',
        itens: [
          it('passo', 'Aprovar a proposta', 'Responda com "de acordo" ou assine o aceite abaixo para seguirmos.'),
          it('passo', 'Reunir os dados da operação', 'Custos, despesas fixas, metas e cadastros que vão para a plataforma.'),
          it('passo', 'Agendar a implantação', 'Definimos as datas de parametrização e de treinamento da equipe.'),
          it('aceite', 'Aceite da proposta'),
          it('encerramento', 'Obrigado pelo tempo e pela análise'),
        ],
      }
    default:
      return { id, tipo: 'conteudo', titulo: 'Nova seção', subtitulo: '', conteudo: '' }
  }
}

/** As 5 páginas do modelo novo (capa, quem somos, composição, escopo, próximos passos). */
export const paginasPadrao = (): Pagina[] => (['capa', 'sobre', 'composicao', 'escopo', 'proximos'] as TipoPagina[]).map(novaPagina)

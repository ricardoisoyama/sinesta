/**
 * Base de conhecimento do suporte (versão inicial, escrita à mão). Cada artigo diz em que
 * telas ele aparece como "Para esta tela" e as palavras que o assistente usa para achá-lo.
 * Quando a wiki existir, esta lista vira o conteúdo dela.
 */
export interface Artigo {
  id: string
  titulo: string
  /** Nome da tela como aparece no menu. */
  tela: string
  /** Rotas onde o artigo aparece em "Para esta tela" (prefixo). */
  rotas: string[]
  resumo: string
  passos: string[]
  dica?: string
  /** Termos extras para a busca e para o assistente (sem acento, minúsculos). */
  palavras: string[]
}

export const ARTIGOS: Artigo[] = [
  {
    id: 'pricing',
    titulo: 'Como precificar um serviço',
    tela: 'Pricing',
    rotas: ['/simulador'],
    resumo: 'O Pricing junta os Dados da Operação, as fichas técnicas e o fator da empresa para chegar ao preço de venda.',
    passos: [
      'Escolha a empresa no canto superior direito: o fator e os campos vêm dela.',
      'Preencha os Dados da operação (o primeiro bloco). Campos de quantidade multiplicam o preço; campos de valor somam ao custo.',
      'Em Custos da operação, escolha a ficha técnica e a quantidade de cada uma. O olho mostra a composição da ficha.',
      'Confira o Resultado: preço de venda, margem e desconto. Para usar um preço próprio, digite o valor e clique em "Usar este preço".',
      'Clique em "Adicionar à proposta" e, com os itens prontos, em "Gerar proposta".',
    ],
    dica: 'Preço editado ou margem abaixo do lucro da empresa deixa a proposta pendente de aprovação.',
    palavras: ['preco', 'precificar', 'precificacao', 'simulador', 'pv', 'venda', 'item', 'quantidade', 'usar este preco', 'editar preco', 'desconto'],
  },
  {
    id: 'ficha',
    titulo: 'Como montar a ficha técnica',
    tela: 'Ficha Técnica',
    rotas: ['/cadastros/fichas-tecnicas', '/simulador'],
    resumo: 'Cada empresa monta as colunas do seu jeito, como numa planilha. Cada linha da ficha fecha num custo que o Pricing usa.',
    passos: [
      'Escolha a empresa e crie as colunas: valor (R$), percentual sobre outra coluna, cálculo (fórmula), número, texto ou lista.',
      'Marque "entra no total" nas colunas que compõem o custo.',
      'Fórmulas usam o nome das colunas, por exemplo: salario_base * 20%.',
      'Cada linha é uma ficha (ex.: Porteiro diurno). Digite os valores direto no grid.',
    ],
    dica: 'O grid salva sozinho menos de um segundo depois da última alteração. O selo "Tudo salvo" confirma.',
    palavras: ['ficha', 'tecnica', 'coluna', 'formula', 'composicao', 'custo', 'salario', 'encargos', 'grid'],
  },
  {
    id: 'operacao',
    titulo: 'Dados da Operação: o que cada tipo de campo faz',
    tela: 'Dados da Operação',
    rotas: ['/cadastros/campos-operacao', '/simulador'],
    resumo: 'Os campos que aparecem no topo do Pricing são montados por empresa. Alguns só informam; outros mexem no preço.',
    passos: [
      'Texto, lista, data, número e cadastro só informam (aparecem na proposta).',
      'Quantidade multiplica o preço do item (ex.: número de postos).',
      'Valor (R$) soma ao custo da operação.',
      '% sobre o custo acrescenta um percentual ao custo.',
      'Um campo do tipo cadastro "cliente" já preenche o cliente da proposta.',
    ],
    palavras: ['campo', 'operacao', 'dados', 'multiplica', 'quantidade', 'tipo de campo', 'efeito'],
  },
  {
    id: 'fator',
    titulo: 'Como o fator é calculado',
    tela: 'Empresas',
    rotas: ['/cadastros/unidades', '/simulador'],
    resumo: 'O fator é o número que multiplica o custo para chegar ao preço. Ele é igual ao da Matriz de Preço da planilha.',
    passos: [
      'DF% = despesas fixas divididas pela base escolhida na meta: a média mensal do ano (preço estável) ou a meta do mês corrente (o preço muda a cada mês).',
      'Markup = DF% + impostos + comissão + despesa financeira + outras + lucro.',
      'No Pricing, comissão e lucro podem ser ajustados por linha. Lucro abaixo do da empresa vai para aprovação. Os impostos ficam só no cadastro da empresa.',
      'Fator = 1 ÷ (1 − markup).',
      'Abra a empresa, aba Impostos: o painel ao lado mostra o fator e cada parte dele ao vivo.',
    ],
    dica: 'Mudou uma despesa fixa, a meta ou um imposto? O fator muda junto, em todas as telas.',
    palavras: ['fator', 'markup', 'df', 'dv', 'lucro', 'imposto', 'comissao', 'mudou', 'calculo', 'empresa'],
  },
  {
    id: 'despesas-fixas',
    titulo: 'Despesas fixas e o DF',
    tela: 'Despesas Fixas (DF)',
    rotas: ['/cadastros/custos-fixos'],
    resumo: 'As despesas fixas da empresa formam o DF, que entra no fator.',
    passos: [
      'Cadastre cada despesa com valor mensal, empresa e centro de custo.',
      'Despesa com início no futuro já entra no DF.',
      'Ela só sai do DF quando tem data de fim e essa data já passou.',
      'Para tirar uma despesa sem apagar o histórico, inative.',
    ],
    palavras: ['despesa', 'fixa', 'fixas', 'df', 'custo fixo', 'aluguel', 'salario', 'inativar'],
  },
  {
    id: 'metas',
    titulo: 'Meta mensal da empresa',
    tela: 'Metas',
    rotas: ['/analises/metas', '/simulador'],
    resumo: 'A meta é por empresa e mês a mês. Ela é a base do DF%: sem meta, o Pricing não calcula o preço.',
    passos: [
      'Clique em "Nova meta", escolha a empresa e o ano.',
      'Informe o valor anual (ou "% sobre o ano anterior", quando existe a meta dele): é o total que manda.',
      'Distribua pelos meses em R$ ou em % do ano; só salva quando os meses fecham exatamente o valor anual.',
      'Escolha a base do preço: média mensal do ano (preço estável) ou meta do mês corrente (muda a cada mês).',
      'Marque a meta como principal: é ela que entra no fator.',
    ],
    palavras: ['meta', 'mensal', 'anual', 'faturamento', 'principal', 'bloqueado', 'sem meta', 'média', 'ano anterior', 'sazonalidade'],
  },
  {
    id: 'proposta-aprovacao',
    titulo: 'Por que minha proposta ficou pendente',
    tela: 'Proposta',
    rotas: ['/propostas'],
    resumo: 'A proposta pede aprovação quando o preço foi editado ou a margem ficou abaixo do lucro da empresa.',
    passos: [
      'A regra de alçada fica em Parametrizações › Aprovadores e Regras (tipo Proposta).',
      'Os aprovadores da faixa assinam na lista de Propostas.',
      'Depois de aprovada, a proposta segue para envio ao cliente.',
    ],
    palavras: ['proposta', 'pendente', 'aprovar', 'aprovacao', 'margem', 'minimo', 'alcada'],
  },
  {
    id: 'lancamentos',
    titulo: 'Aprovar e baixar lançamentos financeiros',
    tela: 'Entradas e Saídas',
    rotas: ['/financeiro/entradas-saidas'],
    resumo: 'Todo lançamento a pagar ou a receber nasce pendente e só pode ser baixado depois de aprovado.',
    passos: [
      'O gestor cria a regra em Parametrizações › Aprovadores e Regras, tipo "Lançamentos financeiros": faixa de valor, a pagar/receber e os aprovadores.',
      'Na lista, clique na coluna Aprovação para ver quem já assinou e quem falta.',
      'Todos os aprovadores da regra precisam assinar. Reprovar pede um motivo.',
      'Com o lançamento aprovado, o botão de baixa libera.',
    ],
    dica: 'Sem regra que cubra o valor, ninguém consegue aprovar. A tela avisa o que falta.',
    palavras: ['lancamento', 'pagar', 'receber', 'baixa', 'baixar', 'liquidar', 'aprovar', 'aprovacao', 'reprovar', 'financeiro', 'parcela'],
  },
  {
    id: 'conciliacao',
    titulo: 'Conciliar o extrato do banco',
    tela: 'Conciliação',
    rotas: ['/financeiro/conciliacao'],
    resumo: 'Importe o .ofx do banco e feche cada linha no próprio grid: aceitar, trocar, criar ou ignorar.',
    passos: [
      'Escolha a carteira e clique em "Importar .ofx". Reimportar o mesmo arquivo não duplica linhas.',
      'O sistema sugere o par de cada linha pelo valor, nome, documento e data.',
      'Aceite a sugestão (ou Enter na linha). Se o lançamento estava em aberto, a baixa sai na data do extrato.',
      'Sem par? Crie o lançamento a partir da linha. Marque "Lembrar" para o sistema reconhecer a próxima vez.',
    ],
    dica: 'Lançamento em aberto só concilia depois de aprovado.',
    palavras: ['conciliacao', 'conciliar', 'extrato', 'ofx', 'banco', 'importar', 'vincular', 'ignorar'],
  },
  {
    id: 'carteiras',
    titulo: 'Cadastrar uma carteira (conta bancária ou caixa)',
    tela: 'Caixa',
    rotas: ['/financeiro/caixa', '/financeiro/entradas-saidas'],
    resumo: 'A carteira é por onde o dinheiro entra e sai. Lançamentos e extratos pertencem a uma carteira.',
    passos: [
      'Em Financeiro › Caixa, clique em "Nova carteira".',
      'Informe nome, tipo (banco, caixa ou cartão), banco/agência/conta e o saldo inicial com a data.',
      'Para editar, use o lápis no canto do card da carteira.',
    ],
    palavras: ['carteira', 'conta', 'banco', 'caixa', 'saldo', 'cartao'],
  },
  {
    id: 'permissoes',
    titulo: 'Liberar uma tela para um funcionário',
    tela: 'Funcionários',
    rotas: ['/cadastros/usuarios'],
    resumo: 'O acesso é por funcionalidade. O gestor marca o que cada funcionário pode usar.',
    passos: [
      'Abra o funcionário em Cadastros › Funcionários.',
      'Na matriz de permissões, ligue as telas e as funções especiais (ex.: ver o cálculo do preço).',
      'Gestor recebe as funcionalidades básicas automaticamente; as especiais começam desligadas.',
      'Usuários com o perfil Suporte são da equipe ELROND: aparecem na lista, mas não podem ser alterados.',
    ],
    palavras: ['permissao', 'acesso', 'liberar', 'usuario', 'funcionario', 'perfil', 'gestor', 'suporte', 'nao aparece', 'menu'],
  },
]

export const artigoPorId = (id: string) => ARTIGOS.find((a) => a.id === id)

/** Artigos ligados à tela aberta. */
export const artigosDaTela = (rota: string) => ARTIGOS.filter((a) => a.rotas.some((r) => rota === r || rota.startsWith(`${r}/`)))

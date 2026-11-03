namespace Elrond.Application.Common;

/// <summary>
/// Catálogo de funcionalidades (RBAC) espelhado do front. As chaves são as rotas.
/// Mantido em sincronia com `frontend/src/features/usuarios/funcionalidades.ts`.
/// </summary>
public static class Funcionalidades
{
    /// <summary>Funcionalidades comuns (telas e ações do dia a dia). Gestor recebe todas ao vivo.</summary>
    public static readonly IReadOnlyList<string> Base = new[]
    {
        "/dashboard",
        "/simulador",
        "/propostas",
        "/crm",
        "/agenda",
        "/cadastros/custos-fixos",
        // Financeiro (telas em fase de layout: dados de exemplo no front).
        "/financeiro/entradas-saidas",
        "/financeiro/caixa",
        "/financeiro/conciliacao",
        // Não é tela: aprova lançamentos financeiros (precisa também estar na regra de aprovação).
        "/financeiro/aprovar",
        // Cadastros parametrizáveis (Dados da Operação e Ficha Técnica) que o Pricing usa.
        "/cadastros/fichas-tecnicas",
        "/cadastros/campos-operacao",
        // Tabela de ICMS (origem × destino) que o campo ICMS dos Dados da Operação usa.
        "/cadastros/icms",
        "/cadastros/plano-contas",
        "/cadastros/taxas",
        "/cadastros/unidades",
        // Altera o lucro da empresa (compõe o fator). Comum, não especial: o Gestor já nasce
        // com ela (decisão de 01/10/2026); para colaborador, liga no cadastro do funcionário.
        "/cadastros/unidades/markup",
        "/cadastros/clientes",
        "/cadastros/fornecedores",
        // Apólices de seguro (base do ad valorem), separadas do fornecedor seguradora em 17/10/2026.
        "/cadastros/apolices",
        // Feriados estaduais e municipais (os nacionais o sistema já sabe): dia útil dos vencimentos.
        "/cadastros/feriados",
        "/cadastros/vendedores",
        "/cadastros/servicos",
        "/cadastros/veiculos",
        // Motoristas (o menu só aparece se a equipe ELROND ligar o módulo no ambiente).
        "/cadastros/motoristas",
        // "/cadastros/tipos-custo" saiu em 01/10/2026: os tipos de custo viraram a ficha Tecnologia.
        "/cadastros/categorias",
        "/cadastros/aprovadores",
        // Não é tela: libera o botão de aprovar proposta na lista.
        "/propostas/aprovar",
        // "/cadastros/validades" saiu em 08/10/2026: as validades passaram para a aba Proposta da empresa.
        "/cadastros/funis",
        "/cadastros/modelos-proposta",
        "/cadastros/usuarios",
        // Histórico de alterações (quem fez o quê): tela de configuração, normalmente só gestor.
        "/cadastros/auditoria",
        "/analises/break-even",
        "/analises/mix",
        "/analises/rpo",
        "/analises/metas",
        // Contratos, Central de Faturamento e Projeção (liberadas por perfil em 17/10/2026).
        "/contratos",
        "/cadastros/modelos-contrato",
        "/financeiro/faturamento",
        "/analises/projecao",
        // Curva ABC (Pareto) de clientes, serviços, fornecedores, plano de contas e centro de custo (25/10/2026).
        "/analises/curva-abc",
    };

    /// <summary>
    /// Permissões ESPECIAIS: desligadas por padrão para todos os perfis, inclusive Gestor.
    /// Só valem quando gravadas explicitamente no cadastro do funcionário.
    /// </summary>
    public static readonly IReadOnlyList<string> Extras = new[]
    {
        // Mostra a composição do preço (custos, fator, impostos, margem) no Pricing.
        "/simulador/calculo",
        // Botão de conferência na lista de propostas: custo base, DF, DV, MCU e margem de cada item.
        "/propostas/conferencia",
        // Transfere a carteira de clientes de um vendedor para outro.
        "/cadastros/vendedores/transferir",
        // Altera forma e prazo de pagamento (que vêm do cliente) na proposta.
        "/propostas/alterar-pagamento",
        // Emite, consulta e cancela NFS-e pelo motor fiscal, e configura o provedor da empresa.
        "/fiscal/nfse",
    };

    /// <summary>
    /// Permissões ADMINISTRATIVAS: só o perfil Admin (a nossa equipe) tem, sempre. Não se concedem
    /// a Gestor nem a Colaborador e nem aparecem para o cliente.
    /// </summary>
    public static readonly IReadOnlyList<string> Administrativas = new[]
    {
        // Implantação: liga e configura a integração bancária de cada empresa (Administrativo › Integrações).
        "/administrativo/integracoes",
        // Página provisória de testes de boleto (/boleto).
        "/financeiro/boleto-teste",
        // Servidor de e-mail do ambiente (Administrativo › Integração SMTP).
        "/administrativo/smtp",
        // Piloto: mandar pagamentos (Pix) ao banco pelas Entradas e Saídas.
        "/financeiro/pagamento-banco",
        // Implantação: quais menus o ambiente mostra (Administrativo › Módulos do sistema).
        "/administrativo/modulos",
        // Implantação: de onde parte a numeração da fatura, NF-e, NFS-e, CT-e e MDF-e (Administrativo › Numerações).
        "/administrativo/numeracoes",
    };

    /// <summary>O que pode ficar gravado no cadastro (as administrativas não se gravam: vêm do perfil).</summary>
    public static readonly IReadOnlyList<string> Concediveis = Base.Concat(Extras).ToList();

    public static readonly IReadOnlyList<string> Todas = Concediveis.Concat(Administrativas).ToList();

    /// <summary>
    /// Permissões EFETIVAS de um usuário: Admin tem todas, ao vivo. Gestor recebe todas as comuns
    /// ao vivo (features novas aparecem sem re-semear) mais as especiais que tiver gravadas.
    /// Colaborador usa só as gravadas. Administrativa gravada em quem não é Admin não vale.
    /// </summary>
    public static IReadOnlyList<string> Efetivas(string perfil, IReadOnlyList<string> permissoes) => perfil switch
    {
        Perfis.Admin => Todas,
        Perfis.Gestor => Base.Concat(permissoes.Where(Extras.Contains)).Distinct().ToList(),
        _ => permissoes.Where(Concediveis.Contains).ToList(),
    };

    /// <summary>Preset de permissões por perfil. Admin = todas; Gestor = todas as comuns; especiais ninguém tem por padrão.</summary>
    public static IReadOnlyList<string> Preset(string perfil) => perfil switch
    {
        Perfis.Admin => Todas,
        Perfis.Gestor => Base,
        _ => new[]
        {
            "/dashboard",
            "/simulador",
            "/propostas",
            "/analises/break-even",
            "/analises/mix",
            "/analises/metas",
        },
    };
}

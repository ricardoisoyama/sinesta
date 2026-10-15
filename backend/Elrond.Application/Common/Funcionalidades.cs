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
        "/cadastros/plano-contas",
        "/cadastros/taxas",
        "/cadastros/unidades",
        // Altera o lucro da empresa (compõe o fator). Comum, não especial: o Gestor já nasce
        // com ela (decisão de 01/10/2026); para colaborador, liga no cadastro do funcionário.
        "/cadastros/unidades/markup",
        "/cadastros/clientes",
        "/cadastros/fornecedores",
        "/cadastros/vendedores",
        "/cadastros/servicos",
        "/cadastros/veiculos",
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
        // Página provisória de testes de boleto (/boleto): faturas da SIIMP → boleto no banco.
        "/financeiro/boleto-teste",
        // Implantação: liga e configura a integração bancária de uma empresa (só a nossa equipe).
        "/financeiro/integracao-bancaria",
    };

    public static readonly IReadOnlyList<string> Todas = Base.Concat(Extras).ToList();

    /// <summary>
    /// Permissões EFETIVAS de um usuário: Gestor recebe todas as comuns ao vivo (features
    /// novas aparecem sem re-semear) mais as especiais que tiver gravadas; Colaborador usa
    /// só as gravadas.
    /// </summary>
    public static IReadOnlyList<string> Efetivas(string perfil, IReadOnlyList<string> permissoes) =>
        perfil == "Gestor"
            ? Base.Concat(permissoes.Where(Extras.Contains)).Distinct().ToList()
            : permissoes;

    /// <summary>Preset de permissões por perfil. Gestor = todas as comuns; especiais ninguém tem por padrão.</summary>
    public static IReadOnlyList<string> Preset(string perfil) => perfil == "Gestor"
        ? Base
        : new[]
        {
            "/dashboard",
            "/simulador",
            "/propostas",
            "/analises/break-even",
            "/analises/mix",
            "/analises/metas",
        };
}

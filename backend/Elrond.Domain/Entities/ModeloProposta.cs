using Elrond.Domain.Common;

namespace Elrond.Domain.Entities;

/// <summary>Um bloco editável de uma página (indicador, cartão, linha de lista, passo...).</summary>
public class ItemPagina
{
    /// <summary>Seção da página a que o bloco pertence (ex.: destaque, apoio, contemplado, passo).</summary>
    public string Grupo { get; set; } = string.Empty;
    public string Titulo { get; set; } = string.Empty;
    public string Texto { get; set; } = string.Empty;
}

/// <summary>Uma página do modelo de proposta.</summary>
public class Pagina
{
    public string Id { get; set; } = string.Empty;
    /// <summary>capa | conteudo | composicao | sobre | escopo | proximos.</summary>
    public string Tipo { get; set; } = "conteudo";
    public string Titulo { get; set; } = string.Empty;
    public string Subtitulo { get; set; } = string.Empty;
    /// <summary>HTML (editor rico) — texto da página (conteúdo, introdução, objetivo da capa).</summary>
    public string Conteudo { get; set; } = string.Empty;
    /// <summary>Blocos editáveis das páginas estruturadas (Quem somos, Escopo, Próximos passos...).</summary>
    public List<ItemPagina> Itens { get; set; } = new();
}

/// <summary>Modelo (template) de proposta comercial, amarrado a uma empresa. Composto por páginas.</summary>
public class ModeloProposta : Rastreavel, IEntity, IInativavel
{
    public string Id { get; set; } = string.Empty;
    /// <summary>"ativo" | "inativo" (modelo inativo some da escolha, mas propostas antigas ainda imprimem com ele).</summary>
    public string Status { get; set; } = "ativo";
    public string EmpresaId { get; set; } = string.Empty;
    public string Nome { get; set; } = string.Empty;

    /// <summary>Cor de destaque aplicada ao documento todo.</summary>
    public string Cor { get; set; } = "#e8702f";
    /// <summary>Cor principal: fundo da capa, da última página e das faixas.</summary>
    public string CorPrincipal { get; set; } = "#0D532D";
    /// <summary>Logo para fundo escuro (capa), em data URL. Vazio = o logo da empresa num selo claro.</summary>
    public string LogoCapa { get; set; } = string.Empty;

    // Rodapé / contato (vale para o documento)
    public string RodapeEmpresa { get; set; } = string.Empty;
    public string Responsavel { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Telefone { get; set; } = string.Empty;
    public string Site { get; set; } = string.Empty;

    /// <summary>Páginas do documento (ordem = ordem de impressão).</summary>
    public List<Pagina> Paginas { get; set; } = new();
}

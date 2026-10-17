using Elrond.Domain.Common;

namespace Elrond.Domain.Entities;

/// <summary>
/// Campo do bloco "Dados da operação" da Precificação, configurado por empresa (uma linha por campo).
/// Nada é fixo: o usuário cria cliente, cidade, quantidade... e o tipo + efeito dizem o que o
/// campo faz com o preço. Criar campo cria LINHA aqui, nunca coluna no banco.
/// </summary>
public class CampoOperacao : Rastreavel, IEntity, IInativavel
{
    public string Id { get; set; } = string.Empty;
    public string EmpresaId { get; set; } = string.Empty;
    /// <summary>Tipo de operação a que o campo pertence (Transporte, Armazenagem...).</summary>
    public string TipoOperacaoId { get; set; } = string.Empty;
    public string Nome { get; set; } = string.Empty;
    /// <summary>Identificador estável do campo (derivado do nome, único por empresa entre os ativos).</summary>
    public string Chave { get; set; } = string.Empty;
    /// <summary>
    /// texto | lista | cadastro | data | numero | valor | percentual | uf (combo das UFs) |
    /// cidade (busca na base IBGE, filtrada pela UF do campo uf mais próximo) |
    /// advalorem (percentual do seguro: preenche sozinho pela apólice e pela origem/destino).
    /// </summary>
    public string Tipo { get; set; } = "texto";
    /// <summary>informativo | multiplica (numero) | soma-custo (valor) | pct-custo (percentual).</summary>
    public string Efeito { get; set; } = "informativo";
    public bool Obrigatorio { get; set; }
    /// <summary>Largura no grid de 4 colunas: 1, 2 ou 4.</summary>
    public int Largura { get; set; } = 1;
    public int Ordem { get; set; }
    /// <summary>Opções quando Tipo = lista.</summary>
    public List<string> Opcoes { get; set; } = new();
    /// <summary>Origem quando Tipo = cadastro: cliente | fornecedor | vendedor | servico | veiculo.</summary>
    public string Cadastro { get; set; } = string.Empty;
    /// <summary>Texto do balão de ajuda na Precificação.</summary>
    public string Ajuda { get; set; } = string.Empty;
    public string Status { get; set; } = "ativo";

    // ── Tipo advalorem: de onde vem o percentual e sobre o que ele incide ──
    /// <summary>Tipo de apólice que dá o percentual (RCTR-C, RCF-DC...).</summary>
    public string Seguro { get; set; } = string.Empty;
    /// <summary>Chave do campo com o valor da mercadoria (o ad valorem incide sobre ele).</summary>
    public string CampoBase { get; set; } = string.Empty;
    /// <summary>Chaves dos campos de origem e destino (uf ou cidade).</summary>
    public string CampoOrigem { get; set; } = string.Empty;
    public string CampoDestino { get; set; } = string.Empty;
}

/// <summary>
/// Tipo de operação da empresa (Transporte, Armazenagem...): cada um tem o seu conjunto de campos
/// de Dados da Operação, e no Pricing a pessoa escolhe qual está precificando.
/// </summary>
public class TipoOperacao : Rastreavel, IEntity, IInativavel
{
    public string Id { get; set; } = string.Empty;
    public string EmpresaId { get; set; } = string.Empty;
    public string Nome { get; set; } = string.Empty;
    public int Ordem { get; set; }
    public string Status { get; set; } = "ativo";

    /// <summary>Id do tipo criado para as empresas que já tinham campos antes dos tipos existirem.</summary>
    public static string IdPadrao(string empresaId) => $"padrao-{empresaId}";
}

/// <summary>
/// A "Ficha" que o usuário vê: uma pasta da Ficha Técnica (Funcionários, Tecnologia...), com
/// as SUAS colunas e os seus itens. Cada empresa tem quantas quiser.
/// </summary>
public class FichaGrupo : Rastreavel, IEntity, IInativavel
{
    public string Id { get; set; } = string.Empty;
    public string EmpresaId { get; set; } = string.Empty;
    public string Nome { get; set; } = string.Empty;
    public int Ordem { get; set; }
    /// <summary>
    /// Como sai o total de cada item: vazio = soma das colunas marcadas "entra no total";
    /// preenchido = esta fórmula (ex.: valor_hora * horas).
    /// </summary>
    public string FormulaTotal { get; set; } = string.Empty;
    public string Status { get; set; } = "ativo";
}

/// <summary>
/// Coluna de uma ficha (uma linha por coluna). Substitui o Tipo de Custo: cada ficha monta as
/// suas (Funcionários: salário, encargos...; Tecnologia: valor mensal...).
/// </summary>
public class FichaColuna : Rastreavel, IEntity, IInativavel
{
    public string Id { get; set; } = string.Empty;
    public string EmpresaId { get; set; } = string.Empty;
    /// <summary>Ficha (pasta) dona da coluna.</summary>
    public string GrupoId { get; set; } = string.Empty;
    public string Nome { get; set; } = string.Empty;
    /// <summary>Nome usado nas fórmulas (ex.: salario_base). Único por ficha entre os ativos.</summary>
    public string Chave { get; set; } = string.Empty;
    /// <summary>valor | percentual | calculo | numero | texto | lista.</summary>
    public string Tipo { get; set; } = "valor";
    /// <summary>Entra na soma do total da ficha (só para tipos numéricos).</summary>
    public bool CompoeTotal { get; set; } = true;
    /// <summary>Chave da coluna base quando Tipo = percentual.</summary>
    public string Base { get; set; } = string.Empty;
    /// <summary>Expressão quando Tipo = calculo, ex.: (salario_base + adicional_noturno) * 70%.</summary>
    public string Formula { get; set; } = string.Empty;
    public List<string> Opcoes { get; set; } = new();
    public int Ordem { get; set; }
    public string Status { get; set; } = "ativo";
}

/// <summary>
/// Um ITEM de uma ficha (linha do grid: "Porteiro · Diurno", "Plano CRM - Ouro"). O total é o
/// custo usado no Pricing. (A tabela guarda o nome antigo, fichas_tecnicas.)
/// </summary>
public class FichaTecnica : Rastreavel, IEntity, IInativavel
{
    public string Id { get; set; } = string.Empty;
    public string EmpresaId { get; set; } = string.Empty;
    /// <summary>Ficha (pasta) do item; as colunas que valem para ele são as da mesma ficha.</summary>
    public string GrupoId { get; set; } = string.Empty;
    public string Nome { get; set; } = string.Empty;
    /// <summary>Total calculado pelo servidor a partir das colunas ativas (não vem do cliente).</summary>
    public decimal Total { get; set; }
    public int Ordem { get; set; }
    public string Status { get; set; } = "ativo";
}

/// <summary>Valor de uma célula da ficha técnica: ficha × coluna. Numérico ou texto, conforme a coluna.</summary>
public class FichaValor : Rastreavel, IEntity
{
    public string Id { get; set; } = string.Empty;
    public string FichaId { get; set; } = string.Empty;
    public string ColunaId { get; set; } = string.Empty;
    /// <summary>Valor (R$), número ou percentual (fração: 0,2 = 20%). Nulo para texto/lista.</summary>
    public decimal? Numero { get; set; }
    public string Texto { get; set; } = string.Empty;
}

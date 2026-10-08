using Elrond.Domain.Common;

namespace Elrond.Domain.Entities;

/// <summary>Pessoa de contato num cliente/fornecedor (lista com "+").</summary>
public class ContatoParceiro
{
    public string Id { get; set; } = string.Empty;
    public string Nome { get; set; } = string.Empty;
    public string Cargo { get; set; } = string.Empty;
    public string Telefone { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    /// <summary>"" | "influenciador" | "decisor" (perfil de compra; usado no CRM e na proposta).</summary>
    public string PerfilCompra { get; set; } = string.Empty;
    /// <summary>Parametrização de envio de documentos para este contato.</summary>
    public bool RecebeFatura { get; set; }
    public bool RecebeBoleto { get; set; }
    public bool RecebeNotaFiscal { get; set; }
}

/// <summary>Endereço (cliente, fornecedor e empresa). A cidade fica no campo próprio de cada cadastro, "Praia Grande - SP".</summary>
public class Endereco
{
    public string Cep { get; set; } = string.Empty;
    public string Logradouro { get; set; } = string.Empty;
    public string Numero { get; set; } = string.Empty;
    public string Complemento { get; set; } = string.Empty;
    public string Bairro { get; set; } = string.Empty;
    /// <summary>Estado / província (exterior; no Brasil a UF vai na cidade).</summary>
    public string Estado { get; set; } = string.Empty;
}

/// <summary>Dados bancários (aba comum a empresa, cliente, fornecedor e vendedor).</summary>
public class DadosBancarios
{
    public string Banco { get; set; } = string.Empty;
    public string Agencia { get; set; } = string.Empty;
    public string Conta { get; set; } = string.Empty;
    /// <summary>"" | "corrente" | "poupanca".</summary>
    public string TipoConta { get; set; } = string.Empty;
    public string Pix { get; set; } = string.Empty;
    // Conta no exterior (fornecedor estrangeiro).
    /// <summary>Titular da conta (beneficiary).</summary>
    public string Beneficiario { get; set; } = string.Empty;
    /// <summary>SWIFT/BIC do banco.</summary>
    public string Swift { get; set; } = string.Empty;
    /// <summary>IBAN ou número da conta no exterior.</summary>
    public string Iban { get; set; } = string.Empty;
    /// <summary>ABA (EUA), Sort code (Reino Unido), BSB (Austrália)...</summary>
    public string Roteamento { get; set; } = string.Empty;
}

/// <summary>Cliente atendido (destino das propostas).</summary>
public class Cliente : Rastreavel, IEntity, IInativavel
{
    public string Id { get; set; } = string.Empty;
    /// <summary>"juridica" ou "fisica".</summary>
    public string Tipo { get; set; } = "juridica";
    public string Nome { get; set; } = string.Empty;
    public string NomeFantasia { get; set; } = string.Empty;
    public string CpfCnpj { get; set; } = string.Empty;
    public string InscricaoEstadual { get; set; } = string.Empty;
    public string InscricaoMunicipal { get; set; } = string.Empty;
    /// <summary>Contato principal (legado; espelha o primeiro item de Contatos).</summary>
    public string Contato { get; set; } = string.Empty;
    public string Telefone { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Cidade { get; set; } = string.Empty;
    /// <summary>Rua, número, bairro e CEP (opcional nos registros antigos).</summary>
    public Endereco? Endereco { get; set; }
    public string Observacao { get; set; } = string.Empty;
    public string Status { get; set; } = "ativo";

    public List<ContatoParceiro> Contatos { get; set; } = new();
    /// <summary>Indústria, Serviços, Governo, Pessoa Física, Outros.</summary>
    public string Segmento { get; set; } = string.Empty;
    /// <summary>Nome do grupo econômico; empresas com o mesmo nome formam um grupo.</summary>
    public string GrupoEconomico { get; set; } = string.Empty;
    public string CentroCustoId { get; set; } = string.Empty;
    public DadosBancarios? Banco { get; set; }

    /// <summary>"" | "B2B" | "B2C" | "B2G".</summary>
    public string Perfil { get; set; } = string.Empty;
    public string VendedorSdrId { get; set; } = string.Empty;
    public string VendedorSalesId { get; set; } = string.Empty;
    public string VendedorCsId { get; set; } = string.Empty;
    /// <summary>Forma de pagamento combinada (Pix, Boleto...). Vai para a proposta.</summary>
    public string FormaPagamento { get; set; } = string.Empty;
    /// <summary>Prazo de pagamento em dias (0 = à vista).</summary>
    public int PrazoPagamentoDias { get; set; }
}

/// <summary>Fornecedor de despesas (vinculado aos custos fixos).</summary>
public class Fornecedor : Rastreavel, IEntity, IInativavel
{
    public string Id { get; set; } = string.Empty;
    public string Tipo { get; set; } = "juridica";
    public string Nome { get; set; } = string.Empty;
    public string NomeFantasia { get; set; } = string.Empty;
    public string CpfCnpj { get; set; } = string.Empty;
    public string InscricaoEstadual { get; set; } = string.Empty;
    public string InscricaoMunicipal { get; set; } = string.Empty;
    /// <summary>Contato principal (legado; espelha o primeiro item de Contatos).</summary>
    public string Contato { get; set; } = string.Empty;
    public string Telefone { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Cidade { get; set; } = string.Empty;
    /// <summary>Rua, número, bairro e CEP (opcional nos registros antigos).</summary>
    public Endereco? Endereco { get; set; }
    public string Observacao { get; set; } = string.Empty;
    public string Status { get; set; } = "ativo";

    public List<ContatoParceiro> Contatos { get; set; } = new();
    public string Segmento { get; set; } = string.Empty;
    public string GrupoEconomico { get; set; } = string.Empty;
    public string CentroCustoId { get; set; } = string.Empty;
    public DadosBancarios? Banco { get; set; }

    /// <summary>"" | "produto" | "servico".</summary>
    public string TipoFornecimento { get; set; } = string.Empty;
    /// <summary>"" | "fixo" | "variavel".</summary>
    public string NaturezaCusto { get; set; } = string.Empty;
    /// <summary>Conta do plano de contas em que as despesas deste fornecedor entram.</summary>
    public string PlanoContaId { get; set; } = string.Empty;
    /// <summary>Funcionário responsável pelas compras.</summary>
    public string CompradorId { get; set; } = string.Empty;
    /// <summary>Funcionários que aprovam compras deste fornecedor.</summary>
    public List<string> Aprovadores { get; set; } = new();
    /// <summary>Limite de compra sem aprovação (R$). 0 = sem limite.</summary>
    public decimal LimiteCompra { get; set; }

    /// <summary>Fornecedor do exterior: sem CNPJ/IE/IM; usa os campos abaixo.</summary>
    public bool Externo { get; set; }
    public string Pais { get; set; } = string.Empty;
    /// <summary>Identificação fiscal no país (Tax ID, VAT, EIN...).</summary>
    public string TaxId { get; set; } = string.Empty;
    /// <summary>Moeda de cobrança (USD, EUR...).</summary>
    public string Moeda { get; set; } = string.Empty;
    /// <summary>Endereço livre no exterior.</summary>
    public string EnderecoExterior { get; set; } = string.Empty;
    public string Site { get; set; } = string.Empty;
}

/// <summary>Região em que o vendedor NÃO pode vender (lista de exclusão).</summary>
public class RegiaoBloqueada
{
    /// <summary>"pais" | "estado" | "cidade".</summary>
    public string Tipo { get; set; } = "estado";
    /// <summary>"Brasil", "SP" ou "Campinas - SP".</summary>
    public string Valor { get; set; } = string.Empty;
}

/// <summary>Vendedor, com os parâmetros de comissão usados na precificação.</summary>
public class Vendedor : Rastreavel, IEntity, IInativavel
{
    public string Id { get; set; } = string.Empty;
    public string Tipo { get; set; } = "fisica";
    /// <summary>"" | "sdr" | "sales" | "cs" | "representante".</summary>
    public string TipoVendedor { get; set; } = string.Empty;
    /// <summary>Funcionário (usuário do portal) que é este vendedor. Vazio = representante/terceiro sem acesso.</summary>
    public string UsuarioId { get; set; } = string.Empty;
    public string Nome { get; set; } = string.Empty;
    public string CpfCnpj { get; set; } = string.Empty;
    public string Telefone { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Cidade { get; set; } = string.Empty;
    /// <summary>Comissão padrão do vendedor (fração: 0,015 = 1,5%).</summary>
    public decimal ComissaoPercentual { get; set; }
    /// <summary>Base da comissão: "preco" (sobre o preço de venda) ou "margem".</summary>
    public string ComissaoBase { get; set; } = "preco";
    public string Observacao { get; set; } = string.Empty;
    public DadosBancarios? Banco { get; set; }
    /// <summary>Regiões em que este vendedor não pode vender (bloqueia na precificação e no CRM).</summary>
    public List<RegiaoBloqueada> RegioesBloqueadas { get; set; } = new();
    public string Status { get; set; } = "ativo";
}

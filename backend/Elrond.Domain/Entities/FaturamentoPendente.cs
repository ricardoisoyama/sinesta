using Elrond.Domain.Common;

namespace Elrond.Domain.Entities;

/// <summary>
/// CT-e ou minuta lido da SIIMP para faturar pelo ELROND (convivência com a SIIMP). A consulta
/// atualiza a situação; o que já entrou numa fatura do ELROND nunca volta para "pendente", mesmo
/// que a SIIMP ainda o mostre sem fatura (é assim que não se fatura duas vezes).
/// </summary>
public class DocumentoFaturavel : IEntity
{
    public const string Pendente = "pendente";
    /// <summary>Já está numa fatura da SIIMP (não cancelada).</summary>
    public const string FaturadoSiimp = "faturado-siimp";
    /// <summary>Já está numa fatura do ELROND.</summary>
    public const string FaturadoElrond = "faturado-elrond";
    /// <summary>CT-e só cadastrado (não autorizado) ou minuta sem NFS-e: ainda não dá para faturar.</summary>
    public const string Incompleto = "incompleto";
    public const string Cancelado = "cancelado";

    /// <summary>"cte-1538228" / "minuta-243949".</summary>
    public string Id { get; set; } = string.Empty;
    /// <summary>cte | minuta.</summary>
    public string Tipo { get; set; } = "cte";
    public long SiimpId { get; set; }
    public string Numero { get; set; } = string.Empty;
    public string Serie { get; set; } = string.Empty;
    /// <summary>Chave de 44 dígitos do CT-e (a minuta não tem).</summary>
    public string Chave { get; set; } = string.Empty;
    public string Situacao { get; set; } = Pendente;
    /// <summary>Por que está incompleto, cancelado ou faturado (texto para a tela).</summary>
    public string Motivo { get; set; } = string.Empty;
    public int SituacaoSiimp { get; set; }

    /// <summary>Empresa do ELROND que emitiu (pelo CNPJ do emitente). Vazio = CNPJ não cadastrado.</summary>
    public string EmpresaId { get; set; } = string.Empty;
    public string EmitenteCnpj { get; set; } = string.Empty;
    public string EmitenteNome { get; set; } = string.Empty;

    public long TomadorSiimpId { get; set; }
    public string TomadorNome { get; set; } = string.Empty;
    public string TomadorDocumento { get; set; } = string.Empty;
    /// <summary>Cliente do ELROND com o mesmo CNPJ/CPF do tomador. Vazio = não cadastrado.</summary>
    public string ClienteId { get; set; } = string.Empty;

    /// <summary>yyyy-MM-dd.</summary>
    public string CriadoEm { get; set; } = string.Empty;
    public string Emissao { get; set; } = string.Empty;
    public decimal Valor { get; set; }
    /// <summary>CT-e: remetente → destinatário; minuta: a observação.</summary>
    public string Descricao { get; set; } = string.Empty;
    /// <summary>NFS-e ligada à minuta na SIIMP (o documento fiscal que vai junto com a fatura).</summary>
    public string NfseNumero { get; set; } = string.Empty;

    /// <summary>Número da fatura da SIIMP em que o documento está (vazio = nenhuma).</summary>
    public string FaturaSiimp { get; set; } = string.Empty;
    /// <summary>Fatura do ELROND que cobrou o documento (vazio = ainda não).</summary>
    public string FaturaId { get; set; } = string.Empty;
    /// <summary>Quando a consulta leu o documento pela última vez (UTC, ISO).</summary>
    public string LidoEm { get; set; } = string.Empty;
}

/// <summary>
/// Cópia do que já foi lido de uma fatura da SIIMP (quais documentos ela tem), para a próxima consulta
/// não buscar o detalhe de novo. Fatura só cadastrada é relida sempre (ainda pode ganhar documento).
/// </summary>
public class FaturaSiimpLida : IEntity
{
    /// <summary>Id da fatura na SIIMP.</summary>
    public string Id { get; set; } = string.Empty;
    public long Numero { get; set; }
    public int Situacao { get; set; }
    /// <summary>Ids dos documentos ("cte-…", "minuta-…").</summary>
    public List<string> Documentos { get; set; } = new();
    public string LidaEm { get; set; } = string.Empty;
}

/// <summary>Pessoa da SIIMP já consultada (emitente ou tomador): o documento não muda.</summary>
public class PessoaSiimpLida : IEntity
{
    public string Id { get; set; } = string.Empty;
    public string Nome { get; set; } = string.Empty;
    public string Documento { get; set; } = string.Empty;
    public string LidaEm { get; set; } = string.Empty;
}

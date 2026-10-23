using Elrond.Domain.Common;

namespace Elrond.Domain.Entities;

public static class SituacaoFaturaCliente
{
    public const string Emitida = "emitida";
    public const string Cancelada = "cancelada";
}

/// <summary>Retrato do cliente no dia da fatura (a fatura impressa não muda se o cadastro mudar depois).</summary>
public class ClienteDaFatura
{
    public string Nome { get; set; } = string.Empty;
    public string Documento { get; set; } = string.Empty;
    public string InscricaoEstadual { get; set; } = string.Empty;
    /// <summary>A linha montada que a fatura impressa mostra ("AV 02, S/N (ESQUINA C/) - DISTRITO INDUSTRIAL").</summary>
    public string Endereco { get; set; } = string.Empty;
    // As partes, como o banco pede no boleto.
    public string Logradouro { get; set; } = string.Empty;
    public string NumeroEndereco { get; set; } = string.Empty;
    public string Complemento { get; set; } = string.Empty;
    public string Bairro { get; set; } = string.Empty;
    public string Cidade { get; set; } = string.Empty;
    public string Uf { get; set; } = string.Empty;
    public string Cep { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Telefone { get; set; } = string.Empty;
}

/// <summary>Documento cobrado (CT-e ou minuta), com o que a fatura impressa mostra dele.</summary>
public class DocumentoDaFatura
{
    /// <summary>Id do DocumentoFaturavel ("cte-1538228").</summary>
    public string Id { get; set; } = string.Empty;
    public string Tipo { get; set; } = "cte";
    public long SiimpId { get; set; }
    public string Serie { get; set; } = string.Empty;
    public string Numero { get; set; } = string.Empty;
    public string Chave { get; set; } = string.Empty;
    /// <summary>yyyy-MM-dd.</summary>
    public string Data { get; set; } = string.Empty;
    public string NfseNumero { get; set; } = string.Empty;
    public long NfseId { get; set; }
    public decimal Peso { get; set; }
    public decimal ValorCarga { get; set; }
    public decimal Gris { get; set; }
    public decimal Seguro { get; set; }
    public decimal Pedagio { get; set; }
    public decimal Icms { get; set; }
    public decimal Total { get; set; }
    public List<NfDoDocumento> Nfs { get; set; } = new();
}

/// <summary>Um envio da fatura por e-mail (para quem, com quais anexos, e se deu certo).</summary>
public class EnvioFatura
{
    public string Em { get; set; } = string.Empty;
    public string Quem { get; set; } = string.Empty;
    public string Para { get; set; } = string.Empty;
    public List<string> Anexos { get; set; } = new();
    /// <summary>Vazio = enviado.</summary>
    public string Erro { get; set; } = string.Empty;
}

public class EventoFatura
{
    public string Em { get; set; } = string.Empty;
    public string Quem { get; set; } = string.Empty;
    public string Texto { get; set; } = string.Empty;
}

/// <summary>
/// Fatura para o cliente a partir dos documentos de transporte (CT-e ou minuta com NFS-e lidos da SIIMP):
/// número da sequência da empresa (continua a da SIIMP), o lançamento a receber, o boleto e os envios.
/// Recebida = o lançamento foi baixado (pelo boleto pago ou pela conciliação). Cancelar devolve os
/// documentos para "pendente" (o número não volta).
/// </summary>
public class FaturaCliente : Rastreavel, IEntity
{
    public string Id { get; set; } = string.Empty;
    public string EmpresaId { get; set; } = string.Empty;
    public long Numero { get; set; }
    public string ClienteId { get; set; } = string.Empty;
    public ClienteDaFatura Cliente { get; set; } = new();
    /// <summary>cte | minuta (o que decide o plano de contas padrão e os anexos fiscais).</summary>
    public string Tipo { get; set; } = "cte";
    /// <summary>yyyy-MM-dd.</summary>
    public string Emissao { get; set; } = string.Empty;
    public string Vencimento { get; set; } = string.Empty;
    public string CentroCustoId { get; set; } = string.Empty;
    public string CentroCustoNome { get; set; } = string.Empty;
    public string PlanoContaId { get; set; } = string.Empty;
    public string CarteiraId { get; set; } = string.Empty;
    /// <summary>Soma dos documentos.</summary>
    public decimal Valor { get; set; }
    public decimal Adicional { get; set; }
    public decimal Desconto { get; set; }
    public decimal Total { get; set; }
    public decimal PesoTotal { get; set; }
    public decimal IcmsTotal { get; set; }
    public decimal ValorNfTotal { get; set; }
    public List<DocumentoDaFatura> Documentos { get; set; } = new();
    public string Situacao { get; set; } = SituacaoFaturaCliente.Emitida;
    public string MovimentoId { get; set; } = string.Empty;
    public string CobrancaId { get; set; } = string.Empty;
    public string Observacao { get; set; } = string.Empty;
    public string MotivoCancelamento { get; set; } = string.Empty;
    public List<EnvioFatura> Envios { get; set; } = new();
    public List<EventoFatura> Eventos { get; set; } = new();
}

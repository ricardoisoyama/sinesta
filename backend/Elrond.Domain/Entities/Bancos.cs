using Elrond.Domain.Common;

namespace Elrond.Domain.Entities;

/// <summary>
/// Integração de uma empresa (CNPJ) com um banco. Cada CNPJ tem a sua: a matriz pode estar no
/// Inter e a filial no Itaú. Nasce DESLIGADA e só a nossa equipe ativa, a pedido do cliente.
/// Segredos (client secret, certificado e chave) ficam cifrados (AES-256-GCM, mesma chave do A1).
/// </summary>
public class IntegracaoBancaria : Rastreavel, IEntity, IInativavel
{
    public const string RecursoCobranca = "cobranca";
    public const string RecursoExtrato = "extrato";
    public const string RecursoSaldo = "saldo";

    public string Id { get; set; } = string.Empty;
    public string EmpresaId { get; set; } = string.Empty;
    /// <summary>Módulo do banco: "inter" (e, no futuro, "itau", "sicredi"...). "simulador" para testes.</summary>
    public string Banco { get; set; } = string.Empty;
    /// <summary>"sandbox" | "producao".</summary>
    public string Ambiente { get; set; } = "sandbox";
    /// <summary>Conta corrente (só quando a integração cobre mais de uma conta).</summary>
    public string ContaCorrente { get; set; } = string.Empty;
    public string ClientId { get; set; } = string.Empty;
    public byte[] SegredoCifrado { get; set; } = [];
    public byte[] CertificadoCifrado { get; set; } = [];
    public byte[] ChaveCifrada { get; set; } = [];
    /// <summary>Validade do certificado da integração (yyyy-MM-dd), para avisar antes de vencer.</summary>
    public string CertificadoValidoAte { get; set; } = string.Empty;
    /// <summary>O que está liberado: cobranca, extrato, saldo.</summary>
    public List<string> Recursos { get; set; } = new();
    /// <summary>Ligada pela nossa equipe. Desligada, nada é enviado ao banco.</summary>
    public bool Ativa { get; set; }
    public string Status { get; set; } = "ativo";

    public bool Libera(string recurso) => Ativa && Status == "ativo" && Recursos.Contains(recurso);
}

/// <summary>
/// Uma cobrança (boleto com Pix) emitida num banco. Gravada ANTES de chamar o banco, para nunca
/// emitir duas vezes a mesma parcela; a situação é nossa, igual para qualquer banco.
/// </summary>
public class CobrancaBancaria : Rastreavel, IEntity
{
    public const string Pendente = "pendente";
    public const string Processando = "processando";
    public const string AReceber = "a-receber";
    public const string Recebida = "recebida";
    public const string Cancelada = "cancelada";
    public const string Expirada = "expirada";
    public const string Falha = "falha";
    /// <summary>Não deu para saber se o banco recebeu: conferir antes de emitir de novo.</summary>
    public const string Incerta = "incerta";

    public string Id { get; set; } = string.Empty;
    public string EmpresaId { get; set; } = string.Empty;
    public string IntegracaoId { get; set; } = string.Empty;
    public string Banco { get; set; } = string.Empty;
    public string Ambiente { get; set; } = string.Empty;

    /// <summary>De onde veio: "siimp-fatura" (página de testes), depois "movimento".</summary>
    public string OrigemTipo { get; set; } = string.Empty;
    public string OrigemId { get; set; } = string.Empty;
    public string OrigemParcelaId { get; set; } = string.Empty;
    /// <summary>"Fatura 61 · parcela 1/1" (para as listas).</summary>
    public string OrigemDescricao { get; set; } = string.Empty;

    /// <summary>Número nosso enviado ao banco (até 15 caracteres, único por empresa).</summary>
    public string SeuNumero { get; set; } = string.Empty;
    /// <summary>Identificador do banco (no Inter, o codigoSolicitacao).</summary>
    public string IdBanco { get; set; } = string.Empty;
    public string NossoNumero { get; set; } = string.Empty;
    public string LinhaDigitavel { get; set; } = string.Empty;
    public string CodigoBarras { get; set; } = string.Empty;
    public string PixCopiaECola { get; set; } = string.Empty;

    public decimal Valor { get; set; }
    /// <summary>yyyy-MM-dd.</summary>
    public string Vencimento { get; set; } = string.Empty;
    public string PagadorNome { get; set; } = string.Empty;
    public string PagadorDocumento { get; set; } = string.Empty;

    public string Situacao { get; set; } = Pendente;
    /// <summary>Situação como o banco escreve (A_RECEBER, RECEBIDO...), para conferência.</summary>
    public string SituacaoBanco { get; set; } = string.Empty;
    public string Mensagem { get; set; } = string.Empty;
    public decimal ValorRecebido { get; set; }
    public string RecebidaEm { get; set; } = string.Empty;
    /// <summary>"BOLETO" | "PIX".</summary>
    public string RecebidaPor { get; set; } = string.Empty;

    /// <summary>Ocupa a parcela: enquanto existir uma assim, a mesma parcela não gera outro boleto.</summary>
    public bool Vigente => Situacao is not (Cancelada or Expirada or Falha);
}

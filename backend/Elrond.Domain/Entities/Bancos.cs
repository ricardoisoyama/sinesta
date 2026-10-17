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
    /// <summary>Conta do Caixa (carteira) que corresponde a esta conta no banco: liga o extrato e a baixa.</summary>
    public string CarteiraId { get; set; } = string.Empty;
    /// <summary>Padrões dos boletos desta conta. Nulo (integrações antigas) = <see cref="RegrasBoleto"/> padrão.</summary>
    public RegrasBoleto? Boleto { get; set; }
    /// <summary>Segredo do endereço de aviso (webhook): o banco chama .../api/bancos/aviso/{token}.</summary>
    public string AvisoToken { get; set; } = string.Empty;
    /// <summary>Quando o aviso foi cadastrado no banco (vazio = ainda não). ISO 8601.</summary>
    public string AvisoRegistradoEm { get; set; } = string.Empty;

    public bool Libera(string recurso) => Ativa && Status == "ativo" && Recursos.Contains(recurso);

    public RegrasBoleto RegrasDoBoleto => Boleto ?? new RegrasBoleto();
}

/// <summary>
/// Padrões do boleto de uma integração: o que vale depois do vencimento (multa e juros), o desconto
/// por pagamento antecipado, as instruções impressas e quando o banco dá baixa sozinho.
/// Iguais para qualquer banco; cada módulo traduz para o formato dele.
/// </summary>
public class RegrasBoleto
{
    public const string Nenhum = "nenhum";
    public const string Percentual = "percentual";
    public const string Valor = "valor";
    /// <summary>Juros: percentual ao mês.</summary>
    public const string PercentualMes = "percentual-mes";
    /// <summary>Juros: valor por dia de atraso.</summary>
    public const string ValorDia = "valor-dia";
    /// <summary>Linhas de instrução por boleto (as outras 2 das 5 do banco ficam para a referência da cobrança).</summary>
    public const int MaxInstrucoes = 3;
    public const int MaxCaracteresLinha = 78;

    /// <summary>nenhum | percentual | valor.</summary>
    public string MultaTipo { get; set; } = Nenhum;
    public decimal Multa { get; set; }
    /// <summary>nenhum | percentual-mes | valor-dia.</summary>
    public string JurosTipo { get; set; } = Nenhum;
    public decimal Juros { get; set; }
    /// <summary>nenhum | percentual | valor (até <see cref="DescontoDiasAntes"/> dias antes do vencimento).</summary>
    public string DescontoTipo { get; set; } = Nenhum;
    public decimal Desconto { get; set; }
    public int DescontoDiasAntes { get; set; }
    /// <summary>Dias corridos depois do vencimento até o banco cancelar sozinho (0 a 60).</summary>
    public int DiasBaixa { get; set; } = 30;
    /// <summary>Pix junto do boleto (QR Code no PDF).</summary>
    public bool ComPix { get; set; } = true;
    public List<string> Instrucoes { get; set; } = new();
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

    // ── Métrica do aviso: quanto o banco demora para avisar que foi pago ──
    /// <summary>Data e hora do pagamento segundo o banco (vem no aviso). ISO 8601.</summary>
    public string PagaEm { get; set; } = string.Empty;
    /// <summary>Quando o primeiro aviso desta cobrança chegou. ISO 8601.</summary>
    public string AvisoEm { get; set; } = string.Empty;
    /// <summary>Quando o ELROND confirmou que foi paga. ISO 8601.</summary>
    public string ConfirmadaEm { get; set; } = string.Empty;
    /// <summary>Quem descobriu o pagamento: aviso (do banco) | rotina (conferência de hora em hora) | tela (alguém clicou).</summary>
    public string ConfirmadaPor { get; set; } = string.Empty;

    /// <summary>Ocupa a parcela: enquanto existir uma assim, a mesma parcela não gera outro boleto.</summary>
    public bool Vigente => Situacao is not (Cancelada or Expirada or Falha);
}

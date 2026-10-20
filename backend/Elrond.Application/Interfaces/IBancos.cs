namespace Elrond.Application.Interfaces;

// ── Motor de bancos ────────────────────────────────────────────────────────────────────────
// Contratos por CAPACIDADE: cada banco implementa só o que tem (cobrança, extrato, saldo...).
// O resto do sistema fala com o orquestrador (CobrancaService), nunca com um banco direto.

/// <summary>Credenciais decifradas de uma integração, só em memória, na hora da chamada.</summary>
public sealed record CredencialBanco(string IntegracaoId, string Ambiente, string ClientId, string ClientSecret, byte[] Certificado, byte[] Chave, string ContaCorrente);

public sealed record PagadorCobranca(
    string CpfCnpj, string Nome, string Endereco, string Numero, string Complemento, string Bairro,
    string Cidade, string Uf, string Cep, string Email, string Telefone);

/// <summary>
/// O que o banco precisa para registrar a cobrança. As regras (multa, juros, desconto, baixa, Pix)
/// vêm da integração; as mensagens já chegam juntas e cortadas (referência + instruções).
/// </summary>
public sealed record PedidoCobranca(
    string SeuNumero, decimal Valor, string Vencimento, int DiasAgenda, PagadorCobranca Pagador, IReadOnlyList<string> Mensagens,
    Domain.Entities.RegrasBoleto? Regras = null);

public enum DesfechoEnvioBanco
{
    /// <summary>O banco recebeu (pode ainda estar processando).</summary>
    Aceito,
    /// <summary>O banco recusou (dado inválido, credencial). Nada foi registrado.</summary>
    Recusado,
    /// <summary>Não dá para saber se chegou (queda, demora, erro do banco). Conferir antes de repetir.</summary>
    Incerto,
}

public sealed record EnvioBanco(DesfechoEnvioBanco Desfecho, string IdBanco, string Mensagem)
{
    public static EnvioBanco Aceito(string idBanco) => new(DesfechoEnvioBanco.Aceito, idBanco, string.Empty);
    public static EnvioBanco Recusado(string mensagem) => new(DesfechoEnvioBanco.Recusado, string.Empty, mensagem);
    public static EnvioBanco Incerto(string mensagem) => new(DesfechoEnvioBanco.Incerto, string.Empty, mensagem);
}

/// <summary>Situação da cobrança no banco, já traduzida para as nossas (CobrancaBancaria.*).</summary>
public sealed record SituacaoNoBanco(
    string Situacao, string SituacaoBanco, string NossoNumero, string LinhaDigitavel, string CodigoBarras,
    string PixCopiaECola, decimal ValorRecebido, string RecebidaEm, string RecebidaPor, string Mensagem);

/// <summary>Resultado de uma consulta: achou, não existe no banco, ou a consulta falhou.</summary>
public sealed record ConsultaBanco(SituacaoNoBanco? Situacao, bool NaoExiste, string Falha)
{
    public static ConsultaBanco Encontrada(SituacaoNoBanco s) => new(s, false, string.Empty);
    public static ConsultaBanco Inexistente() => new(null, true, string.Empty);
    public static ConsultaBanco Falhou(string motivo) => new(null, false, motivo);
}

/// <summary>Capacidade de cobrança: emitir, consultar, PDF e cancelar (pela API do banco).</summary>
public interface ICobrancaBancaria
{
    Task<EnvioBanco> EmitirAsync(CredencialBanco credencial, PedidoCobranca pedido, CancellationToken ct = default);
    Task<ConsultaBanco> ConsultarAsync(CredencialBanco credencial, string idBanco, CancellationToken ct = default);
    /// <summary>Procura pelo seu número (quando o envio ficou incerto e não temos o id do banco).</summary>
    Task<ConsultaBanco> ConsultarPorSeuNumeroAsync(CredencialBanco credencial, string seuNumero, string vencimento, CancellationToken ct = default);
    Task<byte[]?> PdfAsync(CredencialBanco credencial, string idBanco, CancellationToken ct = default);
    Task<EnvioBanco> CancelarAsync(CredencialBanco credencial, string idBanco, string motivo, CancellationToken ct = default);
    /// <summary>Cadastra no banco o endereço que ele chama quando a cobrança é paga, cancelada ou expira. Null = ok.</summary>
    Task<string?> RegistrarAvisoAsync(CredencialBanco credencial, string url, CancellationToken ct = default);
}

/// <summary>
/// Um lançamento do extrato do banco. Id = identificador do banco (vira o FITID da conciliação, sem
/// duplicar); Valor com sinal (+ crédito, − débito); Descricao com o que ajuda a casar (nome, documento).
/// </summary>
public sealed record TransacaoExtrato(string Id, string Data, decimal Valor, string Descricao);

/// <summary>Resultado da leitura do extrato: as transações, ou o motivo de não ter conseguido.</summary>
public sealed record ExtratoBanco(IReadOnlyList<TransacaoExtrato> Transacoes, string Falha)
{
    public static ExtratoBanco Lido(IReadOnlyList<TransacaoExtrato> t) => new(t, string.Empty);
    public static ExtratoBanco Falhou(string motivo) => new(Array.Empty<TransacaoExtrato>(), motivo);
}

/// <summary>Capacidade de extrato: lê as transações da conta num período (datas yyyy-MM-dd).</summary>
public interface IExtratoBancario
{
    Task<ExtratoBanco> LerAsync(CredencialBanco credencial, string de, string ate, CancellationToken ct = default);
}

// ── Pagamentos (pagar pelo banco) ──────────────────────────────────────────────────────────

/// <summary>Pix a pagar. Id = nosso id do pagamento, usado como chave de idempotência (o banco não paga duas vezes).</summary>
public sealed record PedidoPix(string Id, decimal Valor, string Data, string Descricao, string Chave);

public enum DesfechoPagamento
{
    /// <summary>Efetivado na hora.</summary>
    Processado,
    /// <summary>Aguardando alguém aprovar no app/internet banking.</summary>
    AguardandoAprovacao,
    /// <summary>Agendado para a data pedida.</summary>
    Agendado,
    /// <summary>Recusado (dado inválido, sem permissão). Nada foi pago.</summary>
    Recusado,
    /// <summary>Não dá para saber se chegou: confere (ou reenvia com a mesma chave de idempotência).</summary>
    Incerto,
}

public sealed record EnvioPagamento(DesfechoPagamento Desfecho, string IdBanco, string Mensagem);

/// <summary>Situação do pagamento no banco, traduzida para as nossas (PagamentoBancario.*).</summary>
public sealed record SituacaoPagamento(string Situacao, string SituacaoBanco, string EndToEnd, string PagoEm, string Mensagem);

public sealed record ConsultaPagamento(SituacaoPagamento? Situacao, bool NaoExiste, string Falha)
{
    public static ConsultaPagamento Encontrado(SituacaoPagamento s) => new(s, false, string.Empty);
    public static ConsultaPagamento Inexistente() => new(null, true, string.Empty);
    public static ConsultaPagamento Falhou(string motivo) => new(null, false, motivo);
}

/// <summary>O que o banco mandou no aviso de um pagamento (o ELROND confere no banco antes de dar baixa).</summary>
public sealed record AvisoPagamento(string IdBanco, string Situacao, string DataHora);

/// <summary>Capacidade de pagamento: Pix (enviar, consultar) e o aviso de quando ele é efetivado.</summary>
public interface IPagamentoBancario
{
    Task<EnvioPagamento> PagarPixAsync(CredencialBanco credencial, PedidoPix pedido, CancellationToken ct = default);
    Task<ConsultaPagamento> ConsultarPixAsync(CredencialBanco credencial, string idBanco, CancellationToken ct = default);
    /// <summary>Cadastra no banco o endereço que ele chama quando um pagamento muda de situação. Null = ok.</summary>
    Task<string?> RegistrarAvisoAsync(CredencialBanco credencial, string url, CancellationToken ct = default);
    IReadOnlyList<AvisoPagamento> LerAviso(string corpo);
}

/// <summary>O que o banco mandou no aviso de uma cobrança (o ELROND confere no banco antes de dar baixa).</summary>
public sealed record AvisoCobranca(string IdBanco, string SeuNumero, string Situacao, string DataHora);

/// <summary>Um banco: o que ele oferece. Capacidade nula = o banco não tem (ou ainda não fizemos).</summary>
public interface IBancoModulo
{
    /// <summary>"inter", "simulador"...</summary>
    string Codigo { get; }
    string Nome { get; }
    /// <summary>Recursos que o módulo oferece (cobranca, extrato, saldo), para a tela de Integrações.</summary>
    IReadOnlyList<string> Recursos { get; }
    ICobrancaBancaria? Cobranca { get; }
    IExtratoBancario? Extrato { get; }
    IPagamentoBancario? Pagamento { get; }
    /// <summary>Confere certificado e credenciais com uma chamada de leitura. Null = ok; senão, o motivo.</summary>
    Task<string?> TestarConexaoAsync(CredencialBanco credencial, CancellationToken ct = default);
    /// <summary>Lê o corpo do aviso (webhook) no formato deste banco. Corpo estranho = lista vazia.</summary>
    IReadOnlyList<AvisoCobranca> LerAviso(string corpo);
}

/// <summary>Registro dos módulos de banco disponíveis.</summary>
public interface IBancos
{
    IBancoModulo? Modulo(string codigo);
    IReadOnlyList<IBancoModulo> Todos { get; }
}

/// <summary>Decifra as credenciais de uma integração (a chave de cifra fica na infraestrutura).</summary>
public interface ICofreBancario
{
    CredencialBanco Abrir(Domain.Entities.IntegracaoBancaria integracao);
    /// <summary>Cifra os segredos para gravar. Devolve (segredo, certificado, chave) cifrados.</summary>
    (byte[] Segredo, byte[] Certificado, byte[] Chave) Fechar(string integracaoId, string clientSecret, byte[] certificado, byte[] chave);
    /// <summary>Confere se certificado e chave (PEM) formam um par válido. Devolve o erro ou null, e a validade (yyyy-MM-dd).</summary>
    string? ConferirCertificado(byte[] certificado, byte[] chave, out string validoAte);
    bool Configurado { get; }
}

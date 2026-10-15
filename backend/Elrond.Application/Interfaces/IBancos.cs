namespace Elrond.Application.Interfaces;

// ── Motor de bancos ────────────────────────────────────────────────────────────────────────
// Contratos por CAPACIDADE: cada banco implementa só o que tem (cobrança, extrato, saldo...).
// O resto do sistema fala com o orquestrador (CobrancaService), nunca com um banco direto.

/// <summary>Credenciais decifradas de uma integração, só em memória, na hora da chamada.</summary>
public sealed record CredencialBanco(string IntegracaoId, string Ambiente, string ClientId, string ClientSecret, byte[] Certificado, byte[] Chave, string ContaCorrente);

public sealed record PagadorCobranca(
    string CpfCnpj, string Nome, string Endereco, string Numero, string Complemento, string Bairro,
    string Cidade, string Uf, string Cep, string Email, string Telefone);

/// <summary>O que o banco precisa para registrar a cobrança.</summary>
public sealed record PedidoCobranca(string SeuNumero, decimal Valor, string Vencimento, int DiasAgenda, PagadorCobranca Pagador, IReadOnlyList<string> Mensagens);

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
}

/// <summary>Um banco: o que ele oferece. Capacidade nula = o banco não tem (ou ainda não fizemos).</summary>
public interface IBancoModulo
{
    /// <summary>"inter", "simulador"...</summary>
    string Codigo { get; }
    string Nome { get; }
    ICobrancaBancaria? Cobranca { get; }
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

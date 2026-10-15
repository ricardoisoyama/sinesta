namespace Elrond.Application.Interfaces;

// ── SIIMP (TMS do cliente) ─────────────────────────────────────────────────────────────────
// Conector SÓ DE LEITURA e temporário: serve à página de testes de boleto até a fatura nascer
// no ELROND. Quando a SIIMP for desligada, este conector sai sem mexer no motor de bancos.

/// <summary>Fatura como vem na listagem (resumo, sem pagador nem parcelas).</summary>
public sealed record FaturaSiimpResumo(long Id, long Numero, int Situacao, decimal Total, string Vencimento, int FormaPagamento, string CriadaEm);

public sealed record ParcelaSiimp(long Id, int Numero, decimal Valor, decimal Desconto, string Vencimento, int Situacao);

public sealed record DocumentoSiimp(string Tipo, string Numero, string Serie, string Chave, decimal Total);

/// <summary>Fatura com o detalhe (pagador, parcelas, documentos e carteira).</summary>
public sealed record FaturaSiimp(
    long Id, long Numero, int Situacao, decimal Total, string Vencimento, int FormaPagamento,
    long PagadorId, string PagadorNome, string PagadorDocumento, string Carteira, string Observacao,
    IReadOnlyList<ParcelaSiimp> Parcelas, IReadOnlyList<DocumentoSiimp> Documentos);

public sealed record PessoaSiimp(
    long Id, string Nome, string Documento, string Email, string Telefone,
    string Rua, string Numero, string Complemento, string Bairro, string Cidade, string Uf, string Cep);

public sealed record RespostaSiimp<T>(T? Dados, string Erro)
{
    public static RespostaSiimp<T> Ok(T dados) => new(dados, string.Empty);
    public static RespostaSiimp<T> Falha(string erro) => new(default, erro);
}

public interface ISiimp
{
    bool Configurado { get; }
    /// <summary>Faturas emitidas no período (yyyy-MM-dd).</summary>
    Task<RespostaSiimp<IReadOnlyList<FaturaSiimpResumo>>> FaturasAsync(string emitidasDe, string emitidasAte, CancellationToken ct = default);
    Task<RespostaSiimp<FaturaSiimp>> FaturaAsync(long id, CancellationToken ct = default);
    Task<RespostaSiimp<PessoaSiimp>> PessoaAsync(long id, CancellationToken ct = default);
}

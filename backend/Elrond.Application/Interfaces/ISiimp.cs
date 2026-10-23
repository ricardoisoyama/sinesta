namespace Elrond.Application.Interfaces;

// ── SIIMP (TMS do cliente) ─────────────────────────────────────────────────────────────────
// Conector SÓ DE LEITURA e temporário: serve à página de testes de boleto até a fatura nascer
// no ELROND. Quando a SIIMP for desligada, este conector sai sem mexer no motor de bancos.

// EmitenteId (owner_id da SIIMP) é a pessoa da empresa que emitiu a fatura (Matriz, Filial...);
// o CNPJ dela diz de qual empresa do ELROND a fatura é.

/// <summary>Fatura como vem na listagem (resumo, sem pagador nem parcelas).</summary>
public sealed record FaturaSiimpResumo(long Id, long Numero, int Situacao, decimal Total, string Vencimento, int FormaPagamento, string CriadaEm, long EmitenteId);

public sealed record ParcelaSiimp(long Id, int Numero, decimal Valor, decimal Desconto, string Vencimento, int Situacao);

/// <summary>Documento dentro da fatura. CteId/MinutaId: o id do documento na SIIMP (0 = não é desse tipo).</summary>
public sealed record DocumentoSiimp(string Tipo, string Numero, string Serie, string Chave, decimal Total, long CteId = 0, long MinutaId = 0);

/// <summary>
/// CT-e ou minuta como vem na busca. Tipo "cte" | "minuta". Situacao é o código da SIIMP (CT-e: 4 cancelado,
/// 6 inutilizado, 0 só cadastrado; minuta: 6 cancelada, 7 inutilizada). TomadorId = quem paga
/// (customer no CT-e, requestor na minuta). NfseNumero: a NFS-e ligada à minuta.
/// </summary>
public sealed record DocumentoTransporteSiimp(
    string Tipo, long Id, string Numero, string Serie, string Chave, int Situacao, string CriadoEm, string Emissao,
    long EmitenteId, string EmitenteNome, long TomadorId, string TomadorNome, decimal Total, string Descricao, string NfseNumero);

/// <summary>Fatura com o detalhe (pagador, parcelas, documentos e carteira).</summary>
public sealed record FaturaSiimp(
    long Id, long Numero, int Situacao, decimal Total, string Vencimento, int FormaPagamento,
    long PagadorId, string PagadorNome, string PagadorDocumento, string Carteira, string Observacao,
    IReadOnlyList<ParcelaSiimp> Parcelas, IReadOnlyList<DocumentoSiimp> Documentos, long EmitenteId);

public sealed record PessoaSiimp(
    long Id, string Nome, string Documento, string Email, string Telefone,
    string Rua, string Numero, string Complemento, string Bairro, string Cidade, string Uf, string Cep);

/// <summary>NF da carga ligada ao CT-e ou à minuta. Emissao yyyy-MM-dd (a minuta não traz: vem da busca da NF).</summary>
public sealed record NfTransporteSiimp(long Id, string Serie, string Numero, string Emissao, decimal Peso, decimal Valor);

/// <summary>
/// Detalhe do CT-e ou da minuta (só a busca por id traz): o que a fatura impressa mostra por documento.
/// Peso e ValorCarga são os da carga inteira (o totalizador da fatura soma estes); NfseId: a NFS-e da minuta.
/// </summary>
public sealed record DetalheTransporteSiimp(
    string Tipo, long Id, decimal Total, decimal Peso, decimal ValorCarga, decimal Gris, decimal Seguro, decimal Pedagio, decimal Icms,
    long NfseId, string NfseNumero, long CentroCustoId, IReadOnlyList<NfTransporteSiimp> Nfs);

/// <summary>Arquivo baixado da SIIMP (DACTE, PDF da NFS-e).</summary>
public sealed record ArquivoSiimp(byte[] Conteudo, string Tipo);

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
    /// <summary>CT-es e minutas criados no período (yyyy-MM-dd), todas as páginas.</summary>
    Task<RespostaSiimp<IReadOnlyList<DocumentoTransporteSiimp>>> DocumentosTransporteAsync(string criadosDe, string criadosAte, CancellationToken ct = default);
    /// <summary>
    /// Faturas que podem conter documentos criados a partir de <paramref name="desde"/>: as cadastradas (ainda
    /// editáveis, de qualquer data) e as emitidas desde então. Todas as páginas, sem repetir.
    /// </summary>
    Task<RespostaSiimp<IReadOnlyList<FaturaSiimpResumo>>> FaturasParaConferirAsync(string desde, CancellationToken ct = default);
    /// <summary>Detalhe de um CT-e ("cte") ou de uma minuta ("minuta"), com as NFs (a data da NF da minuta vem da busca da NF).</summary>
    Task<RespostaSiimp<DetalheTransporteSiimp>> DetalheTransporteAsync(string tipo, long id, CancellationToken ct = default);
    /// <summary>
    /// Maior número de fatura de cada emitente (owner_id), olhando todas as faturas (cadastradas, emitidas,
    /// liquidadas e canceladas) desde <paramref name="desde"/>: a SIIMP numera por CNPJ e o ELROND continua a sequência.
    /// </summary>
    Task<RespostaSiimp<IReadOnlyDictionary<long, long>>> UltimasFaturasAsync(string desde, CancellationToken ct = default);
    /// <summary>DACTE (PDF) do CT-e.</summary>
    Task<RespostaSiimp<ArquivoSiimp>> DacteAsync(long cteId, CancellationToken ct = default);
    /// <summary>PDF da NFS-e.</summary>
    Task<RespostaSiimp<ArquivoSiimp>> NfsePdfAsync(long nfseId, CancellationToken ct = default);
}

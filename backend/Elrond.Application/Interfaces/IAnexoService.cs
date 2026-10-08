using Elrond.Application.Common;
using Elrond.Domain.Entities;

namespace Elrond.Application.Interfaces;

/// <summary>Arquivo aberto para download: conteúdo + metadados.</summary>
public sealed record AnexoAberto(Anexo Anexo, Stream Conteudo);

public interface IAnexoService
{
    /// <summary>Limite por arquivo (12 MB), combinado com o cliente.</summary>
    long TamanhoMaximo { get; }
    /// <summary>Extensões aceitas: PDF, Word, Excel e JPG.</summary>
    IReadOnlyList<string> ExtensoesAceitas { get; }

    Task<List<Anexo>> ListarAsync(string entidade, string entidadeId);
    Task<Result<Anexo>> EnviarAsync(string entidade, string entidadeId, string nomeArquivo, string contentType, long tamanho, Stream conteudo, string enviadoPor);
    Task<Result<AnexoAberto>> AbrirAsync(string id);
    Task<Result> ExcluirAsync(string id);
}

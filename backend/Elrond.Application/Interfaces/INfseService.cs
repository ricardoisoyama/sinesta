using Elrond.Application.Common;
using Elrond.Application.DTOs;
using Elrond.Domain.Entities;

namespace Elrond.Application.Interfaces;

/// <summary>Persistência das notas de serviço e dos avisos já processados.</summary>
public interface INotasFiscaisServicoRepository
{
    Task AdicionarAsync(NotaFiscalServico nota, CancellationToken ct = default);
    Task<NotaFiscalServico?> ObterAsync(string id, CancellationToken ct = default);
    Task<NotaFiscalServico?> ObterPorIdProvedorAsync(string provedor, string idProvedor, CancellationToken ct = default);
    Task<IReadOnlyList<NotaFiscalServico>> ListarAsync(string? empresaId, int quantidade, CancellationToken ct = default);
    /// <summary>Notas em andamento cuja próxima consulta já venceu.</summary>
    Task<IReadOnlyList<NotaFiscalServico>> ParaAcompanharAsync(DateTime agora, int quantidade, CancellationToken ct = default);
    /// <summary>Grava as alterações pendentes (notas e avisos marcados) de uma vez.</summary>
    Task SalvarAsync(CancellationToken ct = default);

    Task<bool> AvisoJaProcessadoAsync(string idAviso, CancellationToken ct = default);
    /// <summary>Marca o aviso como processado; vai para o banco no próximo <see cref="SalvarAsync"/>, junto com a nota.</summary>
    void MarcarAvisoProcessado(string idAviso, string provedor, DateTime agora);
}

/// <summary>
/// Motor de NFS-e: confere o pedido, emite pelo provedor configurado na empresa, acompanha até a
/// prefeitura responder, cancela e entrega PDF/XML. Nunca emite a mesma nota duas vezes.
/// </summary>
public interface INfseService
{
    Task<Result<NotaFiscalServicoDto>> EmitirAsync(PedidoNfseDto pedido, CancellationToken ct = default);
    Task<NotaFiscalServicoDto?> ObterAsync(string id, CancellationToken ct = default);
    Task<IReadOnlyList<NotaFiscalServicoDto>> ListarAsync(string? empresaId, int quantidade = 50, CancellationToken ct = default);
    /// <summary>Consulta o provedor agora e atualiza a nota.</summary>
    Task<Result<NotaFiscalServicoDto>> AtualizarAsync(string id, CancellationToken ct = default);
    Task<Result<NotaFiscalServicoDto>> CancelarAsync(string id, string motivo, CancellationToken ct = default);
    Task<Result<ArquivoNfse>> BaixarAsync(string id, TipoArquivoNfse tipo, CancellationToken ct = default);
    /// <summary>Aviso do provedor (webhook). Aviso repetido ou de nota desconhecida é ignorado.</summary>
    Task ProcessarAvisoAsync(AvisoNfse aviso, CancellationToken ct = default);
    /// <summary>Consulta as notas em andamento com consulta vencida (rodado em segundo plano).</summary>
    Task<int> AcompanharAsync(CancellationToken ct = default);

    Task<ConfiguracaoFiscalDto?> ObterConfiguracaoAsync(string empresaId, CancellationToken ct = default);
    Task<Result<ConfiguracaoFiscalDto>> SalvarConfiguracaoAsync(string empresaId, ConfiguracaoFiscalDto configuracao, CancellationToken ct = default);
}

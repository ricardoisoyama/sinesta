using Elrond.Application.Common;
using Elrond.Application.DTOs;
using Elrond.Domain.Entities;

namespace Elrond.Application.Interfaces;

/// <summary>Lançamentos a pagar e a receber, aprovação, baixa e conciliação bancária.</summary>
public interface IFinanceiroService
{
    Task<List<Movimento>> ListarAsync();
    Task<Result<List<Movimento>>> CriarAsync(NovoMovimentoDto dto, UsuarioAtual quem);
    /// <summary>Transferência entre contas: saída na origem + entrada no destino, ligadas (aprovadas, baixadas e canceladas juntas).</summary>
    Task<Result<List<Movimento>>> TransferirAsync(TransferenciaDto dto, UsuarioAtual quem);
    Task<Result<Movimento>> AtualizarAsync(string id, Movimento dados);
    Task<Result<int>> LiquidarAsync(BaixaDto dto, UsuarioAtual quem);
    Task<Result<Movimento>> EstornarAsync(string id, UsuarioAtual quem);
    Task<Result<int>> CancelarAsync(IdsDto dto, UsuarioAtual quem);
    Task<Result<Movimento>> AprovarAsync(string id, UsuarioAtual quem, bool podeAprovar);
    Task<Result<Movimento>> ReprovarAsync(string id, string motivo, UsuarioAtual quem, bool podeAprovar);

    Task<List<ExtratoLinha>> ExtratoAsync(string carteiraId);
    Task<Result<ImportarExtratoResultado>> ImportarAsync(ImportarExtratoDto dto, UsuarioAtual quem);
    Task<Result<ExtratoLinha>> VincularAsync(VincularExtratoDto dto, UsuarioAtual quem);
    Task<Result<ExtratoLinha>> CriarDoExtratoAsync(CriarDoExtratoDto dto, UsuarioAtual quem);
    Task<Result<ExtratoLinha>> DesfazerAsync(string linhaId, UsuarioAtual quem);
    Task<Result<ExtratoLinha>> IgnorarAsync(string linhaId, UsuarioAtual quem);
}

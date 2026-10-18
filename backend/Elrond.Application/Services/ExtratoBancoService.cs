using Elrond.Application.Common;
using Elrond.Application.DTOs;
using Elrond.Application.Interfaces;
using Elrond.Domain.Entities;

namespace Elrond.Application.Services;

/// <summary>Conta do Caixa que tem extrato pela API (a integração ligada a ela).</summary>
public sealed record ContaComExtratoDto(string CarteiraId, string Banco, string Ambiente);

/// <summary>Resultado da busca: quantas linhas vieram do banco, quantas eram novas e o período lido.</summary>
public sealed record BuscaExtratoResultado(int Lidas, int Novas, int JaImportadas, string De, string Ate);

/// <summary>
/// "Buscar do banco" na Conciliação: lê o extrato pela API da integração ligada à conta do Caixa e
/// grava pelo mesmo caminho do OFX (o id da transação no banco é o FITID; buscar de novo não duplica).
/// O OFX continua valendo quando a API está fora.
/// </summary>
public sealed class ExtratoBancoService(
    ICrudRepository<IntegracaoBancaria> integracoes,
    IBancos bancos,
    ICofreBancario cofre,
    IFinanceiroService financeiro,
    TimeProvider relogio)
{
    /// <summary>Período máximo de uma busca (o banco é consultado em janelas menores).</summary>
    public const int MaxDias = 366;

    public async Task<List<ContaComExtratoDto>> ContasAsync() =>
        (await integracoes.GetAllAsync())
            .Where(i => i.CarteiraId.Length > 0 && i.Libera(IntegracaoBancaria.RecursoExtrato) && bancos.Modulo(i.Banco)?.Extrato is not null)
            .Select(i => new ContaComExtratoDto(i.CarteiraId, bancos.Modulo(i.Banco)!.Nome, i.Ambiente))
            .ToList();

    public async Task<Result<BuscaExtratoResultado>> BuscarAsync(string carteiraId, string? de, string? ate, UsuarioAtual quem, CancellationToken ct = default)
    {
        var integracao = (await integracoes.ListarAsync(i => i.CarteiraId == carteiraId)).FirstOrDefault(i => i.Libera(IntegracaoBancaria.RecursoExtrato));
        if (integracao is null)
            return Result.Failure<BuscaExtratoResultado>("Esta conta não está ligada a uma integração bancária com extrato (Administrativo › Integrações, campo \"Conta do Caixa\"). Use o OFX.");
        if (bancos.Modulo(integracao.Banco)?.Extrato is not { } extrato)
            return Result.Failure<BuscaExtratoResultado>($"O banco \"{integracao.Banco}\" não tem extrato por API. Use o OFX.");
        if (!cofre.Configurado)
            return Result.Failure<BuscaExtratoResultado>("A chave de cifra das credenciais não está configurada neste ambiente.");

        var hoje = DateOnly.FromDateTime(relogio.GetLocalNow().DateTime);
        if (!Data(ate, hoje, out var fim) || !Data(de, fim.AddDays(-30), out var inicio))
            return Result.Failure<BuscaExtratoResultado>("Período inválido: use datas no formato aaaa-mm-dd.");
        if (fim > hoje) fim = hoje;
        if (inicio > fim) return Result.Failure<BuscaExtratoResultado>("O início do período vem depois do fim.");
        if (fim.DayNumber - inicio.DayNumber + 1 > MaxDias) return Result.Failure<BuscaExtratoResultado>($"Busque no máximo {MaxDias} dias por vez.");

        var lido = await extrato.LerAsync(cofre.Abrir(integracao), inicio.ToString("yyyy-MM-dd"), fim.ToString("yyyy-MM-dd"), ct);
        if (lido.Falha.Length > 0) return Result.Failure<BuscaExtratoResultado>($"O banco não devolveu o extrato: {lido.Falha}. Tente de novo ou use o OFX.");
        var periodo = (inicio.ToString("yyyy-MM-dd"), fim.ToString("yyyy-MM-dd"));
        if (lido.Transacoes.Count == 0) return Result.Success(new BuscaExtratoResultado(0, 0, 0, periodo.Item1, periodo.Item2));

        var linhas = lido.Transacoes.Select(t => new LinhaExtratoDto(t.Id, t.Data, t.Valor, t.Descricao)).ToList();
        var r = await financeiro.ImportarAsync(new ImportarExtratoDto(carteiraId, linhas), quem);
        return r.IsSuccess
            ? Result.Success(new BuscaExtratoResultado(linhas.Count, r.Value!.Novas, r.Value.JaImportadas, periodo.Item1, periodo.Item2))
            : Result.Failure<BuscaExtratoResultado>(r.Error!);
    }

    private static bool Data(string? texto, DateOnly padrao, out DateOnly data)
    {
        if (string.IsNullOrWhiteSpace(texto)) { data = padrao; return true; }
        return DateOnly.TryParseExact(texto, "yyyy-MM-dd", out data);
    }
}

using Elrond.Application.Services;

namespace Elrond.API.Background;

/// <summary>
/// Conferência no banco, rede de segurança do aviso (webhook): se o aviso se perder (servidor
/// reiniciando, banco fora, aviso não cadastrado), a mudança aparece mesmo assim. Pix em andamento
/// a cada 5 minutos (o agendado para outro dia só na rodada de hora em hora); cobranças de hora em hora.
/// </summary>
public sealed class CobrancasConferenciaWorker(IServiceScopeFactory escopos, ILogger<CobrancasConferenciaWorker> log) : BackgroundService
{
    private static readonly TimeSpan Intervalo = TimeSpan.FromMinutes(5);
    /// <summary>A cada quantas rodadas de 5 minutos vem a completa (cobranças e Pix agendados para outro dia).</summary>
    private const int RodadasPorHora = 12;

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        try
        {
            // Espera a API subir (migrations, seed) antes da primeira rodada.
            await Task.Delay(TimeSpan.FromMinutes(2), stoppingToken);
        }
        catch (TaskCanceledException)
        {
            return;
        }
        using var timer = new PeriodicTimer(Intervalo);
        var rodada = 0;
        do
        {
            try
            {
                using var escopo = escopos.CreateScope();
                var completa = rodada++ % RodadasPorHora == 0;
                if (completa)
                {
                    var mudaram = await escopo.ServiceProvider.GetRequiredService<ICobrancaService>().ConferirAbertasAsync(stoppingToken);
                    if (mudaram > 0) log.LogInformation("Cobranças: {Quantidade} mudaram de situação na conferência.", mudaram);
                }
                // Pagamentos que esperam aprovação no app ou o processamento do banco.
                var pagos = await escopo.ServiceProvider.GetRequiredService<PagamentoService>().ConferirAbertosAsync(stoppingToken, incluirAgendadosFuturos: completa);
                if (pagos > 0) log.LogInformation("Pagamentos: {Quantidade} mudaram de situação na conferência.", pagos);
            }
            catch (Exception e) when (e is not OperationCanceledException)
            {
                log.LogWarning(e, "Conferência das cobranças falhou; tenta de novo no próximo ciclo.");
            }
        }
        while (await timer.WaitForNextTickAsync(stoppingToken));
    }
}

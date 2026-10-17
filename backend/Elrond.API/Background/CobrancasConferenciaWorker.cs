using Elrond.Application.Services;

namespace Elrond.API.Background;

/// <summary>
/// Conferência das cobranças em aberto: de hora em hora consulta no banco os boletos a receber,
/// em processamento ou sem confirmação. É a rede de segurança do aviso (webhook): se o aviso se
/// perder (servidor reiniciando, banco fora), o pagamento aparece mesmo assim.
/// </summary>
public sealed class CobrancasConferenciaWorker(IServiceScopeFactory escopos, ILogger<CobrancasConferenciaWorker> log) : BackgroundService
{
    private static readonly TimeSpan Intervalo = TimeSpan.FromHours(1);

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
        do
        {
            try
            {
                using var escopo = escopos.CreateScope();
                var mudaram = await escopo.ServiceProvider.GetRequiredService<ICobrancaService>().ConferirAbertasAsync(stoppingToken);
                if (mudaram > 0) log.LogInformation("Cobranças: {Quantidade} mudaram de situação na conferência.", mudaram);
            }
            catch (Exception e) when (e is not OperationCanceledException)
            {
                log.LogWarning(e, "Conferência das cobranças falhou; tenta de novo no próximo ciclo.");
            }
        }
        while (await timer.WaitForNextTickAsync(stoppingToken));
    }
}

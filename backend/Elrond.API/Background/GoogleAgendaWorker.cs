using Elrond.Application.Interfaces;

namespace Elrond.API.Background;

/// <summary>
/// Volta do Google Agenda: a cada 5 minutos lê o que mudou no Google (horário, exclusão) nos
/// eventos criados pelo ELROND. Sem a integração configurada, não faz nada.
/// </summary>
public sealed class GoogleAgendaWorker(IServiceScopeFactory escopos, ILogger<GoogleAgendaWorker> log) : BackgroundService
{
    private static readonly TimeSpan Intervalo = TimeSpan.FromMinutes(5);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        // Espera a API subir (migrations, seed) antes da primeira leitura.
        try
        {
            await Task.Delay(TimeSpan.FromMinutes(1), stoppingToken);
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
                var google = escopo.ServiceProvider.GetRequiredService<IGoogleAgendaService>();
                await google.PuxarTodosAsync(stoppingToken);
            }
            catch (Exception e) when (e is not OperationCanceledException)
            {
                log.LogWarning(e, "Leitura do Google Agenda falhou; tenta de novo no próximo ciclo.");
            }
        }
        while (await timer.WaitForNextTickAsync(stoppingToken));
    }
}

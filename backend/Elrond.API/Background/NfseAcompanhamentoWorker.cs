using Elrond.Application.Interfaces;

namespace Elrond.API.Background;

/// <summary>
/// Acompanhamento das NFS-e em andamento: a cada minuto consulta no provedor as notas cuja próxima
/// consulta venceu (a nota decide quando, com espera crescente). Cobre aviso perdido e envio sem
/// confirmação; com o aviso funcionando, quase sempre não encontra nada para fazer.
/// </summary>
public sealed class NfseAcompanhamentoWorker(IServiceScopeFactory escopos, ILogger<NfseAcompanhamentoWorker> log) : BackgroundService
{
    private static readonly TimeSpan Intervalo = TimeSpan.FromMinutes(1);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        try
        {
            // Espera a API subir (migrations, seed) antes da primeira rodada.
            await Task.Delay(TimeSpan.FromSeconds(30), stoppingToken);
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
                var consultadas = await escopo.ServiceProvider.GetRequiredService<INfseService>().AcompanharAsync(stoppingToken);
                if (consultadas > 0) log.LogInformation("NFS-e: {Quantidade} nota(s) consultada(s) no provedor.", consultadas);
            }
            catch (Exception e) when (e is not OperationCanceledException)
            {
                log.LogWarning(e, "Acompanhamento das NFS-e falhou; tenta de novo no próximo ciclo.");
            }
        }
        while (await timer.WaitForNextTickAsync(stoppingToken));
    }
}

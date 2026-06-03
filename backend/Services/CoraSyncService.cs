using CaudalesBackend.Clients;
using CaudalesBackend.Models;
using CaudalesBackend.Repositories;

namespace CaudalesBackend.Services;

internal sealed class CoraSyncService : BackgroundService
{
    private readonly CoraClient client;
    private readonly CoraRepository repository;
    private readonly IReadOnlyList<CoraOptions> plantasCora;
    private readonly SyncOptions options;
    private readonly ILogger<CoraSyncService> logger;

    public CoraSyncService(
        CoraClient client,
        CoraRepository repository,
        IReadOnlyList<CoraOptions> plantasCora,
        SyncOptions options,
        ILogger<CoraSyncService> logger)
    {
        this.client = client;
        this.repository = repository;
        this.plantasCora = plantasCora;
        this.options = options;
        this.logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        if (options.SincronizarAlArrancar)
        {
            await SincronizarAsync(stoppingToken);
        }

        using var timer = new PeriodicTimer(options.Intervalo);
        while (await timer.WaitForNextTickAsync(stoppingToken))
        {
            await SincronizarAsync(stoppingToken);
        }
    }

    private async Task SincronizarAsync(CancellationToken stoppingToken)
    {
        try
        {
            foreach (var planta in plantasCora)
            {
                var datos = await client.ObtenerDatosAsync(planta);
                stoppingToken.ThrowIfCancellationRequested();

                var guardados = await repository.GuardarDatosAsync(datos);
                logger.LogInformation(
                    "[CORA] Sincronizacion completada para {Planta}: {Guardados} registros.",
                    planta.Planta,
                    guardados);
            }
        }
        catch (OperationCanceledException)
        {
            // Cierre normal del servicio.
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "[CORA] Error al sincronizar.");
        }
    }
}

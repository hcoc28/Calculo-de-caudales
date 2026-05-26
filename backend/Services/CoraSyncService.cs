using CaudalesBackend.Clients;
using CaudalesBackend.Models;
using CaudalesBackend.Repositories;

namespace CaudalesBackend.Services;

internal sealed class CoraSyncService : BackgroundService
{
    private readonly CoraClient client;
    private readonly CoraRepository repository;
    private readonly SyncOptions options;
    private readonly ILogger<CoraSyncService> logger;

    public CoraSyncService(
        CoraClient client,
        CoraRepository repository,
        SyncOptions options,
        ILogger<CoraSyncService> logger)
    {
        this.client = client;
        this.repository = repository;
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
            var datos = await client.ObtenerDatosAsync();
            stoppingToken.ThrowIfCancellationRequested();

            var guardados = await repository.GuardarDatosAsync(datos);
            logger.LogInformation("[CORA] Sincronizacion completada: {Guardados} registros.", guardados);
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

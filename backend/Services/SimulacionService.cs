using CaudalesBackend.Clients;
using CaudalesBackend.Models;
using CaudalesBackend.Repositories;

namespace CaudalesBackend.Services;

internal sealed class SimulacionService
{
    private readonly CoraRepository repository;
    private readonly WeatherClient weatherClient;
    private readonly EscorrentiaOptions escorrentia;
    private readonly ILogger<SimulacionService> logger;

    public SimulacionService(
        CoraRepository repository,
        WeatherClient weatherClient,
        EscorrentiaOptions escorrentia,
        ILogger<SimulacionService> logger)
    {
        this.repository = repository;
        this.weatherClient = weatherClient;
        this.escorrentia = escorrentia;
        this.logger = logger;
    }

    public async Task<IResult> SimularAsync(SimulacionRequest request)
    {
        var planta = NormalizarPlanta(request.Planta);
        var limiteInferior = planta == "la-perla" ? 595 : 770;
        var limiteSuperior = planta == "la-perla" ? 600 : 778;

        if (request.NivelInicial < limiteInferior || request.NivelInicial > limiteSuperior)
        {
            return Results.BadRequest(new { error = $"El nivel inicial debe estar entre {limiteInferior} y {limiteSuperior} msnm." });
        }

        if (planta == "la-perla")
        {
            var alturaCanal = request.AlturaCanal ?? 0.50;
            var lluviaLaPerla = await ObtenerLluviaOSimulacionSecaAsync();
            var resultadoLaPerla = SimuladorLaPerla.SimularDia(request.NivelInicial, alturaCanal, lluviaLaPerla, escorrentia);
            return Results.Ok(resultadoLaPerla);
        }

        var fechaPatron = DateOnly.FromDateTime(DateTime.Now.AddDays(-1));
        var patron = await repository.ObtenerPatronEntradaAsync(fechaPatron);
        if (!patron.Completo)
        {
            return Results.Conflict(new
            {
                error = "Patron QE incompleto",
                patron.Fecha,
                patron.Registros,
                patron.Completo
            });
        }

        var datosLluvia = await ObtenerLluviaOSimulacionSecaAsync();
        var resultados = SimuladorCaudales.SimularDia(request.NivelInicial, datosLluvia, patron, escorrentia);
        return Results.Ok(resultados);
    }

    private static string NormalizarPlanta(string? planta)
    {
        return string.Equals(planta, "la-perla", StringComparison.OrdinalIgnoreCase)
            ? "la-perla"
            : "cafetal";
    }

    private async Task<double[]> ObtenerLluviaOSimulacionSecaAsync()
    {
        try
        {
            var clima = await weatherClient.ObtenerClimaAsync();
            return WeatherClient.ExtraerLluvia(clima);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "[CLIMA] No se pudo obtener lluvia. La simulacion continuara sin lluvia.");
            return new double[SimuladorCaudales.HorasSimulacion];
        }
    }
}

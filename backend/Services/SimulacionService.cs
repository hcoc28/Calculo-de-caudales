using CaudalesBackend.Clients;
using CaudalesBackend.Models;
using CaudalesBackend.Repositories;

namespace CaudalesBackend.Services;

internal sealed class SimulacionService
{
    private readonly CoraRepository repository;
    private readonly ProyeccionRepository proyeccionRepository;
    private readonly WeatherClient weatherClient;
    private readonly EscorrentiaOptions escorrentia;
    private readonly ILogger<SimulacionService> logger;

    public SimulacionService(
        CoraRepository repository,
        ProyeccionRepository proyeccionRepository,
        WeatherClient weatherClient,
        EscorrentiaOptions escorrentia,
        ILogger<SimulacionService> logger)
    {
        this.repository = repository;
        this.proyeccionRepository = proyeccionRepository;
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
            var resultadoLaPerla = SimuladorLaPerla.SimularDia(
                request.NivelInicial,
                alturaCanal,
                lluviaLaPerla,
                escorrentia,
                request.PotenciaGeneracion);
            return Results.Ok(await GuardarSiCorrespondeAsync(request, planta, resultadoLaPerla));
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
        var resultados = SimuladorCaudales.SimularDia(
            request.NivelInicial,
            datosLluvia,
            patron,
            escorrentia,
            request.PotenciaGeneracion);
        return Results.Ok(await GuardarSiCorrespondeAsync(request, planta, resultados));
    }

    private async Task<SimulacionResponse> GuardarSiCorrespondeAsync(
        SimulacionRequest request,
        string planta,
        SimulacionResponse simulacion)
    {
        if (!request.Guardar)
        {
            return simulacion;
        }

        var id = await proyeccionRepository.GuardarAsync(
            planta,
            request.NivelInicial,
            request.AlturaCanal,
            request.PotenciaGeneracion,
            simulacion);
        return simulacion with { ProyeccionId = id };
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

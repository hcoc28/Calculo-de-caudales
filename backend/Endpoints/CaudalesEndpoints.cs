using CaudalesBackend.Clients;
using CaudalesBackend.Infrastructure;
using CaudalesBackend.Models;
using CaudalesBackend.Repositories;
using CaudalesBackend.Services;
using Npgsql;

namespace CaudalesBackend.Endpoints;

internal static class CaudalesEndpoints
{
    public static WebApplication MapCaudalesApi(this WebApplication app)
    {
        app.MapGet("/api/estado", ObtenerEstado);
        app.MapGet("/api/salud", ObtenerSaludAsync);
        app.MapGet("/api/cora/datos", ObtenerDatosCoraAsync);
        app.MapGet("/api/cora/patron-entrada", ObtenerPatronEntradaAsync);
        app.MapPost("/api/cora/sincronizar", SincronizarCoraAsync).AddEndpointFilter<ApiKeyEndpointFilter>();
        app.MapGet("/api/clima", ObtenerClimaAsync);
        // Solo exige API key cuando la simulacion se va a guardar (persistir); la vista previa
        // (Guardar=false), usada por la actualizacion automatica del frontend, queda abierta.
        app.MapPost("/api/simulacion", SimularAsync).AddEndpointFilter(async (context, next) =>
        {
            var request = context.GetArgument<SimulacionRequest>(0);
            if (!request.Guardar) return await next(context);

            var resultado = ApiKeyVerificador.Verificar(context.HttpContext);
            return resultado ?? await next(context);
        });
        app.MapGet("/api/proyecciones", ListarProyeccionesAsync);
        app.MapGet("/api/proyecciones/{id:long}", ObtenerProyeccionAsync);
        app.MapPatch("/api/proyecciones/{id:long}/potencias", ActualizarPotenciasAsync).AddEndpointFilter<ApiKeyEndpointFilter>();
        app.MapGet("/api/proyecciones/{id:long}/comparacion", CompararProyeccionAsync);

        return app;
    }

    private static IResult ObtenerEstado()
    {
        return Results.Ok(new
        {
            ok = true,
            servicio = "calculo-caudales",
            fecha = DateTimeOffset.UtcNow
        });
    }

    private static async Task<IResult> ObtenerSaludAsync(NpgsqlDataSource db)
    {
        await using var command = db.CreateCommand("SELECT NOW() AS ahora");
        var ahora = await command.ExecuteScalarAsync();
        return Results.Ok(new { ok = true, db = new { ahora } });
    }

    private static async Task<IResult> ObtenerDatosCoraAsync(string? planta, int? cantidad, CoraRepository repository)
    {
        var limite = Math.Clamp(cantidad ?? 24, 1, 500);
        var datos = await repository.ListarDatosAsync(NormalizarPlanta(planta) ?? "cafetal", limite);
        return Results.Ok(datos);
    }

    private static async Task<IResult> ObtenerPatronEntradaAsync(string? planta, string? fecha, CoraRepository repository)
    {
        var plantaNormalizada = NormalizarPlanta(planta) ?? "cafetal";
        var fechaObjetivo = DateOnly.TryParse(fecha, out var parsed)
            ? parsed
            : DateOnly.FromDateTime(DateTime.Now.AddDays(-1));

        var patron = await repository.ObtenerPatronEntradaAsync(plantaNormalizada, fechaObjetivo);
        return Results.Ok(patron);
    }

    private static async Task<IResult> SincronizarCoraAsync(
        string? planta,
        CoraClient client,
        CoraRepository repository,
        IReadOnlyList<CoraOptions> opcionesCora)
    {
        var plantaNormalizada = NormalizarPlanta(planta) ?? "cafetal";
        var opciones = opcionesCora.FirstOrDefault(opcion => opcion.Planta == plantaNormalizada);
        if (opciones is null)
        {
            return Results.NotFound(new { error = $"No existe URL CORA configurada para {plantaNormalizada}." });
        }

        var datos = await client.ObtenerDatosAsync(opciones);
        var guardados = await repository.GuardarDatosAsync(datos);
        return Results.Ok(new { planta = plantaNormalizada, recibidos = datos.Count, guardados });
    }

    private static async Task<IResult> ObtenerClimaAsync(string? planta, WeatherClient client)
    {
        var clima = await client.ObtenerClimaAsync(NormalizarPlanta(planta) ?? "cafetal");
        return Results.Json(clima);
    }

    private static async Task<IResult> SimularAsync(SimulacionRequest request, SimulacionService service)
    {
        return await service.SimularAsync(request);
    }

    private static async Task<IResult> ListarProyeccionesAsync(string? planta, int? cantidad, ProyeccionRepository repository)
    {
        var limite = Math.Clamp(cantidad ?? 30, 1, 200);
        var plantaNormalizada = NormalizarPlanta(planta);
        var proyecciones = await repository.ListarAsync(plantaNormalizada, limite);
        return Results.Ok(proyecciones);
    }

    private static async Task<IResult> ObtenerProyeccionAsync(long id, ProyeccionRepository repository)
    {
        var proyeccion = await repository.ObtenerAsync(id);
        return proyeccion is null ? Results.NotFound(new { error = "Proyeccion no encontrada." }) : Results.Ok(proyeccion);
    }

    private static async Task<IResult> ActualizarPotenciasAsync(
        long id,
        AjustePotenciasRequest request,
        SimulacionService service)
    {
        return await service.ActualizarPotenciasAsync(id, request);
    }

    private static async Task<IResult> CompararProyeccionAsync(long id, SimulacionService service)
    {
        return await service.CompararAsync(id);
    }

    private static string? NormalizarPlanta(string? planta)
    {
        if (string.IsNullOrWhiteSpace(planta)) return null;
        return string.Equals(planta, "la-perla", StringComparison.OrdinalIgnoreCase)
            ? "la-perla"
            : "cafetal";
    }
}

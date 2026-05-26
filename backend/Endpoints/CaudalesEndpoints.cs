using CaudalesBackend.Clients;
using CaudalesBackend.Models;
using CaudalesBackend.Repositories;
using CaudalesBackend.Services;
using Npgsql;

namespace CaudalesBackend.Endpoints;

internal static class CaudalesEndpoints
{
    public static WebApplication MapCaudalesApi(this WebApplication app)
    {
        app.MapGet("/api/salud", ObtenerSaludAsync);
        app.MapGet("/api/cora/datos", ObtenerDatosCoraAsync);
        app.MapGet("/api/cora/patron-entrada", ObtenerPatronEntradaAsync);
        app.MapPost("/api/cora/sincronizar", SincronizarCoraAsync);
        app.MapGet("/api/clima", ObtenerClimaAsync);
        app.MapPost("/api/simulacion", SimularAsync);

        return app;
    }

    private static async Task<IResult> ObtenerSaludAsync(NpgsqlDataSource db)
    {
        await using var command = db.CreateCommand("SELECT NOW() AS ahora");
        var ahora = await command.ExecuteScalarAsync();
        return Results.Ok(new { ok = true, db = new { ahora } });
    }

    private static async Task<IResult> ObtenerDatosCoraAsync(int? cantidad, CoraRepository repository)
    {
        var limite = Math.Clamp(cantidad ?? 24, 1, 500);
        var datos = await repository.ListarDatosAsync(limite);
        return Results.Ok(datos);
    }

    private static async Task<IResult> ObtenerPatronEntradaAsync(string? fecha, CoraRepository repository)
    {
        var fechaObjetivo = DateOnly.TryParse(fecha, out var parsed)
            ? parsed
            : DateOnly.FromDateTime(DateTime.Now.AddDays(-1));

        var patron = await repository.ObtenerPatronEntradaAsync(fechaObjetivo);
        return Results.Ok(patron);
    }

    private static async Task<IResult> SincronizarCoraAsync(CoraClient client, CoraRepository repository)
    {
        var datos = await client.ObtenerDatosAsync();
        var guardados = await repository.GuardarDatosAsync(datos);
        return Results.Ok(new { recibidos = datos.Count, guardados });
    }

    private static async Task<IResult> ObtenerClimaAsync(WeatherClient client)
    {
        var clima = await client.ObtenerClimaAsync();
        return Results.Json(clima);
    }

    private static async Task<IResult> SimularAsync(SimulacionRequest request, SimulacionService service)
    {
        return await service.SimularAsync(request);
    }
}

using System.Text.Json.Nodes;

namespace CaudalesBackend.Models;

internal sealed record CoraOptions(string Planta, string ApiUrl, int Cantidad);

internal sealed record PlantWeatherOptions(string Planta, string Nombre, double Latitud, double Longitud);

internal sealed record SyncOptions(TimeSpan Intervalo, bool SincronizarAlArrancar);

internal sealed record DatoCora(
    string Planta,
    DateOnly Fecha,
    TimeOnly Hora,
    decimal? Nivel,
    decimal? Qe,
    decimal? Qs,
    decimal? Qv,
    decimal? PotenciaActiva,
    string? Clima,
    JsonNode DatosOriginales);

internal sealed record DatoCoraDto(
    long Id,
    string Planta,
    DateOnly Fecha,
    TimeOnly Hora,
    decimal? Nivel,
    decimal? Qe,
    decimal? Qs,
    decimal? Qv,
    decimal? PotenciaActiva,
    string? Clima,
    string FechaLectura,
    DateTime CreadoEn,
    DateTime ActualizadoEn);

internal sealed record PatronEntradaDto(
    DateOnly Fecha,
    decimal?[] Patron,
    int Registros,
    bool Completo);

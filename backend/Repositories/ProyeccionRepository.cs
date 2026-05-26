using System.Text.Json;
using CaudalesBackend.Models;
using Npgsql;

namespace CaudalesBackend.Repositories;

internal sealed class ProyeccionRepository
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);
    private readonly NpgsqlDataSource db;

    public ProyeccionRepository(NpgsqlDataSource db)
    {
        this.db = db;
    }

    public async Task<long> GuardarAsync(string planta, double nivelInicial, double? alturaCanal, SimulacionResponse simulacion)
    {
        const string sql = """
            INSERT INTO proyecciones (
              planta, nivel_inicial, altura_canal, fecha_patron, resultados, resumen
            )
            VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb)
            RETURNING id
            """;

        await using var command = db.CreateCommand(sql);
        command.Parameters.AddWithValue(planta);
        command.Parameters.AddWithValue(nivelInicial);
        command.Parameters.AddWithValue((object?)alturaCanal ?? DBNull.Value);
        command.Parameters.AddWithValue(simulacion.Resumen.FechaPatron == default ? DBNull.Value : simulacion.Resumen.FechaPatron);
        command.Parameters.AddWithValue(JsonSerializer.Serialize(simulacion.Resultados, JsonOptions));
        command.Parameters.AddWithValue(JsonSerializer.Serialize(simulacion.Resumen, JsonOptions));

        var id = await command.ExecuteScalarAsync();
        return Convert.ToInt64(id);
    }

    public async Task<List<ProyeccionResumenDto>> ListarAsync(string? planta, int limite)
    {
        const string sql = """
            SELECT
              id,
              planta,
              creado_en,
              nivel_inicial,
              altura_canal,
              fecha_patron,
              (resumen ->> 'nivelFinal')::double precision AS nivel_final,
              (resumen ->> 'horasProduccion')::int AS horas_produccion
            FROM proyecciones
            WHERE ($1 IS NULL OR planta = $1)
            ORDER BY creado_en DESC
            LIMIT $2
            """;

        await using var command = db.CreateCommand(sql);
        command.Parameters.AddWithValue((object?)planta ?? DBNull.Value);
        command.Parameters.AddWithValue(limite);
        await using var reader = await command.ExecuteReaderAsync();

        var proyecciones = new List<ProyeccionResumenDto>();
        while (await reader.ReadAsync())
        {
            proyecciones.Add(new ProyeccionResumenDto(
                reader.GetInt64(0),
                reader.GetString(1),
                reader.GetDateTime(2),
                reader.GetDouble(3),
                reader.IsDBNull(4) ? null : reader.GetDouble(4),
                reader.IsDBNull(5) ? null : reader.GetFieldValue<DateOnly>(5),
                reader.IsDBNull(6) ? 0 : reader.GetDouble(6),
                reader.IsDBNull(7) ? 0 : reader.GetInt32(7)));
        }

        return proyecciones;
    }

    public async Task<ProyeccionDetalleDto?> ObtenerAsync(long id)
    {
        const string sql = """
            SELECT
              id,
              planta,
              creado_en,
              nivel_inicial,
              altura_canal,
              fecha_patron,
              resultados::text,
              resumen::text
            FROM proyecciones
            WHERE id = $1
            """;

        await using var command = db.CreateCommand(sql);
        command.Parameters.AddWithValue(id);
        await using var reader = await command.ExecuteReaderAsync();
        if (!await reader.ReadAsync()) return null;

        var resultados = JsonSerializer.Deserialize<List<ResultadoHorarioDto>>(reader.GetString(6), JsonOptions) ?? [];
        var resumen = JsonSerializer.Deserialize<ResumenSimulacionDto>(reader.GetString(7), JsonOptions)
            ?? throw new InvalidOperationException("La proyeccion guardada no contiene resumen valido.");

        return new ProyeccionDetalleDto(
            reader.GetInt64(0),
            reader.GetString(1),
            reader.GetDateTime(2),
            reader.GetDouble(3),
            reader.IsDBNull(4) ? null : reader.GetDouble(4),
            reader.IsDBNull(5) ? null : reader.GetFieldValue<DateOnly>(5),
            resultados,
            resumen);
    }
}

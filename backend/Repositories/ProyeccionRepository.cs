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

    public async Task<long> GuardarAsync(
        string planta,
        double nivelInicial,
        double? alturaCanal,
        double? potenciaGeneracion,
        SimulacionResponse simulacion)
    {
        const string sql = """
            INSERT INTO proyecciones (
              planta, nivel_inicial, altura_canal, potencia_generacion, fecha_patron, resultados, resumen
            )
            VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb)
            RETURNING id
            """;

        await using var command = db.CreateCommand(sql);
        command.Parameters.AddWithValue(planta);
        command.Parameters.AddWithValue(nivelInicial);
        command.Parameters.AddWithValue((object?)alturaCanal ?? DBNull.Value);
        command.Parameters.AddWithValue(potenciaGeneracion ?? simulacion.Resumen.PotenciaElegida);
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
              COALESCE(potencia_generacion, (resumen ->> 'potenciaElegida')::double precision) AS potencia_generacion,
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
                reader.IsDBNull(5) ? null : reader.GetDouble(5),
                reader.IsDBNull(6) ? null : reader.GetFieldValue<DateOnly>(6),
                reader.IsDBNull(7) ? 0 : reader.GetDouble(7),
                reader.IsDBNull(8) ? 0 : reader.GetInt32(8)));
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
              COALESCE(potencia_generacion, (resumen ->> 'potenciaElegida')::double precision) AS potencia_generacion,
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

        var resultados = JsonSerializer.Deserialize<List<ResultadoHorarioDto>>(reader.GetString(7), JsonOptions) ?? [];
        var resumen = JsonSerializer.Deserialize<ResumenSimulacionDto>(reader.GetString(8), JsonOptions)
            ?? throw new InvalidOperationException("La proyeccion guardada no contiene resumen valido.");

        return new ProyeccionDetalleDto(
            reader.GetInt64(0),
            reader.GetString(1),
            reader.GetDateTime(2),
            reader.GetDouble(3),
            reader.IsDBNull(4) ? null : reader.GetDouble(4),
            reader.IsDBNull(5) ? null : reader.GetDouble(5),
            reader.IsDBNull(6) ? null : reader.GetFieldValue<DateOnly>(6),
            resultados,
            resumen);
    }

    public async Task ActualizarResultadosAsync(long id, SimulacionResponse simulacion)
    {
        const string sql = """
            UPDATE proyecciones
            SET
              potencia_generacion = $2,
              resultados = $3::jsonb,
              resumen = $4::jsonb
            WHERE id = $1
            """;

        await using var command = db.CreateCommand(sql);
        command.Parameters.AddWithValue(id);
        command.Parameters.AddWithValue(simulacion.Resumen.PotenciaElegida);
        command.Parameters.AddWithValue(JsonSerializer.Serialize(simulacion.Resultados, JsonOptions));
        command.Parameters.AddWithValue(JsonSerializer.Serialize(simulacion.Resumen, JsonOptions));
        await command.ExecuteNonQueryAsync();
    }
}

using CaudalesBackend.Models;
using Npgsql;

namespace CaudalesBackend.Repositories;

internal sealed class CoraRepository
{
    private readonly NpgsqlDataSource db;

    public CoraRepository(NpgsqlDataSource db)
    {
        this.db = db;
    }

    public async Task<int> GuardarDatosAsync(IEnumerable<DatoCora> datos)
    {
        var guardados = 0;
        foreach (var dato in datos)
        {
            await GuardarDatoAsync(dato);
            guardados++;
        }

        return guardados;
    }

    public async Task<List<DatoCoraDto>> ListarDatosAsync(string planta, int limite)
    {
        const string sql = """
            SELECT
              id,
              planta,
              fecha,
              hora,
              nivel,
              qe,
              qs,
              qv,
              potencia_activa,
              clima,
              (fecha::text || 'T' || hora::text) AS fecha_lectura,
              creado_en,
              actualizado_en
            FROM datos_cora
            WHERE planta = $1
            ORDER BY fecha DESC, hora DESC
            LIMIT $2
            """;

        await using var command = db.CreateCommand(sql);
        command.Parameters.AddWithValue(planta);
        command.Parameters.AddWithValue(limite);
        await using var reader = await command.ExecuteReaderAsync();

        var datos = new List<DatoCoraDto>();
        while (await reader.ReadAsync())
        {
            datos.Add(new DatoCoraDto(
                reader.GetInt64(0),
                reader.GetString(1),
                reader.GetFieldValue<DateOnly>(2),
                reader.GetFieldValue<TimeOnly>(3),
                ReadNullableDecimal(reader, 4),
                ReadNullableDecimal(reader, 5),
                ReadNullableDecimal(reader, 6),
                ReadNullableDecimal(reader, 7),
                ReadNullableDecimal(reader, 8),
                reader.IsDBNull(9) ? null : reader.GetString(9),
                reader.GetString(10),
                reader.GetDateTime(11),
                reader.GetDateTime(12)));
        }

        return datos;
    }

    public async Task<PatronEntradaDto> ObtenerPatronEntradaAsync(string planta, DateOnly fecha)
    {
        const string sql = """
            SELECT (EXTRACT(HOUR FROM hora)::int + 1) AS hora_operativa, qe
            FROM datos_cora
            WHERE planta = $1
              AND fecha = $2
              AND qe IS NOT NULL
            ORDER BY hora_operativa ASC
            """;

        var patron = new decimal?[24];
        var registros = 0;

        await using var command = db.CreateCommand(sql);
        command.Parameters.AddWithValue(planta);
        command.Parameters.AddWithValue(fecha);
        await using var reader = await command.ExecuteReaderAsync();

        while (await reader.ReadAsync())
        {
            var horaOperativa = reader.GetInt32(0);
            var indice = horaOperativa - 1;
            if (indice is >= 0 and < 24)
            {
                patron[indice] = reader.GetDecimal(1);
                registros++;
            }
        }

        return new PatronEntradaDto(fecha, patron, registros, patron.All(valor => valor.HasValue));
    }

    private async Task GuardarDatoAsync(DatoCora dato)
    {
        const string sql = """
            INSERT INTO datos_cora (
              planta, fecha, hora, nivel, qe, qs, qv, potencia_activa, clima, datos_originales
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb)
            ON CONFLICT (planta, fecha, hora)
            DO UPDATE SET
              nivel = EXCLUDED.nivel,
              qe = EXCLUDED.qe,
              qs = EXCLUDED.qs,
              qv = EXCLUDED.qv,
              potencia_activa = EXCLUDED.potencia_activa,
              clima = EXCLUDED.clima,
              datos_originales = EXCLUDED.datos_originales,
              actualizado_en = CURRENT_TIMESTAMP
            """;

        await using var command = db.CreateCommand(sql);
        command.Parameters.AddWithValue(dato.Planta);
        command.Parameters.AddWithValue(dato.Fecha);
        command.Parameters.AddWithValue(dato.Hora);
        command.Parameters.AddWithValue((object?)dato.Nivel ?? DBNull.Value);
        command.Parameters.AddWithValue((object?)dato.Qe ?? DBNull.Value);
        command.Parameters.AddWithValue((object?)dato.Qs ?? DBNull.Value);
        command.Parameters.AddWithValue((object?)dato.Qv ?? DBNull.Value);
        command.Parameters.AddWithValue((object?)dato.PotenciaActiva ?? DBNull.Value);
        command.Parameters.AddWithValue((object?)dato.Clima ?? DBNull.Value);
        command.Parameters.AddWithValue(dato.DatosOriginales.ToJsonString());
        await command.ExecuteNonQueryAsync();
    }

    private static decimal? ReadNullableDecimal(NpgsqlDataReader reader, int index)
    {
        return reader.IsDBNull(index) ? null : reader.GetDecimal(index);
    }
}

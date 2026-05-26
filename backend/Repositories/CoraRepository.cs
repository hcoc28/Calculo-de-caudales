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

    public async Task<List<DatoCoraDto>> ListarDatosAsync(int limite)
    {
        const string sql = """
            SELECT
              id,
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
            ORDER BY fecha DESC, hora DESC
            LIMIT $1
            """;

        await using var command = db.CreateCommand(sql);
        command.Parameters.AddWithValue(limite);
        await using var reader = await command.ExecuteReaderAsync();

        var datos = new List<DatoCoraDto>();
        while (await reader.ReadAsync())
        {
            datos.Add(new DatoCoraDto(
                reader.GetInt64(0),
                reader.GetFieldValue<DateOnly>(1),
                reader.GetFieldValue<TimeOnly>(2),
                ReadNullableDecimal(reader, 3),
                ReadNullableDecimal(reader, 4),
                ReadNullableDecimal(reader, 5),
                ReadNullableDecimal(reader, 6),
                ReadNullableDecimal(reader, 7),
                reader.IsDBNull(8) ? null : reader.GetString(8),
                reader.GetString(9),
                reader.GetDateTime(10),
                reader.GetDateTime(11)));
        }

        return datos;
    }

    public async Task<PatronEntradaDto> ObtenerPatronEntradaAsync(DateOnly fecha)
    {
        const string sql = """
            SELECT EXTRACT(HOUR FROM hora)::int AS hora, qe
            FROM datos_cora
            WHERE fecha = $1
              AND qe IS NOT NULL
            ORDER BY hora ASC
            """;

        var patron = new decimal?[24];
        var registros = 0;

        await using var command = db.CreateCommand(sql);
        command.Parameters.AddWithValue(fecha);
        await using var reader = await command.ExecuteReaderAsync();

        while (await reader.ReadAsync())
        {
            var hora = reader.GetInt32(0);
            if (hora is >= 0 and < 24)
            {
                patron[hora] = reader.GetDecimal(1);
                registros++;
            }
        }

        return new PatronEntradaDto(fecha, patron, registros, patron.All(valor => valor.HasValue));
    }

    private async Task GuardarDatoAsync(DatoCora dato)
    {
        const string sql = """
            INSERT INTO datos_cora (
              fecha, hora, nivel, qe, qs, qv, potencia_activa, clima, datos_originales
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)
            ON CONFLICT (fecha, hora)
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

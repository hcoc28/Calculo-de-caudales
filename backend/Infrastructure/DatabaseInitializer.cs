using Npgsql;

namespace CaudalesBackend.Infrastructure;

internal sealed class DatabaseInitializer
{
    private readonly NpgsqlDataSource db;
    private readonly ILogger<DatabaseInitializer> logger;

    public DatabaseInitializer(NpgsqlDataSource db, ILogger<DatabaseInitializer> logger)
    {
        this.db = db;
        this.logger = logger;
    }

    public async Task InitializeAsync(CancellationToken cancellationToken = default)
    {
        const string sql = """
            CREATE TABLE IF NOT EXISTS datos_cora (
              id BIGSERIAL PRIMARY KEY,
              fecha DATE NOT NULL,
              hora TIME NOT NULL,
              nivel NUMERIC(10, 2),
              qe NUMERIC(10, 2),
              qs NUMERIC(10, 2),
              qv NUMERIC(10, 2),
              potencia_activa NUMERIC(10, 2),
              clima TEXT,
              datos_originales JSONB,
              creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
              actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
              CONSTRAINT datos_cora_fecha_hora_unique UNIQUE (fecha, hora)
            );

            CREATE INDEX IF NOT EXISTS idx_datos_cora_fecha_hora
            ON datos_cora (fecha DESC, hora DESC);
            """;

        await using var command = db.CreateCommand(sql);
        await command.ExecuteNonQueryAsync(cancellationToken);
        logger.LogInformation("[DB] Tabla datos_cora verificada.");
    }
}

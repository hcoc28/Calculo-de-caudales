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

            CREATE TABLE IF NOT EXISTS proyecciones (
              id BIGSERIAL PRIMARY KEY,
              planta TEXT NOT NULL,
              nivel_inicial DOUBLE PRECISION NOT NULL,
              altura_canal DOUBLE PRECISION,
              potencia_generacion DOUBLE PRECISION,
              fecha_patron DATE,
              resultados JSONB NOT NULL,
              resumen JSONB NOT NULL,
              creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            );

            ALTER TABLE proyecciones
            ADD COLUMN IF NOT EXISTS potencia_generacion DOUBLE PRECISION;

            CREATE INDEX IF NOT EXISTS idx_proyecciones_planta_creado
            ON proyecciones (planta, creado_en DESC);
            """;

        try
        {
            await using var command = db.CreateCommand(sql);
            await command.ExecuteNonQueryAsync(cancellationToken);
            logger.LogInformation("[DB] Tablas datos_cora y proyecciones verificadas.");
        }
        catch (PostgresException ex) when (ex.SqlState == PostgresErrorCodes.InsufficientPrivilege)
        {
            logger.LogError(ex, "[DB] El usuario de PostgreSQL no tiene permiso para crear tablas en el esquema public.");
        }
    }
}

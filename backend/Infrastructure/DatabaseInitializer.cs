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
              planta TEXT NOT NULL DEFAULT 'cafetal',
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
              CONSTRAINT datos_cora_planta_fecha_hora_unique UNIQUE (planta, fecha, hora)
            );

            ALTER TABLE datos_cora
            ADD COLUMN IF NOT EXISTS planta TEXT NOT NULL DEFAULT 'cafetal';

            ALTER TABLE datos_cora
            DROP CONSTRAINT IF EXISTS datos_cora_fecha_hora_unique;

            CREATE INDEX IF NOT EXISTS idx_datos_cora_fecha_hora
            ON datos_cora (planta, fecha DESC, hora DESC);

            CREATE UNIQUE INDEX IF NOT EXISTS idx_datos_cora_planta_fecha_hora_unique
            ON datos_cora (planta, fecha, hora);

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
        catch (Exception ex)
        {
            // No se pudo conectar (DATABASE_URL invalida, DNS, base caida, etc.). No abortamos el
            // arranque: es preferible que el servicio quede en pie sirviendo /api/salud y el
            // frontend, aunque las funciones que dependen de la base fallen, a que Render marque
            // el deploy entero como caido.
            logger.LogError(ex, "[DB] No se pudo conectar a PostgreSQL para verificar/crear las tablas.");
        }
    }
}

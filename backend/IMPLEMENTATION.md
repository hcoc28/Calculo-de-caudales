# Implementacion backend C#

El backend activo esta implementado en ASP.NET Core.

## Flujo

```text
API CORA -> ASP.NET Core -> PostgreSQL -> ASP.NET Core -> frontend
```

El frontend no consulta CORA directamente. Toda lectura real del embalse y todo patron de entrada `QE` sale de PostgreSQL a traves del backend.

## Responsabilidades de `Program.cs`

- Carga variables desde `.env`.
- Convierte `DATABASE_URL` estilo `postgres://...` al formato requerido por Npgsql.
- Configura el puerto `4000`.
- Registra `NpgsqlDataSource`.
- Consulta CORA con `HttpClient`.
- Normaliza campos variables de CORA.
- Inserta/actualiza registros en PostgreSQL.
- Sirve `../frontend` como sitio estatico.
- Ejecuta un `BackgroundService` para sincronizar CORA periodicamente.

## Proyeccion de caudal de entrada

El patron fijo del frontend fue retirado. La simulacion utiliza:

```text
GET /api/cora/patron-entrada
```

Ese endpoint toma los valores `QE` del dia anterior desde las `00:00` hasta las `23:00`.

Si falta alguna hora, el backend devuelve `completo: false` y el frontend no ejecuta la simulacion hasta tener 24 registros horarios.

## Base de datos

Ver `sql/init.sql`.

Campos principales:

- `fecha`
- `hora`
- `nivel`
- `qe`
- `qs`
- `qv`
- `potencia_activa`
- `clima`
- `datos_originales`

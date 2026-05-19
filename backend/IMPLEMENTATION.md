# Backend

Implementación activa con Node.js, Express y PostgreSQL.

## Flujo

```text
API CORA -> backend -> PostgreSQL -> frontend
```

El backend consulta CORA automáticamente cada hora y guarda o actualiza registros por `fecha` + `hora`.

El frontend no consulta CORA directamente. Toda lectura real del embalse y todo patrón de entrada `QE` sale de PostgreSQL a través del backend.

## Tabla principal

Ver `sql/init.sql`.

Campos:

- `fecha`
- `hora`
- `nivel`
- `qe`
- `qs`
- `qv`
- `potencia_activa`
- `clima`
- `datos_originales`

## Archivos

- `src/server.js`: API HTTP.
- `src/db.js`: conexión a PostgreSQL.
- `src/coraClient.js`: consumo y normalización de datos CORA.
- `src/coraRepository.js`: inserción/consulta en PostgreSQL.
- `src/scheduler.js`: sincronización automática cada hora.
- `sql/create_database.sql`: creación de base y usuario.
- `sql/init.sql`: creación de tabla e índices.

## Proyección de caudal de entrada

El patrón fijo del frontend fue retirado. La simulación utiliza `GET /api/cora/patron-entrada`, que toma los valores `QE` del día anterior desde las `00:00` hasta las `23:00`.

Si falta alguna hora, el backend marca `completo: false` y el frontend no ejecuta la simulación hasta que la base tenga los 24 registros horarios.

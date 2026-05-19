# Backend - Cálculo de Caudales

Backend para guardar automáticamente los datos horarios de la API CORA en PostgreSQL.

## Datos almacenados

La tabla `datos_cora` guarda:

- `fecha`
- `hora`
- `nivel`
- `qe`
- `qs`
- `qv`
- `potencia_activa`
- `clima`
- `datos_originales`

## Configuración

1. Crear la base y usuario en PostgreSQL:

```bash
psql -U postgres -f sql/create_database.sql
```

2. Crear las tablas:

```bash
psql -U postgres -d calculo_caudales -f sql/init.sql
```

3. Copiar `.env.example` como `.env` y ajustar la contraseña:

```env
DATABASE_URL=postgres://caudales_user:tu_password_seguro@localhost:5432/calculo_caudales
```

4. Instalar dependencias y ejecutar:

```bash
npm install
npm start
```

El backend y el frontend quedan en un solo puerto:

```text
http://localhost:4000
```

## Sincronización automática

La variable `CORA_SYNC_CRON=0 * * * *` hace que el backend consulte CORA cada hora, en el minuto 0, y guarde los datos en PostgreSQL.

También sincroniza al iniciar si `CORA_SYNC_ON_START=true`.

## Patrón de entrada para proyección

El frontend ya no usa un patrón fijo de caudal. Para simular el día siguiente, solicita al backend el patrón de `QE` del día anterior:

```text
GET /api/cora/patron-entrada
```

El backend devuelve un arreglo de 24 posiciones, de la hora `00:00` a `23:00`, tomado desde `datos_cora.qe`.

También se puede pedir una fecha específica:

```text
GET /api/cora/patron-entrada?fecha=2026-05-18
```

## Endpoints

```text
GET  /api/salud
GET  /api/cora/datos?cantidad=24
GET  /api/cora/patron-entrada
POST /api/cora/sincronizar
```

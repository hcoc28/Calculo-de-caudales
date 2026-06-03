# Despliegue en Azure

Esta guia deja el proyecto listo para un uso serio en Azure. La aplicacion debe correr como contenedor Docker y la base de datos debe ser PostgreSQL administrado por Azure.

## Arquitectura recomendada

```text
GitHub
  -> Dockerfile
  -> Azure App Service for Containers
  -> Azure Database for PostgreSQL Flexible Server
```

## Servicios de Azure

Usa estos servicios:

- `Azure App Service`: aloja el backend C# y el frontend en un solo puerto.
- `Azure Database for PostgreSQL Flexible Server`: guarda datos CORA y proyecciones.
- `Application Insights`: registra errores, tiempos de respuesta y disponibilidad.
- `Azure Monitor`: envia alertas si la pagina o la API dejan de responder.

## Base de datos

Crea un `Azure Database for PostgreSQL Flexible Server`.

Datos recomendados:

```text
Base de datos: calculo_caudales
Puerto: 5432
SSL: requerido
```

La aplicacion crea automaticamente las tablas:

- `datos_cora`
- `proyecciones`

Si Azure muestra errores de permisos, el usuario de PostgreSQL debe tener permiso para crear tablas o debes ejecutar manualmente `backend/sql/init.sql`.

## App Service

Crea un `App Service` con estas opciones:

```text
Publish: Container
Sistema operativo: Linux
Contenedor: Dockerfile del repositorio
```

El contenedor escucha en el puerto `4000`, por eso Azure debe tener:

```text
WEBSITES_PORT=4000
PORT=4000
```

## Variables de entorno

Configura estas variables en `App Service > Settings > Environment variables`:

```text
PORT=4000
WEBSITES_PORT=4000
DATABASE_URL=Host=TU_SERVIDOR.postgres.database.azure.com;Port=5432;Database=calculo_caudales;Username=TU_USUARIO;Password=TU_PASSWORD;SSL Mode=Require;Trust Server Certificate=true
CORA_API_URL=https://cora.cavcenergy.com/api/plants/embalselectura/embalseion/ultimos/f595b230-39b2-460e-96f2-f397e5f91f38
CORA_API_URL_LA_PERLA=URL_CORA_DE_LA_PERLA
CORA_API_CANTIDAD=72
CORA_SYNC_MINUTES=10
CORA_SYNC_ON_START=true
ESCORRENTIA_COEFICIENTE=0.65
ESCORRENTIA_AREA_M2=
LA_PERLA_LATITUD=15.3000
LA_PERLA_LONGITUD=-90.0700
```

No guardes secretos en GitHub ni en archivos `.env` subidos al repositorio.

`LA_PERLA_LATITUD` y `LA_PERLA_LONGITUD` estan como valores aproximados de Tucuru. Cambialos cuando tengas las coordenadas exactas de la planta.

## Health check

Configura el Health Check de App Service con:

```text
/api/estado
```

Ese endpoint valida que la aplicacion esta viva.

Para validar aplicacion + PostgreSQL usa:

```text
/api/salud
```

No uses `/api/salud` como health check principal si quieres evitar reinicios por una caida temporal de la base de datos.

## Deployment Center

En `App Service > Deployment Center`:

1. Selecciona `GitHub`.
2. Elige el repositorio `Calculo-de-caudales`.
3. Selecciona la rama `main`.
4. Usa el `Dockerfile` del repositorio.
5. Guarda y deja que Azure genere el flujo de despliegue.

## Si la pagina cae

Revisa en este orden:

1. Abre `https://TU_APP.azurewebsites.net/api/estado`.
   - Si no responde, el contenedor o App Service no esta funcionando.
2. Abre `https://TU_APP.azurewebsites.net/api/salud`.
   - Si `/api/estado` responde pero `/api/salud` falla, el problema es PostgreSQL o `DATABASE_URL`.
3. En Azure entra a `App Service > Log stream`.
   - Busca errores de arranque, `DATABASE_URL`, CORA o PostgreSQL.
4. Entra a `App Service > Diagnose and solve problems`.
   - Revisa reinicios, errores 500 y consumo de memoria.
5. Entra a `Azure Database for PostgreSQL > Connection security / Networking`.
   - Verifica firewall, SSL y acceso desde Azure.

## Alertas recomendadas

Configura alertas en Azure Monitor:

- Availability test a `/api/estado` cada 5 minutos.
- Alerta si el sitio no responde por 2 pruebas seguidas.
- Alerta si HTTP 5xx supera un umbral.
- Alerta si CPU o memoria se mantiene alta.
- Alerta si PostgreSQL tiene demasiadas conexiones o esta inaccesible.

## Backups

Azure Database for PostgreSQL Flexible Server incluye backups automaticos. Para produccion:

- Activa retencion de backups de al menos 7 dias.
- Usa zona/regional redundancy si el presupuesto lo permite.
- Antes de cambios grandes, genera un backup o exportacion.

## Costos

Para produccion real no uses planes gratuitos. Usa al menos:

- App Service Basic o superior.
- PostgreSQL Flexible Server con almacenamiento suficiente.
- Application Insights activo.

Si el proyecto aun esta en pruebas, Render puede ser suficiente. Para uso serio en planta, Azure con PostgreSQL administrado es mas apropiado.

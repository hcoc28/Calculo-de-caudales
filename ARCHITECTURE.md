# Arquitectura

## Flujo principal

```text
CORA
  -> ASP.NET Core
  -> PostgreSQL
  -> ASP.NET Core
  -> Frontend
```

El navegador no consulta CORA directamente. Todo dato CORA pasa por el backend C# y queda guardado en PostgreSQL por planta. El Cafetal y La Perla pueden sincronizar CORA si sus URLs estan configuradas.

## Simulacion

```text
Frontend envia planta y nivel inicial
  -> POST /api/simulacion
  -> C# elige simulador segun planta
  -> C# lee QE del dia anterior desde PostgreSQL segun la planta
  -> La Perla conserva su tabla volumen/nivel y formula de potencia/eficiencia
  -> C# consulta lluvia horaria
  -> C# suma escorrentia al QE
  -> C# calcula potencia, salida, volumen y nivel
  -> Frontend pinta la tabla
```

La regla de lluvia es:

```text
Q_lluvia = C * lluvia_mm * area_m2 / 1000 / 3600
```

Donde:

- `lluvia_mm`: precipitacion horaria.
- `area_m2`: area configurada o estimada.
- `C`: coeficiente de escorrentia.
- `/1000`: convierte litros a metros cubicos.
- `/3600`: convierte volumen horario a m3/s.

## Responsabilidades por archivo

### Backend

- `CaudalesBackend.csproj`: define el proyecto ASP.NET Core y la dependencia `Npgsql`.
- `Program.cs`: arranque del servidor. Debe quedarse pequeno.
- `Configuration/`: carga `.env`, parsea variables y arma `AppSettings`.
- `Clients/`: contiene `CoraClient` y `WeatherClient`.
- `Repositories/`: contiene `CoraRepository` y `ProyeccionRepository`, las clases que escriben y leen PostgreSQL.
- `Services/`: contiene `CoraSyncService`, `SimulacionService` y `SimuladorCaudales`.
- `Services/SimuladorLaPerla.cs`: tabla de embalse La Perla y potencia/eficiencia del documento; puede usar patron CORA como entrada.
- `Models/`: contiene records/DTOs usados por API, CORA y simulacion.
- `Endpoints/`: contiene las rutas HTTP.
- `Extensions/`: registra servicios y configura archivos estaticos.
- `Infrastructure/`: utilidades compartidas como `HttpJsonFetcher`.
- `sql/create_database.sql`: creacion inicial de base y usuario.
- `sql/init.sql`: creacion de tabla `datos_cora`.

### Frontend

- `index.html`: estructura visual.
- `css/styles.css`: estilos.
- `js/config.js`: ubicacion, intervalos, endpoints y codigos de clima.
- `js/api.js`: llamadas HTTP al backend C#.
- `js/ui.js`: renderizado de clima, embalse y resultados.
- `js/main.js`: coordinacion de actualizaciones.

## Sincronizacion CORA

`CoraSyncService` es un `BackgroundService`. Corre dentro del backend aunque la pagina web no este abierta.

Al arrancar:

```text
si CORA_SYNC_ON_START=true -> sincroniza inmediatamente
```

Luego:

```text
cada CORA_SYNC_MINUTES -> consulta CORA por planta configurada -> guarda o actualiza PostgreSQL
```

## Puerto unico

El backend sirve tambien los archivos de `frontend`, por eso se usa solo:

```text
http://localhost:4000
```

No hace falta abrir un servidor separado en `3000`.

En produccion Render debe ejecutar el backend como `Web Service`. No debe publicarse como `Static Site`, porque la app necesita ASP.NET Core para servir `/`, `/api/*` y ejecutar el sincronizador automatico.

## Por que queda JavaScript

El navegador ejecuta HTML, CSS y JavaScript. Por eso `api.js`, `main.js`, `ui.js` y `config.js` siguen existiendo:

- `api.js`: llama al backend C#.
- `main.js`: coordina eventos del navegador.
- `ui.js`: actualiza el DOM.
- `config.js`: guarda endpoints, codigos de clima y constantes visuales.

La logica de negocio ya no esta en JavaScript. Los calculos, CORA, PostgreSQL y la sincronizacion viven en C#.

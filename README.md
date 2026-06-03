# Calculo de Caudales

Sistema para consultar datos horarios de CORA, guardarlos en PostgreSQL y simular la operacion diaria del embalse desde un backend C#.

## Que hace

- Consulta la API CORA desde ASP.NET Core.
- Guarda en PostgreSQL por planta: fecha, hora, nivel, QE, QS, QV, potencia activa, clima y JSON original.
- Sincroniza CORA automaticamente aunque la pagina web no este abierta.
- Usa el QE del dia anterior como patron operativo de 24 horas para la proyeccion del dia siguiente.
- Consulta clima desde el backend.
- Permite navegar entre dos plantas: El Cafetal y La Perla.
- Guarda proyecciones realizadas y permite consultarlas por planta.
- Permite editar la potencia de una proyeccion guardada con doble click sobre la celda de potencia.
- Para La Perla usa datos CORA para el patron de entrada, clima de Tucuru y conserva su tabla volumen/nivel 595-600 msnm y caudal turbinado por potencia/eficiencia.
- Suma la lluvia directamente al caudal de entrada usando escorrentia:

```text
1 mm de lluvia sobre 1 m2 = 1 litro
Q_lluvia = C * lluvia_mm * area_m2 / 1000 / 3600
```

- Sirve el frontend y la API en un solo puerto.

## Que no hace

- Ya no calcula la simulacion en JavaScript.
- Ya no usa `calculator.js`.
- Ya no usa `npm start` para el backend.
- Ya no depende de que el navegador este abierto para llenar la base de datos.

## Estructura

```text
Calculo-de-caudales/
├── backend/
│   ├── CaudalesBackend.csproj
│   ├── Program.cs
│   ├── .env.example
│   ├── Clients/
│   ├── Configuration/
│   ├── Endpoints/
│   ├── Extensions/
│   ├── Infrastructure/
│   ├── Models/
│   ├── Repositories/
│   ├── Services/
│   ├── sql/
│   │   ├── create_database.sql
│   │   └── init.sql
│   ├── start-backend.cmd
│   └── start-backend.ps1
├── frontend/
│   ├── index.html
│   ├── css/styles.css
│   └── js/
│       ├── api.js
│       ├── config.js
│       ├── main.js
│       └── ui.js
└── DOCUMENTACION_COMPLETA.md
```

## Como ejecutar

Desde PowerShell:

```powershell
cd "C:\Users\coced\Desktop\Calculo-de-caudales\backend"
.\start-backend.cmd
```

Luego abre:

```text
http://localhost:4000
```

Ese puerto sirve todo: frontend, API, CORA, clima y simulacion.

## Render

En Render debe crearse como `Web Service`, no como `Static Site`. El frontend lo sirve ASP.NET Core desde el mismo backend.

El proyecto incluye:

- `Dockerfile`: compila y ejecuta el backend C# junto con el frontend.
- `render.yaml`: plantilla de Render para desplegar como servicio Docker.

Variables que debes configurar en Render:

```text
DATABASE_URL
CORA_API_URL
CORA_API_URL_LA_PERLA
CORA_API_CANTIDAD=72
CORA_SYNC_MINUTES=10
CORA_SYNC_ON_START=true
ESCORRENTIA_COEFICIENTE=0.65
ESCORRENTIA_AREA_M2
CAFETAL_LATITUD=15.22553
CAFETAL_LONGITUD=-90.11064
LA_PERLA_LATITUD=15.640000
LA_PERLA_LONGITUD=-90.069444
```

El backend escucha en `0.0.0.0` usando la variable `PORT`, que es lo que Render necesita para enrutar trafico publico.

## Azure

Para uso serio en produccion se recomienda:

```text
Azure App Service for Containers
Azure Database for PostgreSQL Flexible Server
Application Insights
Azure Monitor
```

La guia completa esta en:

```text
AZURE_DEPLOYMENT.md
```

## Base de datos

La base se llama normalmente:

```text
calculo_caudales
```

La tabla principal es:

```text
datos_cora
```

Tambien existe:

```text
proyecciones
```

El backend evita duplicados en CORA con una regla unica por `fecha + hora`. Si CORA manda de nuevo una hora ya existente, el registro se actualiza.

## Configuracion

Copia `backend/.env.example` como `backend/.env` y coloca tus datos reales:

```env
PORT=4000
DATABASE_URL=postgres://caudales_user:TU_PASSWORD@localhost:5432/calculo_caudales
CORA_API_URL=https://cora.cavcenergy.com/api/plants/embalselectura/embalseion/ultimos/f595b230-39b2-460e-96f2-f397e5f91f38
CORA_API_URL_LA_PERLA=
CORA_API_CANTIDAD=72
CORA_SYNC_MINUTES=10
CORA_SYNC_ON_START=true
ESCORRENTIA_COEFICIENTE=0.65
ESCORRENTIA_AREA_M2=
CAFETAL_LATITUD=15.22553
CAFETAL_LONGITUD=-90.11064
LA_PERLA_LATITUD=15.640000
LA_PERLA_LONGITUD=-90.069444
```

`CORA_API_CANTIDAD=72` ayuda a recuperar suficientes lecturas para completar el dia anterior aunque el backend se arranque a media tarde.

`ESCORRENTIA_AREA_M2` puede quedar vacio. En ese caso C# estima el area desde la tabla volumen/nivel del simulador.

## Endpoints utiles

```text
GET  /api/salud
GET  /api/estado
GET  /api/cora/datos?planta=cafetal&cantidad=72
GET  /api/cora/patron-entrada?planta=la-perla
POST /api/cora/sincronizar?planta=la-perla
GET  /api/clima?planta=la-perla
POST /api/simulacion
GET  /api/proyecciones?planta=cafetal
GET  /api/proyecciones/{id}
PATCH /api/proyecciones/{id}/potencias
```

## Archivos clave

- `backend/Program.cs`: arranque limpio de la aplicacion.
- `backend/Configuration/`: lectura de `.env` y armado de configuracion.
- `backend/Clients/`: clientes HTTP para CORA y Open-Meteo.
- `backend/Repositories/`: acceso a PostgreSQL.
- `backend/Services/`: sincronizacion CORA y motor de simulacion.
- `backend/Services/SimuladorLaPerla.cs`: calculo especifico para La Perla.
- `backend/Models/`: DTOs, requests y opciones.
- `backend/Endpoints/`: rutas HTTP de la API.
- `frontend/js/api.js`: llamadas del navegador hacia el backend C#.
- `frontend/js/ui.js`: pinta datos y resultados en pantalla.
- `frontend/js/main.js`: coordina carga inicial, actualizacion y boton Calcular.

# Backend C# - Calculo de Caudales

Backend ASP.NET Core para guardar automaticamente los datos horarios de la API CORA en PostgreSQL y servir el frontend en el mismo puerto.

## Como ejecutar

```powershell
cd "C:\Users\coced\Desktop\Calculo-de-caudales\backend"
.\start-backend.cmd
```

Luego abre:

```text
http://localhost:4000
```

## Configuracion

El archivo `.env` contiene la configuracion local. No compartas ese archivo si tiene contrasenas reales.

Ejemplo:

```env
PORT=4000
DATABASE_URL=postgres://caudales_user:TU_PASSWORD@localhost:5432/calculo_caudales
CORA_API_URL=https://cora.cavcenergy.com/api/plants/embalselectura/embalseion/ultimos/f595b230-39b2-460e-96f2-f397e5f91f38
CORA_API_CANTIDAD=72
CORA_SYNC_MINUTES=10
CORA_SYNC_ON_START=true
```

`Program.cs` tambien acepta cadenas PostgreSQL estilo Npgsql:

```text
Host=localhost;Port=5432;Database=calculo_caudales;Username=caudales_user;Password=TU_PASSWORD
```

## Pruebas

```powershell
cd "C:\Users\coced\Desktop\Calculo-de-caudales\backend\CaudalesBackend.Tests"
dotnet test
```

Cubren la formula de escorrentia por Numero de Curva (SCS) y una corrida completa de 24 horas de cada simulador (Cafetal y La Perla) para detectar errores de integracion como cambios en `EscorrentiaOptions`.

## Endpoints

```text
GET   /api/salud
GET   /api/cora/datos?cantidad=72
GET   /api/cora/patron-entrada
GET   /api/cora/patron-entrada?fecha=2026-05-18
POST  /api/cora/sincronizar
POST  /api/simulacion
GET   /api/proyecciones
GET   /api/proyecciones/{id}
PATCH /api/proyecciones/{id}/potencias
GET   /api/proyecciones/{id}/comparacion
GET   /
```

`GET /api/proyecciones/{id}/comparacion` compara, hora por hora, el caudal y nivel proyectados contra los valores reales guardados en `datos_cora` para la fecha en que se creo la proyeccion (util para validar que tan preciso fue el patron QE usado).

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

La restriccion `UNIQUE (fecha, hora)` evita duplicados. Si CORA vuelve a entregar la misma hora, el backend actualiza el registro.

Antes de guardar, `DatoCoraValidador` descarta (deja en `NULL`) valores fuera de rangos razonables: nivel fuera del rango operativo de cada planta, caudales (`qe`/`qs`/`qv`) negativos o mayores a 50 m3/s, y potencia activa negativa o mayor a 20 MW. Esto evita que un glitch del sensor o de la API de CORA contamine una simulacion. Queda registrado como advertencia en los logs.

## Autenticacion de escritura

Si defines `API_KEY` en el entorno, estos endpoints exigen el header `X-Api-Key` con ese valor exacto; si no coincide (o falta), responden `401`:

```text
POST  /api/simulacion
PATCH /api/proyecciones/{id}/potencias
POST  /api/cora/sincronizar
```

Si `API_KEY` no esta definida, estos endpoints quedan abiertos (comportamiento anterior, para no romper despliegues existentes). El resto de endpoints (lectura) no requiere autenticacion.

## Logging

- `LOG_LEVEL` controla el nivel minimo (`Trace`, `Debug`, `Information`, `Warning`, `Error`, `Critical`). Por defecto `Information`.
- Cada solicitud HTTP se registra con metodo, ruta, codigo de estado y duracion (categoria `Solicitudes`).
- Cualquier excepcion no controlada en un endpoint se registra con su ruta (categoria `Errores`) y responde `500` con `{ "error": "..." }` en vez de dejar la conexion sin respuesta.

## Sincronizacion automatica

El backend consulta CORA al arrancar y luego cada `CORA_SYNC_MINUTES` minutos. Actualmente esta configurado cada 10 minutos para capturar nuevas lecturas aunque CORA publique tarde. `CORA_API_CANTIDAD=72` permite recuperar tambien lecturas del dia anterior cuando el backend se inicia a media tarde.

## Archivos principales

- `CaudalesBackend.csproj`: proyecto .NET.
- `Program.cs`: arranque de ASP.NET Core.
- `Configuration/`: variables de entorno y configuracion.
- `Clients/`: CORA y clima.
- `Repositories/`: PostgreSQL.
- `Services/`: sincronizacion automatica y simulacion.
- `Models/`: contratos de datos.
- `Endpoints/`: rutas HTTP.
- `sql/create_database.sql`: creacion inicial de base y usuario.
- `sql/init.sql`: tabla `datos_cora`.
- `start-backend.cmd`: arranque en Windows.
- `start-backend.ps1`: arranque en PowerShell.
- `CaudalesBackend.Tests/`: pruebas unitarias (xUnit).

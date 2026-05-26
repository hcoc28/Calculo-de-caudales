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

## Endpoints

```text
GET  /api/salud
GET  /api/cora/datos?cantidad=72
GET  /api/cora/patron-entrada
GET  /api/cora/patron-entrada?fecha=2026-05-18
POST /api/cora/sincronizar
GET  /
```

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

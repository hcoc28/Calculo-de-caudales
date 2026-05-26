# Documentacion completa del proyecto Calculo de Caudales

Este documento explica el proyecto completo: que hace, que no hace, como se organiza, como corre, como usa PostgreSQL y como fluye la informacion desde CORA hasta la simulacion.

## 1. Objetivo general

El proyecto es una aplicacion web para apoyar el calculo y simulacion de caudales del embalse El Cafetal.

La aplicacion permite:

- Mostrar clima actual y pronostico horario usando Open-Meteo.
- Mostrar datos reales del embalse obtenidos originalmente desde CORA.
- Guardar datos CORA en PostgreSQL.
- Usar el patron horario de QE del dia anterior para proyectar el caudal de entrada del dia siguiente.
- Simular 24 horas de operacion del embalse.
- Recomendar potencia por hora segun reglas de nivel, caudal, horas obligatorias y viabilidad.
- Recalcular la tabla si el usuario edita potencia o caudal de ingreso manualmente.

## 2. Que no hace actualmente

El proyecto no hace lo siguiente:

- No tiene autenticacion de usuarios.
- No tiene roles ni permisos por usuario dentro de la aplicacion web.
- No guarda las simulaciones generadas por el usuario.
- No guarda historiales de cambios manuales hechos en la tabla.
- No genera PDF, Excel ni reportes automaticos.
- No predice lluvia por modelo propio; solo consume Open-Meteo.
- No consulta CORA directamente desde el frontend. CORA debe pasar por el backend y PostgreSQL.
- No inventa un patron de caudal si faltan horas en la base de datos.
- No ejecuta el backend si no se abre `dotnet run` o `start-backend.cmd`.

## 3. Estructura del proyecto

```text
Calculo-de-caudales/
├── backend/
│   ├── Program.cs
│   ├── CaudalesBackend.csproj
│   ├── sql/
│   │   ├── create_database.sql
│   │   └── init.sql
│   ├── .env
│   ├── .env.example
│   ├── start-backend.cmd
│   └── start-backend.ps1
├── frontend/
│   ├── index.html
│   ├── css/
│   │   └── styles.css
│   └── js/
│       ├── config.js
│       ├── api.js
│       ├── ui.js
│       └── main.js
├── README.md
├── ARCHITECTURE.md
└── DOCUMENTACION_COMPLETA.md
```

## 4. Flujo general

El flujo actual es:

```text
API CORA
  -> backend C# ASP.NET Core
  -> PostgreSQL
  -> backend C# ASP.NET Core
  -> frontend
  -> simulacion de 24 horas
```

El frontend se abre en:

```text
http://localhost:4000
```

Ese mismo puerto sirve:

- La pagina web.
- Los endpoints `/api/...`.

Ya no se necesita abrir un servidor adicional en el puerto 3000.

## 5. Backend

El backend esta hecho con C# y ASP.NET Core.

### 5.1 `backend/CaudalesBackend.csproj`

Define el proyecto .NET y sus dependencias.

Dependencias principales:

- `Microsoft.NET.Sdk.Web`: servidor ASP.NET Core.
- `Npgsql`: conexion de C# con PostgreSQL.

El proyecto se ejecuta con:

```powershell
dotnet run --project CaudalesBackend.csproj
```

Tambien puedes usar:

```powershell
.\start-backend.cmd
```

### 5.2 `backend/.env`

Contiene configuracion sensible/local:

```env
PORT=4000
DATABASE_URL=postgres://caudales_user:TU_PASSWORD@localhost:5432/calculo_caudales
CORA_API_URL=...
CORA_API_CANTIDAD=72
CORA_SYNC_MINUTES=10
CORA_SYNC_ON_START=true
```

Que significa:

- `PORT=4000`: el servidor corre en el puerto 4000.
- `DATABASE_URL`: cadena de conexion a PostgreSQL.
- `CORA_API_URL`: URL original de CORA.
- `CORA_API_CANTIDAD=72`: pide 72 lecturas para recuperar el dia anterior aunque el backend arranque tarde.
- `CORA_SYNC_MINUTES=10`: sincroniza cada 10 minutos.
- `CORA_SYNC_ON_START=true`: sincroniza tambien al arrancar el backend.

### 5.3 `backend/Program.cs`

Es el archivo principal del backend.

Hace esto:

- Carga variables de `.env`.
- Crea la aplicacion ASP.NET Core.
- Define endpoints de API.
- Sirve la carpeta `frontend`.
- Inicia el sincronizador automatico de CORA.
- Escucha en `http://localhost:4000`.

Endpoints:

```text
GET  /api/salud
GET  /api/cora/datos?cantidad=72
GET  /api/cora/patron-entrada
POST /api/cora/sincronizar
GET  /
```

Detalle:

- `/api/salud`: verifica que el backend y la base respondan.
- `/api/cora/datos`: devuelve datos CORA guardados en PostgreSQL.
- `/api/cora/patron-entrada`: devuelve el QE por hora del dia anterior.
- `/api/cora/sincronizar`: fuerza una sincronizacion manual con CORA.
- `/`: entrega `frontend/index.html`.

### 5.4 Conexion PostgreSQL

`Program.cs` registra un `NpgsqlDataSource`, que reutiliza conexiones PostgreSQL.

El endpoint `/api/salud` ejecuta:

```sql
SELECT NOW() AS ahora
```

Sirve para saber si PostgreSQL esta disponible.

### 5.5 Cliente CORA en C#

La clase `CoraClient`, dentro de `Program.cs`, se encarga de hablar con la API CORA.

Hace esto:

- Lee `CORA_API_URL`.
- Agrega el parametro `cantidad`.
- Usa `HttpClient` para consultar CORA.
- Recibe JSON.
- Convierte la respuesta a una lista.
- Normaliza cada registro.

Normalizar significa convertir diferentes nombres posibles a un formato unico.

Campos normalizados:

```text
fecha
hora
nivel
qe
qs
qv
potenciaActiva
clima
datosOriginales
```

Ejemplo:

Si CORA trae `fechaLectura`, el sistema lo convierte en:

```text
fecha
hora
```

Si CORA trae `potenciaActiva` o `potencia_activa`, el sistema lo guarda como:

```text
potencia_activa
```

### 5.6 Repositorio PostgreSQL en C#

La clase `CoraRepository`, dentro de `Program.cs`, es la capa que habla con PostgreSQL.

Funciones:

- `guardarDatoCora(dato)`: inserta o actualiza un dato.
- `guardarDatosCora(datos)`: guarda muchos datos.
- `listarDatosCora(limite)`: lee los ultimos datos.
- `obtenerPatronEntradaPorFecha(fecha)`: arma el patron de QE para una fecha.

El insert usa:

```sql
ON CONFLICT (fecha, hora)
DO UPDATE
```

Eso evita duplicados. Si ya existe un registro con la misma fecha y hora, se actualiza.

### 5.7 Servicio automatico en C#

La clase `CoraSyncService`, dentro de `Program.cs`, programa la sincronizacion automatica.

Cada 10 minutos:

```text
consulta CORA -> normaliza -> guarda en PostgreSQL
```

Tambien sincroniza al iniciar si:

```env
CORA_SYNC_ON_START=true
```

## 6. Base de datos PostgreSQL

La base se llama:

```text
calculo_caudales
```

El usuario usado por la app es:

```text
caudales_user
```

La tabla principal es:

```text
datos_cora
```

### 6.1 Tabla `datos_cora`

Campos:

```text
id
fecha
hora
nivel
qe
qs
qv
potencia_activa
clima
datos_originales
creado_en
actualizado_en
```

Significado:

- `id`: identificador interno.
- `fecha`: fecha de lectura.
- `hora`: hora de lectura.
- `nivel`: nivel del embalse.
- `qe`: caudal de entrada.
- `qs`: caudal de salida.
- `qv`: caudal vertido.
- `potencia_activa`: potencia activa registrada.
- `clima`: texto de clima si CORA lo trae.
- `datos_originales`: JSON completo recibido desde CORA.
- `creado_en`: momento en que se creo el registro en la base.
- `actualizado_en`: momento en que se actualizo el registro por ultima vez.

Restriccion importante:

```sql
UNIQUE (fecha, hora)
```

Eso significa que solo puede existir un registro por cada hora de cada dia.

### 6.2 Patron de entrada

El patron de entrada ya no esta escrito fijo en el frontend.

Ahora sale de:

```sql
SELECT hora, qe
FROM datos_cora
WHERE fecha = dia_anterior
ORDER BY hora ASC;
```

El backend devuelve un arreglo de 24 posiciones:

```text
posicion 0  -> QE de 00:00
posicion 1  -> QE de 01:00
...
posicion 23 -> QE de 23:00
```

Si falta alguna hora, devuelve:

```json
"completo": false
```

Y el frontend no ejecuta la simulacion.

## 7. Frontend

El frontend es HTML, CSS y JavaScript modular.

No usa React, Vue ni Angular.

### 7.1 `frontend/index.html`

Define la estructura visual:

- Panel izquierdo:
  - clima principal,
  - formulario,
  - datos reales del embalse,
  - pronostico,
  - detalles de clima.
- Panel derecho:
  - tabla de resultados por hora.

IDs importantes:

- `nivelInicial`: entrada del nivel inicial.
- El frontend envia solo el nivel inicial; el patron de entrada sale de `QE` en PostgreSQL.
- `botonCalcular`: boton para simular.
- `tablaEmbalseReal`: tabla de datos reales.
- `tablaResultados`: tabla de simulacion.

### 7.2 `frontend/css/styles.css`

Controla el diseno visual:

- colores,
- paneles,
- tarjetas,
- tablas,
- responsividad,
- estados visuales.

No contiene logica de calculo.

### 7.3 `frontend/js/config.js`

Centraliza constantes.

Contiene:

- ubicacion geografica de El Cafetal,
- tabla volumen/nivel,
- niveles de operacion,
- horas obligatorias,
- potencia de unidades,
- parametros de simulacion,
- ajustes horarios,
- endpoints,
- codigos e iconos de clima.

Punto importante:

El patron fijo de entrada fue eliminado. Ahora el patron viene desde PostgreSQL.

### 7.4 `frontend/js/api.js`

Maneja llamadas HTTP desde el navegador.

Funciones principales:

- `obtenerDatosClima()`: consulta Open-Meteo.
- `obtenerDatosEmbalse()`: consulta `/api/cora/datos`.
- `obtenerPatronEntradaEmbalse()`: consulta `/api/cora/patron-entrada`.
- `extraerDatosLluvia()`: obtiene lluvia horaria.
- `extraerClimaActual()`: obtiene clima actual.
- `extraerClimaDiario()`: obtiene minimos, maximos, amanecer y atardecer.
- `extraerClimaHorario()`: prepara pronostico horario.

Importante:

`obtenerDatosEmbalse()` ya no consulta CORA directo. Consulta el backend local.

### 7.5 Calculos en C#

La logica matematica ya no vive en JavaScript. Fue migrada a:

```text
backend/Services/SimuladorCaudales.cs
```

Incluye:

- conversion nivel -> volumen,
- conversion volumen -> nivel,
- caudal de salida,
- volumen turbinado,
- patron de entrada desde QE de PostgreSQL,
- aporte directo de lluvia por escorrentia,
- viabilidad del bloque obligatorio,
- seleccion de potencia,
- simulacion completa de 24 horas.

La lluvia ya no pasa por un factor multiplicador. Se suma como caudal:

```text
Q_lluvia = C * lluvia_mm * area_m2 / 1000 / 3600
```

Donde:

- `C` es el coeficiente de escorrentia.
- `1 mm = 1 litro/m2`.
- `area_m2` se toma de `ESCORRENTIA_AREA_M2` si esta configurada; si no, se estima desde la tabla volumen/nivel.

### 7.6 `frontend/js/ui.js`

Maneja el DOM, es decir, lo que se ve en pantalla.

Funciones:

- Lee inputs del formulario.
- Valida el nivel inicial.
- Convierte codigos de clima a texto e iconos.
- Actualiza tarjeta principal del clima.
- Llena pronostico de 24 horas.
- Llena tabla de datos reales del embalse.
- Llena tabla de resultados.
- Permite editar celdas de potencia y caudal ingreso.
- Recalcula desde una fila editada.
- Cambia textos de estado y carga.

No consulta APIs directamente. Solo recibe datos ya preparados.

### 7.7 `frontend/js/main.js`

Es el coordinador principal.

Cuando carga la pagina:

1. Registra el click del boton calcular.
2. Llama `actualizarTodo()`.
3. Programa actualizacion automatica cada 10 minutos.

`actualizarTodo()` hace:

1. Actualiza panel del embalse desde PostgreSQL.
2. Obtiene el patron QE del dia anterior.
3. Obtiene clima desde Open-Meteo.
4. Procesa clima.
5. Si hay nivel inicial valido y patron completo, simula 24 horas.
6. Llena tabla de resultados.

Si el patron esta incompleto:

```text
Patron QE incompleto
```

## 8. Como se ejecuta

Desde la carpeta:

```text
C:\Users\coced\Desktop\Calculo-de-caudales\backend
```

Ejecutar:

```powershell
.\start-backend.cmd
```

Luego abrir:

```text
http://localhost:4000
```

No se necesita puerto 3000.

## 9. Como verificar que funciona

Backend:

```text
http://localhost:4000/api/salud
```

Debe responder `ok: true`.

Datos CORA:

```text
http://localhost:4000/api/cora/datos?cantidad=72
```

Patron QE:

```text
http://localhost:4000/api/cora/patron-entrada
```

Pagina:

```text
http://localhost:4000
```

## 10. Organizacion del proyecto

La organizacion actual es buena para el tamano del proyecto:

- `backend` separado de `frontend`.
- SQL separado en `backend/sql`.
- Backend C# centralizado en `Program.cs`.
- SQL separado en `backend/sql`.
- Configuracion local separada en `.env`.
- Configuracion del frontend en `config.js`.
- APIs del navegador en `api.js`.
- Calculos matematicos en `backend/Services/SimuladorCaudales.cs` y `backend/Services/SimuladorLaPerla.cs`.
- Interfaz visual en `ui.js`.
- Coordinacion en `main.js`.

## 11. Cosas mejorables a futuro

Recomendaciones:

- Mover la logica de simulacion al backend si se desea guardar simulaciones.
- Crear tabla `simulaciones` si se quieren historiales.
- Crear tabla `resultados_simulacion` si se quiere guardar cada hora simulada.
- Agregar validacion de datos CORA antes de guardar.
- Agregar logs mas claros en archivo.
- Agregar pruebas automatizadas.
- Agregar autenticacion si varias personas usaran el sistema.
- Crear instalador o script unico que levante todo.
- Ocultar credenciales reales y usar `.env.example` para compartir el proyecto.

## 12. Resumen corto

Este proyecto ya funciona como una aplicacion web con backend y base de datos:

```text
ASP.NET Core consulta CORA y guarda en PostgreSQL.
PostgreSQL alimenta el frontend.
QE del dia anterior alimenta la simulacion.
Open-Meteo aporta clima y lluvia.
Los simuladores de `backend/Services/` calculan las 24 horas.
ui.js muestra todo en pantalla.
```

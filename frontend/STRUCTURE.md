# Documentacion de archivos frontend

El frontend queda solamente para interfaz de usuario. Los calculos de caudal y la simulacion completa fueron migrados a C# en `backend/Services/SimuladorCaudales.cs` y `backend/Services/SimuladorLaPerla.cs`.

## Estructura

```text
frontend/
├── index.html
├── css/
│   └── styles.css
└── js/
    ├── main.js
    ├── config.js
    ├── api.js
    └── ui.js
```

## Responsabilidades

### `index.html`

Define la estructura visual: panel de clima, formulario, datos reales de embalse y tabla de resultados.
Incluye un menu lateral para navegar entre El Cafetal y La Perla.

### `css/styles.css`

Define colores, espaciado, tarjetas, tablas y comportamiento responsive.

### `js/config.js`

Guarda configuracion usada por la interfaz:

- endpoints del backend C#,
- codigos de clima,
- iconos de clima,
- horas de simulacion para vistas.
- plantas disponibles para el menu lateral.

Los parametros matematicos principales viven ahora en C#.

### `js/api.js`

Hace llamadas HTTP al backend:

- `obtenerDatosClima()` llama `/api/clima`.
- `obtenerDatosEmbalse()` llama `/api/cora/datos`.
- `obtenerPatronEntradaEmbalse()` llama `/api/cora/patron-entrada`.
- `obtenerSimulacion()` llama `/api/simulacion`.

### `js/ui.js`

Actualiza el DOM:

- pinta clima,
- pinta datos reales,
- pinta resultados,
- valida nivel inicial,
- cambia estados de carga.

No calcula la simulacion.

### `js/main.js`

Coordina la pantalla:

1. Carga datos reales de embalse.
2. Carga clima desde el backend C#.
3. Pide simulacion a `/api/simulacion`.
4. Llena la tabla con los resultados.
5. Repite la actualizacion cada 10 minutos.

## Flujo actual

```text
frontend/js/main.js
  -> frontend/js/api.js
  -> backend C#
  -> PostgreSQL / CORA / Open-Meteo
  -> backend C#
  -> frontend/js/ui.js
```

## Nota

El archivo `calculator.js` fue retirado para evitar tener dos motores de calculo. La fuente de verdad de los calculos es:

```text
backend/Services/SimuladorCaudales.cs
backend/Services/SimuladorLaPerla.cs
```

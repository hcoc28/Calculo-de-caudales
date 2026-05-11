# 📋 Documentación de Archivos Frontend

## Estructura Actual

```
frontend/
├── index.html              (HTML principal)
├── css/
│   └── styles.css         (Estilos CSS)
└── js/
    ├── main.js            (Punto de entrada - coordinador)
    ├── config.js          (Constantes y configuración)
    ├── api.js             (Llamadas a API de clima)
    ├── calculator.js      (Lógica de cálculos)
    └── ui.js              (Gestión de interfaz)
```

## Descripción de Archivos

### `index.html`
- Estructura HTML semántica
- Comentarios claros de secciones
- Atributos `aria-label` para accesibilidad
- Scripts modulares ES6

### `css/styles.css`
- Estilos del tema oscuro
- Variables CSS para colores
- Diseño responsive
- Media queries para móviles

### `js/config.js`
- **UBICACIÓN**: Coordenadas geográficas
- **VOLUME_TABLE**: Tabla de conversión nivel-volumen
- **OPERATION_LEVELS**: Niveles de operación del embalse
- **MANDATORY_HOURS**: Horas de operación obligatoria
- **POWER**: Datos de potencia de generadores
- **SIMULATION_PARAMS**: Parámetros de simulación
- **INFLOW_PATTERN**: Patrón de entrada de agua
- **API**: Configuración de endpoints
- **WEATHER_CODES**: Códigos de clima
- **WEATHER_ICONS**: Iconos de clima

### `js/api.js`
- `fetchClimateData()` - Obtiene clima de Open-Meteo
- `extractRainfallData()` - Extrae datos de lluvia
- `extractCurrentWeather()` - Datos climáticos actuales
- `extractDailyWeather()` - Datos diarios
- `extractHourlyWeather()` - Datos horarios

### `js/calculator.js`
- `round2()` - Redondea a 2 decimales
- `levelToVolume()` - Convierte nivel a volumen
- `volumeToLevel()` - Convierte volumen a nivel
- `calculateOutflowRate()` - Calcula caudal de salida
- `calculateTurbinedVolume()` - Volumen turbinado
- `calculateClimateFactorByRain()` - Factor de lluvia
- `generateInflowPattern()` - Genera patrón de caudales
- `evaluateScenario()` - Evalúa un escenario
- `calculateProjectedAverageInflow()` - Promedio proyectado
- `isViableForMandatoryBlock()` - Verifica viabilidad
- `simulateDay()` - Simulación completa de 24h

### `js/ui.js`
- `getFormInputs()` - Obtiene valores del formulario
- `validateInputs()` - Valida inputs
- `getWeatherDescription()` - Descripción de clima
- `getWeatherIcon()` - Icono de clima
- `getWindDirection()` - Dirección del viento
- `updateHeroCard()` - Actualiza tarjeta principal
- `updateHourlyForecast()` - Actualiza pronóstico
- `updateWeatherDetails()` - Actualiza detalles
- `setClimateStatus()` - Actualiza estado del clima
- `setLastUpdate()` - Actualiza timestamp
- `fillResultsTable()` - Rellena tabla de resultados
- `recalculateFromRow()` - Recalcula desde una fila
- `setButtonLoading()` - Estado del botón

### `js/main.js`
- Punto de entrada principal
- `updateEverything()` - Actualización automática
- `renderFromClimateData()` - Renderiza con datos climáticos
- `handleManualCalculation()` - Manejo de cálculo manual
- Inicialización del aplicativo

## Flujo de Datos

```
┌─────────────────────────────────────┐
│   Interfaz (HTML + CSS)             │
└──────────────┬──────────────────────┘
               │
        ┌──────▼──────┐
        │   main.js   │ (Coordinador)
        └──┬────────┬─┘
           │        │
    ┌──────▼──┐   ┌─▼────────┐
    │ api.js  │   │ calc..js │
    │         │   │ ui.js    │
    │Climate  │   │ config   │
    │Data     │   │          │
    └─────────┘   └──────────┘
```

## Módulos Importados

```javascript
// main.js importa de:
- api.js (fetchClimateData, extract*)
- calculator.js (simulateDay, round2)
- ui.js (getFormInputs, validateInputs, update*, set*, fill*)
- config.js (MANDATORY_HOURS)

// api.js importa de:
- config.js (LOCATION, API, MANDATORY_HOURS)

// calculator.js importa de:
- config.js (VOLUME_TABLE, OPERATION_LEVELS, etc.)

// ui.js importa de:
- config.js (LOCATION, WEATHER_CODES, WEATHER_ICONS, MANDATORY_HOURS)
- calculator.js (round2)
```

## Migración Futura a Backend

Para mover la API a un backend separado:

1. **Crear servidor (Node.js/Python)**
   ```
   backend/
   ├── server.js (o main.py)
   ├── routes/
   │   └── climate.js
   └── controllers/
       └── climateController.js
   ```

2. **Endpoint propuesto**
   ```
   GET /api/climate?lat=15.14&lon=-90.07
   ```

3. **Actualizar frontend**
   ```javascript
   // En api.js cambiar:
   const BASE_URL = 'http://localhost:3000/api';
   export async function fetchClimateData() {
     const response = await fetch(`${BASE_URL}/climate`);
     return await response.json();
   }
   ```

## Ventajas de la Estructura Actual

✅ Modular y mantenible
✅ Separación de responsabilidades
✅ Fácil de testear
✅ Sin dependencias externas
✅ Funciona totalmente en el cliente
✅ Rápido y eficiente

## Próximos Pasos

- [ ] Agregar soporte para TypeScript
- [ ] Implementar sistema de logging
- [ ] Crear tests unitarios
- [ ] Agregar compresión de assets
- [ ] Implementar PWA (Progressive Web App)
- [ ] Migrar API a backend Node.js

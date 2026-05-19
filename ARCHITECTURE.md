# 🗺️ Mapa de Navegación del Proyecto

## 📂 Estructura Completa

```
Calculo-de-caudales/
│
├── 📄 README.md .......................... Descripción general del proyecto
├── 📄 .gitignore ......................... Archivos ignorados por git
│
├── 📁 frontend/ .......................... APLICACIÓN WEB (Cliente)
│   │
│   ├── 📄 index.html ..................... HTML principal (punto de entrada)
│   ├── 📄 STRUCTURE.md ................... Documentación de módulos JS
│   │
│   ├── 📁 css/
│   │   └── 📄 styles.css ................ Estilos CSS responsivos
│   │
│   └── 📁 js/ ........................... Módulos JavaScript ES6
│       │
│       ├── 📄 main.js ................... Coordinador principal
│       │                            ↓ Inicializa la aplicación
│       │                            ↓ Maneja eventos principales
│       │
│       ├── 📄 config.js ................. Constantes centralizadas
│       │                            ├─ Ubicación geográfica
│       │                            ├─ Tabla de volumen
│       │                            ├─ Niveles de operación
│       │                            ├─ Potencia de generadores
│       │                            └─ Parámetros de simulación
│       │
│       ├── 📄 api.js .................... Gestión de API externa
│       │                            ├─ fetchClimateData() [Open-Meteo]
│       │                            ├─ extractRainfallData()
│       │                            ├─ extractCurrentWeather()
│       │                            ├─ extractDailyWeather()
│       │                            └─ extractHourlyWeather()
│       │
│       ├── 📄 calculator.js ............ Motor de cálculos
│       │                            ├─ Conversiones (nivel ↔ volumen)
│       │                            ├─ Cálculo de caudales
│       │                            ├─ Generación de patrones
│       │                            ├─ Evaluación de escenarios
│       │                            ├─ Simulación de 24 horas
│       │                            └─ Validación de viabilidad
│       │
│       └── 📄 ui.js ..................... Interfaz de usuario
│                                ├─ getFormInputs()
│                                ├─ validateInputs()
│                                ├─ updateHeroCard()
│                                ├─ updateHourlyForecast()
│                                ├─ updateWeatherDetails()
│                                ├─ fillResultsTable()
│                                ├─ recalculateFromRow()
│                                └─ setButtonLoading()
│
└── 📁 backend/ ........................... Documentación sin implementación activa
    │
    ├── 📄 README.md
    └── 📄 IMPLEMENTATION.md
```

## 🔄 Flujo de Datos

```
┌──────────────────────────────────────────────────────────────┐
│                      FRONTEND (index.html)                   │
│         (Interfaz de Usuario - HTML + CSS + JS)            │
└──────────────┬───────────────────────────────────────────────┘
               │
        ┌──────▼───────────────────┐
        │    main.js (Coordinador) │
        │  - Inicialización        │
        │  - Actualización c/10min │
        │  - Manejo de eventos     │
        └──┬──────────┬──────────┬─┘
           │          │          │
    ┌──────▼───┐   ┌──▼──────┐ ┌▼────────┐
    │  api.js   │   │calc..   │ │  ui.js   │
    │           │   │js       │ │          │
    │ Open-     │   │ Motor   │ │ Interfaz │
    │ Meteo     │   │ Matemá- │ │ del DOM  │
    │ Climate   │   │tico     │ │          │
    └─────────────  └─────────┘ └──────────┘
         ▲              ▲           ▲
         └──────────────┴───────────┴─────────────┬
                                                   │
                                            Importan config.js
                                            (Constantes)

    ┌─────────────────────────────────────────────┐
    │   BACKEND (Futuro - Node.js / Python)       │
    │   API REST para persistencia de datos       │
    │   - Guardar simulaciones                    │
    │   - Sin backend activo                      │
    │   - Reportes                                │
    └─────────────────────────────────────────────┘
```

## 📊 Flujo de Ejecución

### 1️⃣ Carga Inicial
```
DOMContentLoaded
    ↓
main.js inicia
    ↓
fetchClimateData() [api.js]
    ↓
Procesa datos con calculator.js
    ↓
Actualiza UI con ui.js
    ↓
Inicia actualización automática cada 10min
```

### 2️⃣ Entrada del Usuario
```
Usuario hace clic en "Calcular"
    ↓
handleManualCalculation() [main.js]
    ↓
validateInputs() [ui.js]
    ↓
fetchClimateData() [api.js]
    ↓
simulateDay() [calculator.js]
    ↓
fillResultsTable() [ui.js]
```

### 3️⃣ Edición en Tabla
```
Usuario doble-clic en celda editable
    ↓
enableTableEditing() [ui.js]
    ↓
Usuario ingresa nuevo valor
    ↓
evaluateScenario() [calculator.js]
    ↓
recalculateFromRow() [ui.js]
    ↓
Tabla se actualiza automáticamente
```

## 🗂️ Importancias por Archivo

### config.js ⭐⭐⭐⭐⭐
- **Criticidad**: Máxima
- **Cambios**: Editar aquí las constantes del proyecto
- **Importado por**: Todos los demás módulos

### api.js ⭐⭐⭐⭐
- **Criticidad**: Alta (solo si usas Open-Meteo)
- **Cambios**: Para cambiar API o agregar fuentes
- **Dependencias**: Requiere internet

### calculator.js ⭐⭐⭐⭐⭐
- **Criticidad**: Máxima
- **Cambios**: Para ajustar lógica de simulación
- **Rendimiento**: Todo lo matemático aquí

### ui.js ⭐⭐⭐
- **Criticidad**: Alta
- **Cambios**: Para modificar interfaz
- **DOM**: Gestiona interactividad

### main.js ⭐⭐⭐⭐
- **Criticidad**: Alta
- **Cambios**: Para agregar nuevos flujos
- **Orquestación**: Coordina todo

## 🎯 Dónde Editar Según Necesidad

| Necesidad | Archivo | Líneas aprox |
|-----------|---------|-------------|
| Cambiar ubicación | config.js | 8-13 |
| Cambiar niveles | config.js | 30-35 |
| Cambiar potencia | config.js | 40-45 |
| Editar tabla volumen | config.js | 18-28 |
| Cambiar API | api.js | Toda |
| Cambiar lógica matemática | calculator.js | 50+ |
| Cambiar UI/Estilos | ui.js + styles.css | Varias |
| Agregar funcionalidad | main.js | 30+ |

## 📈 Estadísticas del Código

| Métrica | Valor |
|---------|-------|
| Total de funciones | 50+ |
| Líneas de código | 2000+ |
| Módulos | 5 |
| Constantes | 100+ |
| Líneas CSS | 300+ |

## 🔗 Relaciones entre Módulos

```
config.js
    ↓
Importado por: api.js, calculator.js, ui.js, main.js

api.js
    ↓ Importa: config.js
    ↓ Importado por: main.js

calculator.js
    ↓ Importa: config.js
    ↓ Importado por: main.js

ui.js
    ↓ Importa: config.js, calculator.js
    ↓ Importado por: main.js

main.js
    ↓ Importa: TODOS LOS ANTERIORES
    ↓ Punto de entrada: index.html
```

## 💾 Persistencia de Datos

### Actual (Frontend)
- ✅ Datos en memoria (RAM del navegador)
- ✅ Se pierden al recargar
- ✅ Rápido y sin servidor

### Futuro (Con Backend)
- 📝 Guardar en base de datos
- 📝 Histórico de simulaciones
- 📝 Compartir resultados
- 📝 Integración directa con APIs externas desde el frontend

## 📚 Cómo Aprender el Código

### Día 1: Entender la estructura
1. Lee este archivo
2. Abre index.html en navegador
3. Lee config.js (solo constantes)

### Día 2: Entender el flujo
1. Lee main.js (estructura, no detalles)
2. Lee ui.js (para entender UI)
3. Prueba editar config.js valores

### Día 3: Entender la matemática
1. Lee calculator.js
2. Entiende levelToVolume y volumeToLevel
3. Entiende simulateDay()

### Día 4: Entender la API
1. Lee api.js
2. Entiende fetchClimateData()
3. Revisa Open-Meteo docs

### Día 5: Proyecto completo
1. Modifica algo pequeño
2. Ve el resultado
3. Experimenta

---

**Nota**: Este mapa se actualiza conforme cambia el código.
**Última actualización**: 11 de Mayo, 2026

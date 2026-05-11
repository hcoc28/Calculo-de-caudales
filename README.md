# Cálculo de Caudales 🌊

Sistema profesional de simulación y cálculo de caudales de embalse con integración de datos climáticos en tiempo real, con arquitectura modular y lista para escalabilidad.

## 📁 Estructura del Proyecto

```
Calculo-de-caudales/
├── frontend/                           # Aplicación Web (Cliente)
│   ├── index.html                     # HTML principal
│   ├── STRUCTURE.md                   # Documentación de estructura
│   ├── css/
│   │   └── styles.css                 # Estilos CSS (responsive)
│   └── js/
│       ├── main.js                    # Coordinador principal
│       ├── config.js                  # Constantes y configuración
│       ├── api.js                     # Llamadas a API de clima
│       ├── calculator.js              # Lógica de cálculos
│       └── ui.js                      # Gestión de interfaz
│
├── backend/                            # API y Servicios (Servidor)
│   ├── README.md                      # Guía de setup
│   └── IMPLEMENTATION.md              # Documentación técnica
│
├── .gitignore                         # Archivos ignorados
└── README.md                          # Este archivo
```

## 🎯 Características Principales

- **Arquitectura Modular**: Separación clara de responsabilidades
  - `config.js`: Todas las constantes centralizadas
  - `api.js`: Gestión de datos externos (Open-Meteo)
  - `calculator.js`: Lógica de simulación y cálculos
  - `ui.js`: Interfaz y actualización del DOM
  - `main.js`: Coordinación principal

- **Simulación de 24 Horas**: Cálculo detallado por hora
- **Datos Climáticos en Tiempo Real**: Integración con API Open-Meteo
- **Pronóstico Horario**: Visualización de clima para las próximas 24h
- **Tabla Interactiva**: Edición de valores con recálculo automático
- **Lógica Inteligente de Operación**:
  - Operación obligatoria en horas específicas (18-21)
  - Control automático de una/dos unidades
  - Evaluación de viabilidad de reserva
  - Protección de niveles mínimos
- **Diseño Responsivo**: Funciona en desktop y móviles
- **Sin Dependencias Externas**: Funciona 100% en el cliente

## 💻 Módulos Frontend

### `config.js` - Configuración Centralizada
Contiene todas las constantes del sistema:
- **Ubicación**: Coordenadas de El Cafetal
- **Tabla de Volumen**: Conversión nivel ↔ volumen
- **Niveles de Operación**: Mínimo, inicio, rebalse, máximo
- **Potencia**: 4.2 MW (1 unidad) y 8.2 MW (2 unidades)
- **Horas Obligatorias**: 18:00 a 21:00
- **Parámetros de Clima**: Factores de precipitación
- **API**: Endpoints y configuración
- **Iconos y Códigos de Clima**: Mapeos completos

### `api.js` - Gestión de API Externa
Maneja todas las llamadas a Open-Meteo:
- `fetchClimateData()`: Obtiene clima actual y pronóstico
- `extractRainfallData()`: Extrae datos de precipitación
- `extractCurrentWeather()`: Datos climáticos actuales
- `extractDailyWeather()`: Datos máx/mín y horas de salida/puesta
- `extractHourlyWeather()`: Datos horarios de los próximos días

### `calculator.js` - Motor de Cálculos
Toda la lógica matemática del simulador:
- **Conversiones**: `levelToVolume()`, `volumeToLevel()`
- **Caudales**: `calculateOutflowRate()`, `calculateTurbinedVolume()`
- **Clima**: `calculateClimateFactorByRain()`, `generateInflowPattern()`
- **Simulación**: `evaluateScenario()`, `simulateDay()`
- **Viabilidad**: `isViableForMandatoryBlock()`, `calculateProjectedAverageInflow()`
- **Utilidades**: `round2()`, `limitVolume()`

### `ui.js` - Interfaz de Usuario
Gestión completa del DOM:
- **Entrada**: `getFormInputs()`, `validateInputs()`
- **Clima**: `updateHeroCard()`, `updateHourlyForecast()`, `updateWeatherDetails()`
- **Tabla**: `fillResultsTable()`, `recalculateFromRow()`
- **Conversiones UI**: `getWeatherDescription()`, `getWeatherIcon()`, `getWindDirection()`
- **Estados**: `setClimateStatus()`, `setLastUpdate()`, `setButtonLoading()`

### `main.js` - Orquestador Principal
Coordina todo el flujo:
- Carga automática cada 10 minutos
- Manejo de cálculo manual del usuario
- Procesamiento de datos climáticos
- Actualización de toda la interfaz
- Manejo de errores y fallback

## 🔧 Instalación

1. Clona o descarga el proyecto
2. Abre `frontend/index.html` en tu navegador
3. ¡Listo! La aplicación está lista para usar

## 📊 Variables Principales

### Configuración
- **Nivel mínimo**: 773.50 msnm
- **Nivel de inicio**: 777.50 msnm
- **Nivel de rebalse**: 777.75 msnm
- **Nivel de embalse**: 778.00 msnm

### Potencia
- **Una unidad**: 4.2 MW
- **Dos unidades**: 8.2 MW

### Horas obligatorias de producción
- 18:00 a 21:00

## 📈 Cómo Usar

1. Ingresa el **Nivel inicial** (entre 770-778 msnm)
2. Ingresa el **Caudal base de entrada** (m³/s)
3. Haz clic en **Calcular**
4. Visualiza los resultados en la tabla
5. Puedes editar valores haciendo doble clic en las celdas editables

## 🌐 API Utilizada

- **Open-Meteo**: Datos climáticos gratuitos
  - Ubicación: El Cafetal (15.14375°N, 90.07007°O)
  - Datos: Temperatura, humedad, presión, viento, precipitación

## 📝 Notas

- Los datos se actualizan automáticamente cada 10 minutos
- La aplicación funciona sin backend - es completamente frontend
- Los cálculos se realizan en el navegador del cliente

## 🎨 Diseño

- **Tema**: Dark mode con gradientes azules
- **Colores principales**: 
  - Fondo: Azul oscuro (#081225)
  - Acentos: Azul claro (#6aa7ff)
  - Éxito: Verde (#63e6a8)
  - Error: Rojo (#ff7d7d)

## 📦 Estructura de Archivos Detallada

### `frontend/`
- **index.html**: Estructura HTML semántica mejorada
- **css/styles.css**: Estilos responsivos, tema oscuro
- **js/config.js**: Constantes centralizadas
- **js/api.js**: Gestión de API Open-Meteo
- **js/calculator.js**: Lógica de simulación completa
- **js/ui.js**: Funciones de interfaz de usuario
- **js/main.js**: Punto de entrada y coordinación
- **STRUCTURE.md**: Documentación técnica de módulos

### `backend/`
- **IMPLEMENTATION.md**: Guía completa de implementación
- **README.md**: Instrucciones de setup

## 🔄 Próximas Mejoras (Roadmap)

### Fase 1: Backend (Prioridad Alta)
- [ ] Crear API REST con Node.js/Express
- [ ] Persistencia de datos en base de datos
- [ ] Autenticación JWT
- [ ] Rate limiting

### Fase 2: Características
- [ ] Gráficos de tendencias (Chart.js)
- [ ] Exportación de reportes PDF
- [ ] Sistema de alertas
- [ ] Historial de simulaciones

### Fase 3: Optimización
- [ ] PWA (Progressive Web App)
- [ ] TypeScript
- [ ] Sistema de testing
- [ ] CI/CD pipeline

### Fase 4: Escalabilidad
- [ ] WebSockets para actualizaciones en tiempo real
- [ ] Caché Redis
- [ ] Microservicios
- [ ] Dockerización

## 🚀 Migración a Backend

Cuando decidas mover la API al backend:

1. **Leer**: `/backend/IMPLEMENTATION.md`
2. **Elegir**: Stack (Node.js o Python)
3. **Implementar**: Servidor con rutas de API
4. **Actualizar**: `frontend/js/api.js` para usar servidor
5. **Testear**: Toda la integración

Ver `/frontend/STRUCTURE.md` para detalles de cómo hacerlo.

## 📚 Documentación Adicional

- **Frontend**: Ver `frontend/STRUCTURE.md`
- **Backend**: Ver `backend/IMPLEMENTATION.md`
- **API**: Open-Meteo en https://open-meteo.com/

## 🎯 Casos de Uso

1. **Simulación Diaria**: Predecir comportamiento del embalse
2. **Planificación**: Optimizar horas de generación
3. **Emergencias**: Evaluar viabilidad en condiciones críticas
4. **Reportes**: Generar datos para auditorías
5. **Análisis**: Comparar escenarios históricos

## 📊 Ejemplo de Uso

```javascript
// El usuario ingresa:
- Nivel inicial: 775.50 msnm
- Caudal base: 2.00 m³/s

// La app retorna:
- Simulación para las próximas 24 horas
- Tabla hora por hora con:
  - Potencia recomendada (0, 4.2, 8.2 MW)
  - Caudal de salida
  - Volumen turbinado
  - Nivel del embalse
  - Estado de operación

// El usuario puede:
- Editar valores manualmente
- Ver recálculos automáticos
- Comparar escenarios
```

## 🔧 Troubleshooting

### "No se carga el clima"
- Verifica conexión a internet
- Comprueba que Open-Meteo no esté caída
- Revisa la consola del navegador (F12)

### "Los números no se ven bien"
- Actualiza el navegador
- Limpia el cache (Ctrl+Shift+Del)
- Intenta en otro navegador

### "Las ediciones no se guardan"
- Los cambios son solo en sesión actual
- Para guardar permanente, usa backend
- Los datos se pierden al recargar

## 👨‍💻 Desarrollo Local

```bash
# Clonar proyecto
git clone <repo-url>
cd Calculo-de-caudales

# Abrir en navegador (sin servidor necesario)
# Opción 1: Doble clic en frontend/index.html
# Opción 2: Usar Live Server en VS Code

# Con Python (si tienes):
python -m http.server 8000
# Luego abre http://localhost:8000/frontend/
```

## 📄 Licencia

Uso libre para fines educativos y comerciales

## 👥 Contribuciones

Las contribuciones son bienvenidas. Por favor:
1. Fork el proyecto
2. Crea una rama para tu feature
3. Haz commit de tus cambios
4. Push a la rama
5. Abre un Pull Request

## 📞 Soporte

Para reportar bugs o sugerir mejoras:
- Abre un issue en GitHub
- Revisa la documentación en `/frontend/STRUCTURE.md` y `/backend/IMPLEMENTATION.md`

---

**Última actualización**: 11 de Mayo, 2026
**Versión**: 2.0 (Arquitectura Modular)
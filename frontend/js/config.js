/**
 * CONFIG.JS - Configuración y constantes del proyecto
 * Contiene todas las constantes del sistema
 */

// ============================================
// UBICACIÓN GEOGRÁFICA
// ============================================
export const LOCATION = {
  name: "El Cafetal",
  latitude: 15.14375,
  longitude: -90.07007
};

// ============================================
// TABLA DE VOLUMEN - NIVEL (msnm)
// ============================================
export const VOLUME_TABLE = [
  [0.00, 770.00],
  [2297.00, 770.50],
  [5167.70, 771.00],
  [8623.90, 771.50],
  [12769.60, 772.00],
  [17624.49, 772.50],
  [23241.57, 773.00],
  [29304.76, 773.50],
  [35764.33, 774.00],
  [42637.14, 774.50],
  [49924.80, 775.00],
  [57672.94, 775.50],
  [65881.95, 776.00],
  [74567.19, 776.50],
  [83801.42, 777.00],
  [93664.56, 777.50],
  [104784.00, 778.00]
];

// ============================================
// NIVELES DE OPERACIÓN (msnm)
// ============================================
export const OPERATION_LEVELS = {
  minimum: 773.00export const INFLOW_PATTERNS = {
  normal: [1.70, 1.55, ...],      // Patrón actual
  dry: [0.80, 0.70, ...],         // Sequía
  rainy: [3.20, 3.50, ...],       // Lluvia
  storm: [5.00, 6.00, ...]        // Tormenta
};,      // Nivel mínimo permitido
  start: 777.50,        // Nivel de inicio de operación
  overflow: 777.75,     // Nivel de rebalse
  maximum: 778.00       // Nivel máximo del embalse
};

// ============================================
// CONFIGURACIÓN DE HORAS OBLIGATORIAS
// ============================================
export const MANDATORY_HOURS = {
  hours: [18, 19, 20, 21],
  simulation: 24,
  updateInterval: 10 * 60 * 1000  // 10 minutos
};

// ============================================
// POTENCIA DE GENERACIÓN (MW)
// ============================================
export const POWER = {
  unit1: 4.2,     // Una unidad
  unit2: 8.2,     // Dos unidades
  minHoursUnit1: 2,
  minHoursUnit2: 2,
  minHoursBeforeUnit2: 2
};

// ============================================
// PARÁMETROS DE SIMULACIÓN
// ============================================
export const SIMULATION_PARAMS = {
  highInflowThreshold: 1.80,           // m3/s
  postMandatoryMargin: 0.20,           // msnm
  projectionHours: 3
};

// ============================================
// PATRÓN DE ENTRADA DE AGUA (m3/s)
// Patrón horario típico del río
// ============================================
export const INFLOW_PATTERN = [
  1.70, 1.55, 1.55, 1.75, 1.95, 2.10,
  2.15, 2.35, 2.25, 2.05, 2.15, 2.05,
  1.70, 1.95, 1.90, 1.95, 2.20, 2.10,
  1.55, 1.55, 1.55, 1.70, 1.95, 2.65
];

// ============================================
// API ENDPOINTS
// ============================================
export const API = {
  climate: {
    baseUrl: "https://api.open-meteo.com/v1/forecast",
    timeout: 10000
  }
};

// ============================================
// CÓDIGOS DE CLIMA Y SUS DESCRIPCIONES
// ============================================
export const WEATHER_CODES = {
  0: "Despejado",
  1: "Mayormente despejado",
  2: "Parcialmente nublado",
  3: "Nublado",
  45: "Neblina",
  48: "Neblina con escarcha",
  51: "Llovizna ligera",
  53: "Llovizna",
  55: "Llovizna intensa",
  56: "Llovizna helada ligera",
  57: "Llovizna helada intensa",
  61: "Lluvia ligera",
  63: "Lluvia",
  65: "Lluvia intensa",
  66: "Lluvia helada ligera",
  67: "Lluvia helada intensa",
  71: "Nieve ligera",
  73: "Nieve",
  75: "Nieve intensa",
  77: "Granos de nieve",
  80: "Chubascos ligeros",
  81: "Chubascos",
  82: "Chubascos intensos",
  85: "Chubascos de nieve",
  86: "Chubascos de nieve intensos",
  95: "Tormenta",
  96: "Tormenta con granizo",
  99: "Tormenta fuerte con granizo"
};

// ============================================
// ICONOS DE CLIMA
// ============================================
export const WEATHER_ICONS = {
  day: {
    clear: "☀️",
    partly: "🌤️",
    cloudy: "☁️",
    fog: "🌫️",
    drizzle: "🌦️",
    rain: "🌧️",
    snow: "🌨️",
    storm: "⛈️"
  },
  night: {
    clear: "🌙",
    partly: "🌙☁️",
    cloudy: "☁️",
    fog: "🌫️",
    drizzle: "🌦️",
    rain: "🌧️",
    snow: "🌨️",
    storm: "⛈️"
  }
};

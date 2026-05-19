/**
 * CONFIG.JS - Configuración y constantes del proyecto
 * Contiene todas las constantes del sistema
 */

// ============================================
// UBICACIÓN GEOGRÁFICA
// ============================================
export const UBICACION = {
  nombre: "El Cafetal",
  latitud: 15.14375,
  longitud: -90.07007
};

// ============================================
// TABLA DE VOLUMEN - NIVEL (msnm)
// ============================================
export const tabla_volumen = [
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

export const TABLA_VOLUMEN_ALIAS = tabla_volumen;

// ============================================
// NIVELES DE OPERACIÓN (msnm)
// ============================================
export const niveles_operacion = {
  minimo: 773.50,      // Nivel mínimo permitido
  inicio: 777.50,        // Nivel de inicio de operación
  rebalse: 777.75,     // Nivel de rebalse
  maximo: 778.00       // Nivel máximo del embalse
};

export const NIVELES_OPERACION_ALIAS = niveles_operacion;

// ============================================
// CONFIGURACIÓN DE HORAS OBLIGATORIAS
// ============================================
// Cada número representa la hora de inicio del tramo obligatorio:
// 18 = 18:00-19:00, 19 = 19:00-20:00, 20 = 20:00-21:00, 21 = 21:00-22:00.
// Por eso no se incluye 22; agregarlo sería una quinta hora obligatoria, 22:00-23:00.
export const horas_obligatorias = {
  horas: [18, 19, 20, 21],
  simulacion: 24,
  intervaloActualizacion: 10 * 60 * 1000  // 10 minutos
};

export const HORAS_OBLIGATORIAS = horas_obligatorias;

// ============================================
// POTENCIA DE GENERACIÓN (MW)
// ============================================
export const potencia = {
  unidad1: 4.2,               // Potencia máxima de la unidad 1 (MW)
  unidad2: 4.2,               // Potencia máxima de la unidad 2 (MW)
  // horasMinimasUnidad1/2: restricciones de tiempo de operación mínima por unidad
  horasMinimasUnidad1: 2,
  horasMinimasUnidad2: 2,
  horasMinimasAntesUnidad2: 2,
  // Opciones de potencia combinada que se pueden aplicar durante las horas obligatorias
  // Cada valor representa potencia total (MW) con una o dos unidades encendidas.
  // El simulador intentará elegir la potencia viable de esta lista que mantenga
  // el nivel por encima del mínimo. Mantén una opción máxima (p. ej. 8.3) si aplica.
  opcionesObligatoriasCombinadas: Array.from(
    { length: Math.round((8.3 - 4.2) * 10) + 1 },
    (_, i) => Math.round((4.2 + i * 0.1) * 10) / 10
  ).sort((a, b) => a - b)
};

export const POTENCIA_ALIAS = potencia;

// ============================================
// PARÁMETROS DE SIMULACIÓN
// ============================================
export const PARAMETROS_SIMULACION_ALIAS = {
  umbralCaudalAlto: 2.20,           // m3/s
  margenPosteriorObligatorio: 0.15,           // msnm
  horasProyeccion: 5,                // Horas a proyectar para la toma de decisiones
  nivelMaximoProyeccion: 778.50,        // Nivel máximo permitido en proyecciones para evitar alarmas falsas
  nivelMinimoProyeccion: 773.00         // Nivel mínimo permitido en proyecciones para evitar alarmas falsas
};

export const parametros_simulacion = PARAMETROS_SIMULACION_ALIAS;

// ============================================
// AJUSTES HORARIOS DE CAUDAL NETO (m3/s)
// ============================================
// Calibración contra datos reales observados:
// 19:00 -> 20:00 baja de 775.25 a 774.57
// 20:00 -> 21:00 baja de 774.57 a 773.90
export const AJUSTES_CAUDAL_NETO = {
  19: -0.53,
  20: -0.26,
  21: 0.81
};

// ============================================
// API ENDPOINTS
// ============================================
export const API = {
  clima: {
    urlBase: "https://api.open-meteo.com/v1/forecast",
    tiempoEspera: 10000
  },
  embalse: {
    urlBackend: "/api/cora/datos",
    urlPatronEntrada: "/api/cora/patron-entrada",
    cantidadUltimos: 24,
    tiempoEspera: 10000
  }
};

// ============================================
// CÓDIGOS DE CLIMA Y SUS DESCRIPCIONES
// ============================================
export const CODIGOS_CLIMA = {
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
export const ICONOS_CLIMA = {
  dia: {
    despejado: "☀️",
    parcial: "🌤️",
    nublado: "☁️",
    neblina: "🌫️",
    llovizna: "🌦️",
    lluvia: "🌧️",
    nieve: "🌨️",
    tormenta: "⛈️"
  },
  noche: {
    despejado: "🌙",
    parcial: "🌙☁️",
    nublado: "☁️",
    neblina: "🌫️",
    llovizna: "🌦️",
    lluvia: "🌧️",
    nieve: "🌨️",
    tormenta: "⛈️"
  }
};

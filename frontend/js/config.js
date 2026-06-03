/**
 * CONFIG.JS - Configuración y constantes del proyecto
 * Contiene todas las constantes del sistema
 */

// ============================================
// UBICACIÓN GEOGRÁFICA
// ============================================
export const UBICACION = {
  nombre: "El Cafetal",
  latitud: 15.22553,
  longitud: -90.11064
};

export const PLANTAS = {
  cafetal: {
    id: "cafetal",
    nombre: "El Cafetal",
    nivelMinimo: 770,
    nivelMaximo: 778,
    nivelEjemplo: "775.80",
    usaCora: true
  },
  "la-perla": {
    id: "la-perla",
    nombre: "La Perla",
    nivelMinimo: 595,
    nivelMaximo: 600,
    nivelEjemplo: "598.50",
    usaCora: true
  }
};

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
// API ENDPOINTS
// ============================================
export const API = {
  clima: {
    urlBase: "/api/clima",
    tiempoEspera: 10000
  },
  embalse: {
    urlBackend: "/api/cora/datos",
    urlPatronEntrada: "/api/cora/patron-entrada",
    urlSimulacion: "/api/simulacion",
    urlProyecciones: "/api/proyecciones",
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

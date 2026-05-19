/**
 * API.JS - Gestión de llamadas a API externas
 * Maneja la obtención de datos climáticos desde Open-Meteo
 */

import { UBICACION, API, HORAS_OBLIGATORIAS } from './config.js';

async function obtenerConTiempoLimite(url, tiempoEspera = 10000) {
  const controlador = new AbortController();
  const idTiempoEspera = setTimeout(() => controlador.abort(), tiempoEspera);

  try {
    return await fetch(url, { signal: controlador.signal, cache: "no-store" });
  } finally {
    clearTimeout(idTiempoEspera);
  }
}

/**
 * Obtiene datos de clima actual y pronóstico desde Open-Meteo
 * @returns {Promise<Object>} Datos de clima
 */
export async function obtenerDatosClima() {
  const { latitud, longitud } = UBICACION;
  const { urlBase, tiempoEspera } = API.clima;

  const parametros = new URLSearchParams({
    latitude: latitud,
    longitude: longitud,
    timezone: 'auto',
    current: 'temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,pressure_msl,wind_speed_10m,wind_direction_10m',
    hourly: 'temperature_2m,precipitation,weather_code,is_day',
    daily: 'temperature_2m_max,temperature_2m_min,sunrise,sunset',
    forecast_days: '1'
  });

  const url = `${urlBase}?${parametros}`;

  try {
    const respuesta = await obtenerConTiempoLimite(url, tiempoEspera);
    if (!respuesta.ok) {
      throw new Error(`Error de API de clima: ${respuesta.status}`);
    }
    return await respuesta.json();
  } catch (error) {
    console.error('Error al obtener datos de clima:', error);
    throw error;
  }
}

/**
 * Obtiene los últimos datos reales de producción y embalse desde PostgreSQL.
 * @returns {Promise<Array|Object>} Datos CORA almacenados por el backend
 */
export async function obtenerDatosEmbalse() {
  const { urlBackend, cantidadUltimos, tiempoEspera } = API.embalse;
  const parametros = new URLSearchParams({
    cantidad: String(cantidadUltimos)
  });
  const urlBackendConParametros = `${urlBackend}?${parametros}`;

  try {
    const respuesta = await obtenerConTiempoLimite(urlBackendConParametros, tiempoEspera);
    if (!respuesta.ok) {
      throw new Error(`Error de backend de embalse: ${respuesta.status}`);
    }
    return await respuesta.json();
  } catch (error) {
    console.error('Error al obtener datos de embalse desde la base de datos:', error);
    throw error;
  }
}

/**
 * Obtiene el patrón horario de QE desde PostgreSQL.
 * Si no se envía fecha, el backend usa el día anterior.
 * @returns {Promise<Object>} { fecha, patron, registros, completo }
 */
export async function obtenerPatronEntradaEmbalse(fecha = null) {
  const { urlPatronEntrada, tiempoEspera } = API.embalse;
  const parametros = new URLSearchParams();
  if (fecha) parametros.set('fecha', fecha);

  const url = parametros.toString()
    ? `${urlPatronEntrada}?${parametros}`
    : urlPatronEntrada;

  try {
    const respuesta = await obtenerConTiempoLimite(url, tiempoEspera);
    if (!respuesta.ok) {
      throw new Error(`Error de patrón de entrada: ${respuesta.status}`);
    }
    return await respuesta.json();
  } catch (error) {
    console.error('Error al obtener patrón de entrada desde la base de datos:', error);
    throw error;
  }
}

/**
 * Prepara los datos de lluvia para la simulación
 * @param {Object} datosClima Datos del clima de la API
 * @returns {Array} Array de precipitación para 24 horas
 */
export function extraerDatosLluvia(datosClima) {
  const lluvia = datosClima.hourly.precipitation.slice(0, HORAS_OBLIGATORIAS.simulacion);
  
  // Rellenar con ceros si es necesario
  while (lluvia.length < HORAS_OBLIGATORIAS.simulacion) {
    lluvia.push(0);
  }
  
  return lluvia;
}

/**
 * Extrae datos actuales del clima
 * @param {Object} datosClima Datos del clima de la API
 * @returns {Object} Datos actuales
 */
export function extraerClimaActual(datosClima) {
  return datosClima.current;
}

/**
 * Extrae datos diarios del clima
 * @param {Object} datosClima Datos del clima de la API
 * @returns {Object} Datos diarios
 */
export function extraerClimaDiario(datosClima) {
  return datosClima.daily;
}

/**
 * Extrae datos horarios del clima
 * @param {Object} datosClima Datos del clima de la API
 * @returns {Object} Datos horarios
 */
export function extraerClimaHorario(datosClima) {
  return {
    hora: datosClima.hourly.time.slice(0, HORAS_OBLIGATORIAS.simulacion),
    temperatura: datosClima.hourly.temperature_2m.slice(0, HORAS_OBLIGATORIAS.simulacion),
    precipitacion: datosClima.hourly.precipitation.slice(0, HORAS_OBLIGATORIAS.simulacion),
    codigoClima: datosClima.hourly.weather_code.slice(0, HORAS_OBLIGATORIAS.simulacion),
    esDia: datosClima.hourly.is_day.slice(0, HORAS_OBLIGATORIAS.simulacion)
  };
}

/**
 * API.JS - Gestión de llamadas a API externas
 * Maneja la obtención de datos climáticos desde Open-Meteo
 */

import { LOCATION, API, MANDATORY_HOURS } from './config.js';

/**
 * Obtiene datos de clima actual y pronóstico desde Open-Meteo
 * @returns {Promise<Object>} Datos de clima
 */
export async function fetchClimateData() {
  const { latitude, longitude } = LOCATION;
  const { baseUrl } = API.climate;

  const params = new URLSearchParams({
    latitude,
    longitude,
    timezone: 'auto',
    current: 'temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,pressure_msl,wind_speed_10m,wind_direction_10m',
    hourly: 'temperature_2m,precipitation,weather_code,is_day',
    daily: 'temperature_2m_max,temperature_2m_min,sunrise,sunset',
    forecast_days: '1'
  });

  const url = `${baseUrl}?${params}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Climate API error: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching climate data:', error);
    throw error;
  }
}

/**
 * Prepara los datos de lluvia para la simulación
 * @param {Object} climateData Datos del clima de la API
 * @returns {Array} Array de precipitación para 24 horas
 */
export function extractRainfallData(climateData) {
  const rainfall = climateData.hourly.precipitation.slice(0, MANDATORY_HOURS.simulation);
  
  // Rellenar con ceros si es necesario
  while (rainfall.length < MANDATORY_HOURS.simulation) {
    rainfall.push(0);
  }
  
  return rainfall;
}

/**
 * Extrae datos actuales del clima
 * @param {Object} climateData Datos del clima de la API
 * @returns {Object} Datos actuales
 */
export function extractCurrentWeather(climateData) {
  return climateData.current;
}

/**
 * Extrae datos diarios del clima
 * @param {Object} climateData Datos del clima de la API
 * @returns {Object} Datos diarios
 */
export function extractDailyWeather(climateData) {
  return climateData.daily;
}

/**
 * Extrae datos horarios del clima
 * @param {Object} climateData Datos del clima de la API
 * @returns {Object} Datos horarios
 */
export function extractHourlyWeather(climateData) {
  return {
    time: climateData.hourly.time.slice(0, MANDATORY_HOURS.simulation),
    temperature: climateData.hourly.temperature_2m.slice(0, MANDATORY_HOURS.simulation),
    precipitation: climateData.hourly.precipitation.slice(0, MANDATORY_HOURS.simulation),
    weatherCode: climateData.hourly.weather_code.slice(0, MANDATORY_HOURS.simulation),
    isDay: climateData.hourly.is_day.slice(0, MANDATORY_HOURS.simulation)
  };
}

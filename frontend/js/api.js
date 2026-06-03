/**
 * API.JS - Gestión de llamadas a API externas
 * Maneja las llamadas al backend C#.
 */

import { API, HORAS_OBLIGATORIAS } from './config.js?v=20260603-edicion-potencia';

async function obtenerConTiempoLimite(url, tiempoEspera = 10000, opciones = {}) {
  const controlador = new AbortController();
  const idTiempoEspera = setTimeout(() => controlador.abort(), tiempoEspera);

  try {
    return await fetch(url, { ...opciones, signal: controlador.signal, cache: "no-store" });
  } finally {
    clearTimeout(idTiempoEspera);
  }
}

async function leerJsonSeguro(respuesta) {
  const texto = await respuesta.text();
  if (!texto) return null;
  return JSON.parse(texto);
}

/**
 * Obtiene datos de clima actual y pronóstico desde Open-Meteo
 * @returns {Promise<Object>} Datos de clima
 */
export async function obtenerDatosClima() {
  const { urlBase, tiempoEspera } = API.clima;

  try {
    const respuesta = await obtenerConTiempoLimite(urlBase, tiempoEspera);
    if (!respuesta.ok) {
      throw new Error(`Error de backend de clima: ${respuesta.status}`);
    }
    return await leerJsonSeguro(respuesta);
  } catch (error) {
    console.error('Error al obtener datos de clima:', error);
    throw error;
  }
}

/**
 * Solicita al backend C# la simulación completa de 24 horas.
 * El backend obtiene QE desde PostgreSQL y lluvia desde Open-Meteo.
 */
export async function obtenerSimulacion(
  planta,
  nivelInicial,
  alturaCanal = null,
  potenciaGeneracion = null,
  guardar = false
) {
  const { urlSimulacion, tiempoEspera } = API.embalse;

  try {
    const respuesta = await obtenerConTiempoLimite(urlSimulacion, tiempoEspera, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planta, nivelInicial, alturaCanal, potenciaGeneracion, guardar })
    });
    const datos = await leerJsonSeguro(respuesta);

    if (!respuesta.ok) {
      throw new Error(datos?.error ?? `Error de simulación: ${respuesta.status}`);
    }

    return datos;
  } catch (error) {
    console.error('Error al obtener simulación desde C#:', error);
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
    return await leerJsonSeguro(respuesta);
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
    return await leerJsonSeguro(respuesta);
  } catch (error) {
    console.error('Error al obtener patrón de entrada desde la base de datos:', error);
    throw error;
  }
}

export async function obtenerProyecciones(planta) {
  const { urlProyecciones, tiempoEspera } = API.embalse;
  const parametros = new URLSearchParams({ planta, cantidad: "50" });
  const respuesta = await obtenerConTiempoLimite(`${urlProyecciones}?${parametros}`, tiempoEspera);
  const datos = await leerJsonSeguro(respuesta);

  if (!respuesta.ok) {
    throw new Error(datos?.error ?? `Error al obtener proyecciones: ${respuesta.status}`);
  }

  return Array.isArray(datos) ? datos : [];
}

export async function obtenerProyeccion(id) {
  const { urlProyecciones, tiempoEspera } = API.embalse;
  const respuesta = await obtenerConTiempoLimite(`${urlProyecciones}/${id}`, tiempoEspera);
  const datos = await leerJsonSeguro(respuesta);

  if (!respuesta.ok) {
    throw new Error(datos?.error ?? `Error al obtener proyección: ${respuesta.status}`);
  }

  return datos;
}

export async function actualizarPotenciasProyeccion(id, potencias) {
  const { urlProyecciones, tiempoEspera } = API.embalse;
  const respuesta = await obtenerConTiempoLimite(`${urlProyecciones}/${id}/potencias`, tiempoEspera, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ potencias })
  });
  const datos = await leerJsonSeguro(respuesta);

  if (!respuesta.ok) {
    throw new Error(datos?.error ?? `Error al actualizar potencia: ${respuesta.status}`);
  }

  return datos;
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

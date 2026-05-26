/**
 * MAIN.JS - Punto de entrada principal de la aplicación
 * Coordina API, cálculos e interfaz
 */

import {
  obtenerDatosClima,
  obtenerDatosEmbalse,
  obtenerPatronEntradaEmbalse,
  obtenerSimulacion,
  extraerClimaActual,
  extraerClimaDiario,
  extraerClimaHorario,
  extraerDatosLluvia
} from './api.js?v=20260512-calibrated-patterns';
import {
  obtenerEntradasFormulario,
  validarEntradas,
  actualizarTarjetaPrincipal,
  actualizarPronosticoHorario,
  actualizarDetallesClima,
  establecerEstadoClima,
  establecerUltimaActualizacion,
  llenarTablaResultados,
  establecerBotonCargando,
  actualizarDatosEmbalse,
  establecerEstadoEmbalse,
  aplicarPlanta
} from './ui.js?v=20260512-calibrated-patterns';
import { HORAS_OBLIGATORIAS, PLANTAS } from './config.js?v=20260512-calibrated-patterns';

let patronEntradaReal = null;
let fechaPatronEntrada = null;
let plantaActual = "cafetal";

function redondear2(valor) {
  return Math.round(valor * 100) / 100;
}

function patronEntradaCompleto(patron) {
  return Array.isArray(patron)
    && patron.length >= HORAS_OBLIGATORIAS.simulacion
    && patron.slice(0, HORAS_OBLIGATORIAS.simulacion).every(valor => Number.isFinite(Number(valor)));
}

async function actualizarPatronEntrada() {
  const respuesta = await obtenerPatronEntradaEmbalse();
  const patron = Array.isArray(respuesta.patron) ? respuesta.patron : [];
  patronEntradaReal = patron.map(valor => Number(valor));
  fechaPatronEntrada = respuesta.fecha;

  if (!respuesta.completo || !patronEntradaCompleto(patronEntradaReal)) {
    patronEntradaReal = null;
    throw new Error(`El patrón QE del ${respuesta.fecha} está incompleto (${respuesta.registros}/24 registros).`);
  }
}

/**
 * Actualiza datos reales de producción y embalse
 */
async function actualizarPanelEmbalse() {
  const planta = PLANTAS[plantaActual] ?? PLANTAS.cafetal;
  if (!planta.usaCora) {
    actualizarDatosEmbalse([]);
    establecerEstadoEmbalse("Método local");
    return;
  }

  try {
    establecerEstadoEmbalse("Actualizando...");
    const datosEmbalse = await obtenerDatosEmbalse();
    actualizarDatosEmbalse(datosEmbalse);

    try {
      await actualizarPatronEntrada();
      establecerEstadoEmbalse(`Patrón QE ${fechaPatronEntrada}`);
    } catch (error) {
      console.error('Error al actualizar patrón de entrada:', error);
      establecerEstadoEmbalse("Patrón QE incompleto");
    }
  } catch (error) {
    console.error('Error al actualizar datos de embalse:', error);
    establecerEstadoEmbalse("No disponible");
  }
}

/**
 * Realiza la actualización completa del sistema
 */
async function actualizarTodo() {
  await actualizarPanelEmbalse();

  try {
    establecerEstadoClima("Clima: actualizando automáticamente...");
    const datosClima = await obtenerDatosClima();
    await renderizarDesdeDatosClima(datosClima);
  } catch (error) {
    console.error('Error en actualización automática:', error);
    establecerEstadoClima("Clima: no disponible, simulando sin lluvia");
    establecerUltimaActualizacion();

    if (!validarEntradas(plantaActual)) return;

    const { nivelInicial, alturaCanal } = obtenerEntradasFormulario();
    const { resultados } = await obtenerSimulacion(plantaActual, nivelInicial, alturaCanal);
    llenarTablaResultados(resultados);
  }
}

/**
 * Procesa datos de clima y renderiza todo
 */
async function renderizarDesdeDatosClima(datosClima) {
  const climaActual = extraerClimaActual(datosClima);
  const climaDiario = extraerClimaDiario(datosClima);
  const climaHorario = extraerClimaHorario(datosClima);
  const datosLluvia = extraerDatosLluvia(datosClima);

  // Actualizar UI de clima
  actualizarTarjetaPrincipal(climaActual, climaDiario);
  actualizarPronosticoHorario(climaHorario);
  actualizarDetallesClima(climaActual, climaDiario);

  // Calcular total de lluvia
  const lluviaTotal = redondear2(datosLluvia.reduce((a, b) => a + b, 0));
  establecerEstadoClima(`Clima: datos cargados | lluvia total 24h = ${lluviaTotal} mm`);
  establecerUltimaActualizacion();

  // Ejecutar simulación si inputs son válidos
  if (!validarEntradas(plantaActual)) return;

  const { nivelInicial, alturaCanal } = obtenerEntradasFormulario();
  const { resultados } = await obtenerSimulacion(plantaActual, nivelInicial, alturaCanal);
  llenarTablaResultados(resultados);
  if ((PLANTAS[plantaActual] ?? PLANTAS.cafetal).usaCora) {
    establecerEstadoEmbalse(`Patrón QE ${fechaPatronEntrada}`);
  }
}

/**
 * Cálculo manual iniciado por el usuario
 */
async function manejarCalculoManual() {
  const planta = PLANTAS[plantaActual] ?? PLANTAS.cafetal;
  const { nivelInicial } = obtenerEntradasFormulario();

  if (isNaN(nivelInicial)) {
    alert("Ingresa un nivel inicial válido.");
    return;
  }

  if (nivelInicial < planta.nivelMinimo || nivelInicial > planta.nivelMaximo) {
    alert(`El nivel inicial debe estar entre ${planta.nivelMinimo} y ${planta.nivelMaximo} msnm.`);
    return;
  }

  try {
    establecerBotonCargando(true);
    establecerEstadoClima("Clima: obteniendo datos reales...");

    await actualizarPanelEmbalse();
    const datosClima = await obtenerDatosClima();
    await renderizarDesdeDatosClima(datosClima);
  } catch (error) {
    console.error('Error en cálculo manual:', error);
    establecerEstadoClima("Clima: no disponible, simulando sin lluvia");
    establecerEstadoEmbalse(error.message ?? "Simulación no disponible");
  } finally {
    establecerBotonCargando(false);
  }
}

/**
 * Inicializa la aplicación
 */
document.addEventListener("DOMContentLoaded", async () => {
  const botonCalcular = document.getElementById("botonCalcular");
  aplicarPlanta(plantaActual);

  document.querySelectorAll(".boton-planta").forEach(boton => {
    boton.addEventListener("click", async () => {
      plantaActual = boton.dataset.planta ?? "cafetal";
      patronEntradaReal = null;
      fechaPatronEntrada = null;
      aplicarPlanta(plantaActual);
      boton.closest(".menu-plantas")?.removeAttribute("open");
      llenarTablaResultados([]);
      await actualizarTodo();
    });
  });

  if (botonCalcular) {
    botonCalcular.addEventListener("click", manejarCalculoManual);
  }

  // Actualización inicial
  await actualizarTodo();

  // Actualización automática cada 10 minutos
  setInterval(actualizarTodo, HORAS_OBLIGATORIAS.intervaloActualizacion);
});

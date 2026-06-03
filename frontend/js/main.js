/**
 * MAIN.JS - Punto de entrada principal de la aplicación
 * Coordina API, cálculos e interfaz
 */

import {
  obtenerDatosClima,
  obtenerDatosEmbalse,
  obtenerPatronEntradaEmbalse,
  actualizarPotenciasProyeccion,
  obtenerProyeccion,
  obtenerProyecciones,
  obtenerSimulacion,
  extraerClimaActual,
  extraerClimaDiario,
  extraerClimaHorario,
  extraerDatosLluvia
} from './api.js?v=20260603-edicion-potencia';
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
  actualizarDetalleProyeccion,
  actualizarListaProyecciones,
  aplicarVista,
  aplicarPlanta
} from './ui.js?v=20260603-edicion-potencia';
import { HORAS_OBLIGATORIAS, PLANTAS } from './config.js?v=20260603-edicion-potencia';

let patronEntradaReal = null;
let fechaPatronEntrada = null;
let plantaActual = "cafetal";
let vistaActual = "proyeccion";
let proyeccionActualId = null;
let proyeccionGuardadaActualId = null;

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
    const { nivelInicial, alturaCanal } = obtenerEntradasFormulario();
    const simulacionGuardada = await obtenerSimulacion(plantaActual, nivelInicial, alturaCanal, null, true);
    proyeccionActualId = simulacionGuardada.proyeccionId ?? null;
    llenarTablaResultados(simulacionGuardada.resultados);
    await cargarProyecciones();
    if (simulacionGuardada.proyeccionId) {
      establecerEstadoEmbalse(`Proyección guardada #${simulacionGuardada.proyeccionId}`);
    }
  } catch (error) {
    console.error('Error en cálculo manual:', error);
    establecerEstadoClima("Clima: no disponible, simulando sin lluvia");
    establecerEstadoEmbalse(error.message ?? "Simulación no disponible");
  } finally {
    establecerBotonCargando(false);
  }
}

async function cargarProyecciones() {
  const planta = PLANTAS[plantaActual] ?? PLANTAS.cafetal;
  try {
    const proyecciones = await obtenerProyecciones(plantaActual);
    actualizarListaProyecciones(proyecciones, planta.nombre);
  } catch (error) {
    console.error('Error al cargar proyecciones:', error);
    actualizarListaProyecciones([], planta.nombre);
  }
}

async function manejarSeleccionProyeccion(evento) {
  const boton = evento.target.closest(".boton-proyeccion");
  if (!boton) return;

  document.querySelectorAll(".boton-proyeccion").forEach(item => item.classList.remove("activo"));
  boton.classList.add("activo");

  const proyeccion = await obtenerProyeccion(boton.dataset.proyeccionId);
  proyeccionGuardadaActualId = proyeccion.id;
  actualizarDetalleProyeccion(proyeccion);
}

function obtenerPotenciasDesdeTabla(tabla) {
  return Array.from(tabla.querySelectorAll('[data-columna="potencia"]'))
    .map(celda => Number(celda.textContent));
}

function crearInputPotencia(celda, valorActual) {
  const input = document.createElement("input");
  input.type = "number";
  input.step = "0.1";
  input.min = "0";
  input.value = valorActual.toFixed(2);
  input.className = "input-potencia-tabla";
  celda.textContent = "";
  celda.appendChild(input);
  input.focus();
  input.select();
  return input;
}

async function confirmarEdicionPotencia(tabla, celda, input, proyeccionId, esTablaPrincipal) {
  const valorNuevo = Number(input.value);
  if (!Number.isFinite(valorNuevo) || valorNuevo < 0) {
    alert("Ingresa una potencia válida.");
    celda.textContent = input.defaultValue;
    return;
  }

  const indice = Number(celda.dataset.indice);
  const potencias = obtenerPotenciasDesdeTabla(tabla);
  potencias[indice] = valorNuevo;
  celda.textContent = valorNuevo.toFixed(2);

  const proyeccionActualizada = await actualizarPotenciasProyeccion(proyeccionId, potencias);
  if (esTablaPrincipal) {
    llenarTablaResultados(proyeccionActualizada.resultados);
  } else {
    actualizarDetalleProyeccion(proyeccionActualizada);
  }
  await cargarProyecciones();
}

function manejarEdicionPotencia(evento) {
  const celda = evento.target.closest('[data-columna="potencia"]');
  if (!celda || celda.querySelector("input")) return;

  const tabla = celda.closest("table");
  const esTablaPrincipal = tabla?.id === "tablaResultados";
  const proyeccionId = esTablaPrincipal ? proyeccionActualId : proyeccionGuardadaActualId;
  if (!proyeccionId) {
    alert("Primero crea o selecciona una proyección guardada.");
    return;
  }

  const valorActual = Number(celda.textContent);
  const input = crearInputPotencia(celda, Number.isFinite(valorActual) ? valorActual : 0);
  let confirmado = false;

  const confirmar = async () => {
    if (confirmado) return;
    confirmado = true;
    try {
      await confirmarEdicionPotencia(tabla, celda, input, proyeccionId, esTablaPrincipal);
    } catch (error) {
      console.error("Error al editar potencia:", error);
      alert(error.message ?? "No se pudo actualizar la potencia.");
      celda.textContent = Number.isFinite(valorActual) ? valorActual.toFixed(2) : "--";
    }
  };

  input.addEventListener("keydown", eventoTecla => {
    if (eventoTecla.key === "Enter") confirmar();
    if (eventoTecla.key === "Escape") {
      confirmado = true;
      celda.textContent = Number.isFinite(valorActual) ? valorActual.toFixed(2) : "--";
    }
  });
  input.addEventListener("blur", confirmar);
}

async function cambiarVista(vista) {
  vistaActual = vista;
  aplicarVista(vistaActual);

  if (vistaActual === "guardadas") {
    await cargarProyecciones();
  }

  if (vistaActual === "datos-reales") {
    await actualizarPanelEmbalse();
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
      proyeccionActualId = null;
      proyeccionGuardadaActualId = null;
      aplicarPlanta(plantaActual);
      boton.closest(".menu-plantas")?.removeAttribute("open");
      llenarTablaResultados([]);
      await cargarProyecciones();
      await actualizarTodo();
    });
  });

  document.querySelectorAll(".boton-vista").forEach(boton => {
    boton.addEventListener("click", async () => {
      await cambiarVista(boton.dataset.vista ?? "proyeccion");
    });
  });

  document.getElementById("listaProyecciones")?.addEventListener("click", manejarSeleccionProyeccion);
  document.getElementById("tablaResultados")?.addEventListener("dblclick", manejarEdicionPotencia);
  document.getElementById("tablaProyeccionGuardada")?.addEventListener("dblclick", manejarEdicionPotencia);

  if (botonCalcular) {
    botonCalcular.addEventListener("click", manejarCalculoManual);
  }

  // Actualización inicial
  await actualizarTodo();

  // Actualización automática cada 10 minutos
  setInterval(actualizarTodo, HORAS_OBLIGATORIAS.intervaloActualizacion);
});

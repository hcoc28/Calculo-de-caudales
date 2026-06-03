/**
 * UI.JS - Gestión de interfaz de usuario
 * Maneja todas las actualizaciones del DOM y eventos
 */

import { CODIGOS_CLIMA, ICONOS_CLIMA, PLANTAS } from './config.js?v=20260603-laperla-cora';

// ============================================
// ESTADO GLOBAL
// ============================================
let resultadosActuales = [];

function redondear2(valor) {
  return Math.round(valor * 100) / 100;
}

/**
 * Obtiene los inputs del formulario
 */
export function obtenerEntradasFormulario() {
  const nivelInicial = parseFloat(document.getElementById("nivelInicial").value);
  const alturaCanal = parseFloat(document.getElementById("alturaCanal")?.value);
  return { nivelInicial, alturaCanal };
}

/**
 * Valida que los inputs sean válidos
 */
export function validarEntradas(plantaId = "cafetal") {
  const planta = PLANTAS[plantaId] ?? PLANTAS.cafetal;
  const { nivelInicial } = obtenerEntradasFormulario();
  if (isNaN(nivelInicial)) return false;
  if (nivelInicial < planta.nivelMinimo || nivelInicial > planta.nivelMaximo) return false;
  return true;
}

export function aplicarPlanta(plantaId) {
  const planta = PLANTAS[plantaId] ?? PLANTAS.cafetal;

  document.getElementById("nombrePlanta").textContent = planta.nombre;
  const plantaMenuActual = document.getElementById("plantaMenuActual");
  if (plantaMenuActual) plantaMenuActual.textContent = planta.nombre;
  document.title = `Cálculo de Caudales - ${planta.nombre}`;
  document.getElementById("etiquetaNivelInicial").textContent =
    `Nivel Inicial (${planta.nivelMinimo} - ${planta.nivelMaximo} msnm)`;
  document.getElementById("nivelInicial").placeholder = `Ej. ${planta.nivelEjemplo}`;
  document.getElementById("grupoAlturaCanal").classList.toggle("oculto", planta.id !== "la-perla");

  document.querySelectorAll(".boton-planta").forEach(boton => {
    boton.classList.toggle("activo", boton.dataset.planta === planta.id);
  });
}

/**
 * Convierte código de clima a descripción
 */
export function obtenerDescripcionClima(codigo) {
  return CODIGOS_CLIMA[codigo] ?? "Condición desconocida";
}

/**
 * Convierte código de clima a icono
 */
export function obtenerIconoClima(codigo, esDia = true) {
  const grupoIconos = esDia ? ICONOS_CLIMA.dia : ICONOS_CLIMA.noche;

  if (codigo === 0) return grupoIconos.despejado;
  if ([1, 2].includes(codigo)) return grupoIconos.parcial;
  if (codigo === 3) return grupoIconos.nublado;
  if ([45, 48].includes(codigo)) return grupoIconos.neblina;
  if ([51, 53, 55, 56, 57].includes(codigo)) return grupoIconos.llovizna;
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(codigo)) return grupoIconos.lluvia;
  if ([71, 73, 75, 77, 85, 86].includes(codigo)) return grupoIconos.nieve;
  if ([95, 96, 99].includes(codigo)) return grupoIconos.tormenta;

  return grupoIconos.nublado;
}

/**
 * Convierte grados a dirección cardinal
 */
export function obtenerDireccionViento(grados) {
  if (grados == null || isNaN(grados)) return "--";
  const direcciones = ["N", "NE", "E", "SE", "S", "SO", "O", "NO"];
  const indice = Math.round(grados / 45) % 8;
  return direcciones[indice];
}

/**
 * Actualiza la tarjeta principal de clima
 */
export function actualizarTarjetaPrincipal(climaActual, climaDiario) {
  document.getElementById("fechaPrincipal").textContent = new Date().toLocaleDateString("es-GT", {
    weekday: "long",
    day: "2-digit",
    month: "long"
  });

  document.getElementById("temperaturaPrincipal").textContent = `${Math.round(climaActual.temperature_2m)}°`;
  document.getElementById("descripcionPrincipal").textContent = obtenerDescripcionClima(climaActual.weather_code);
  document.getElementById("maxminPrincipal").textContent =
    `${Math.round(climaDiario.temperature_2m_max[0])}° / ${Math.round(climaDiario.temperature_2m_min[0])}°`;
  document.getElementById("iconoPrincipal").textContent =
    obtenerIconoClima(climaActual.weather_code, climaActual.is_day === 1);
}

/**
 * Actualiza el pronóstico de 24 horas
 */
export function actualizarPronosticoHorario(climaHorario) {
  const contenedor = document.getElementById("pronostico24h");
  if (!contenedor) return;

  contenedor.innerHTML = "";

  const { hora, temperatura, precipitacion, codigoClima, esDia } = climaHorario;

  for (let i = 0; i < hora.length; i++) {
    const dt = new Date(hora[i]);
    const textoHora = dt.toLocaleTimeString("es-GT", {
      hour: "2-digit",
      minute: "2-digit"
    });

    const elemento = document.createElement("div");
    elemento.className = "elemento-horario";
    elemento.innerHTML = `
      <div class="hora-pronostico">${textoHora}</div>
      <div class="icono-pronostico">${obtenerIconoClima(codigoClima[i], esDia[i] === 1)}</div>
      <div class="temperatura-pronostico">${Math.round(temperatura[i])}°</div>
      <div class="lluvia-pronostico">${(precipitacion[i] ?? 0).toFixed(1)} mm</div>
    `;

    contenedor.appendChild(elemento);
  }
}

/**
 * Actualiza detalles de clima
 */
export function actualizarDetallesClima(climaActual, climaDiario) {
  document.getElementById("detalleHumedad").textContent = `${Math.round(climaActual.relative_humidity_2m)}%`;
  document.getElementById("detalleSensacion").textContent = `${Math.round(climaActual.apparent_temperature)}°`;
  document.getElementById("detalleViento").textContent = `${redondear2(climaActual.wind_speed_10m)} km/h`;
  document.getElementById("detalleDireccion").textContent = obtenerDireccionViento(climaActual.wind_direction_10m);
  document.getElementById("detallePresion").textContent = `${Math.round(climaActual.pressure_msl)}`;
  document.getElementById("detalleAmanecer").textContent =
    new Date(climaDiario.sunrise[0]).toLocaleTimeString("es-GT", { hour: "2-digit", minute: "2-digit" });
  document.getElementById("detalleAtardecer").textContent =
    new Date(climaDiario.sunset[0]).toLocaleTimeString("es-GT", { hour: "2-digit", minute: "2-digit" });
}

function normalizarRegistros(datos) {
  if (Array.isArray(datos)) return datos;
  if (Array.isArray(datos?.data)) return datos.data;
  if (Array.isArray(datos?.items)) return datos.items;
  if (Array.isArray(datos?.result)) return datos.result;
  if (datos && typeof datos === "object") return [datos];
  return [];
}

function buscarValor(registro, candidatos) {
  if (!registro || typeof registro !== "object") return null;

  const entradas = Object.entries(registro);
  for (const candidato of candidatos) {
    const exacto = entradas.find(([clave]) => clave.toLowerCase() === candidato);
    if (exacto) return exacto[1];
  }

  for (const candidato of candidatos) {
    const parcial = entradas.find(([clave]) => clave.toLowerCase().includes(candidato));
    if (parcial) return parcial[1];
  }

  return null;
}

function formatearValorReal(valor, decimales = 2) {
  if (valor == null || valor === "") return "--";
  const numero = Number(valor);
  if (!Number.isNaN(numero) && Number.isFinite(numero)) {
    return numero.toFixed(decimales);
  }
  return String(valor);
}

function formatearFechaReal(valor) {
  if (!valor) return "--";
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return String(valor);
  return fecha.toLocaleString("es-GT", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

/**
 * Actualiza datos reales de producción y embalse
 */
export function actualizarDatosEmbalse(datos) {
  const estado = document.getElementById("estadoEmbalseApi");
  const resumen = document.getElementById("embalseResumen");
  const cuerpoTabla = document.querySelector("#tablaEmbalseReal tbody");
  if (!resumen || !cuerpoTabla) return;

  const registros = normalizarRegistros(datos);
  const ultimo = registros[0] ?? {};

  const candidatosFecha = ["fechalectura", "fecha", "timestamp", "createdat", "created_at", "hora", "fecha"];
  const candidatosNivel = ["nivel", "embalse", "nivel"];
  const candidatosCaudal = ["qe", "caudalentrada", "caudal", "caudal", "entrada", "ingreso"];
  const candidatosQs = ["qs", "caudalsalida", "salida"];
  const candidatosQv = ["qv", "caudalvertido", "vertido", "vertedero"];
  const candidatosPotencia = ["potenciaactiva", "potencia_activa", "potencia", "pa", "mw"];
  const candidatosClima = ["clima", "weather", "condicion", "condición"];

  const ultimoNivel = buscarValor(ultimo, candidatosNivel);
  const ultimoCaudal = buscarValor(ultimo, candidatosCaudal);
  const ultimaPotencia = buscarValor(ultimo, candidatosPotencia);

  resumen.innerHTML = `
    <div class="dato-real">
      <div class="etiqueta-dato-real">Nivel</div>
      <div class="valor-dato-real">${formatearValorReal(ultimoNivel)} msnm</div>
    </div>
    <div class="dato-real">
      <div class="etiqueta-dato-real">QE</div>
      <div class="valor-dato-real">${formatearValorReal(ultimoCaudal)} m³/s</div>
    </div>
    <div class="dato-real">
      <div class="etiqueta-dato-real">Potencia activa</div>
      <div class="valor-dato-real">${formatearValorReal(ultimaPotencia)} MW</div>
    </div>
  `;

  cuerpoTabla.innerHTML = "";
  registros.forEach(registro => {
    const fila = document.createElement("tr");
    fila.innerHTML = `
      <td>${formatearFechaReal(buscarValor(registro, candidatosFecha))}</td>
      <td>${formatearValorReal(buscarValor(registro, candidatosNivel))}</td>
      <td>${formatearValorReal(buscarValor(registro, candidatosCaudal))}</td>
      <td>${formatearValorReal(buscarValor(registro, candidatosQs))}</td>
      <td>${formatearValorReal(buscarValor(registro, candidatosQv))}</td>
      <td>${formatearValorReal(buscarValor(registro, candidatosPotencia))}</td>
      <td>${formatearValorReal(buscarValor(registro, candidatosClima), 0)}</td>
    `;
    cuerpoTabla.appendChild(fila);
  });

  if (estado) estado.textContent = `${registros.length} registros`;
}

/**
 * Muestra estado de error para datos reales del embalse
 */
export function establecerEstadoEmbalse(texto) {
  const estado = document.getElementById("estadoEmbalseApi");
  if (estado) estado.textContent = texto;
}

/**
 * Actualiza estado del clima
 */
export function establecerEstadoClima(texto) {
  const elemento = document.getElementById("estadoClima");
  if (elemento) elemento.textContent = texto;
}

export function aplicarVista(vistaId) {
  const mapa = {
    proyeccion: "vistaProyeccion",
    guardadas: "vistaGuardadas",
    "datos-reales": "vistaDatosReales"
  };

  Object.entries(mapa).forEach(([id, elementoId]) => {
    document.getElementById(elementoId)?.classList.toggle("oculto", id !== vistaId);
  });

  document.querySelectorAll(".boton-vista").forEach(boton => {
    boton.classList.toggle("activo", boton.dataset.vista === vistaId);
  });
}

/**
 * Actualiza timestamp de última actualización
 */
export function establecerUltimaActualizacion() {
  const elemento = document.getElementById("ultimaActualizacion");
  if (!elemento) return;

  const ahora = new Date();
  const hora = ahora.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit"
  });

  elemento.textContent = `Última actualización: ${hora}`;
}

/**
 * Rellena la tabla de resultados
 */
function llenarTabla(selectorTabla, resultados) {
  const cuerpoTabla = document.querySelector(`${selectorTabla} tbody`);
  if (!cuerpoTabla) return;

  cuerpoTabla.innerHTML = "";

  resultados.forEach((r, indice) => {
    const fila = document.createElement("tr");
    fila.innerHTML = `
      <td>${String(r.de).padStart(2, "0")}:00</td>
      <td>${String(r.a).padStart(2, "0")}:00</td>
      <td class="celda-potencia-editable" data-columna="potencia" data-indice="${indice}" title="Doble click para editar">${r.potencia.toFixed(2)}</td>
      <td>${r.caudalSalida.toFixed(2)}</td>
      <td>${r.volumenTurbinado.toFixed(2)}</td>
      <td>${r.caudalIngreso.toFixed(2)}</td>
      <td>${r.nivel.toFixed(2)}</td>
      <td>${r.estado}</td>
    `;
    cuerpoTabla.appendChild(fila);
  });
}

export function llenarTablaResultados(resultados) {
  resultadosActuales = JSON.parse(JSON.stringify(resultados));
  llenarTabla("#tablaResultados", resultadosActuales);
}

export function llenarTablaProyeccionGuardada(resultados) {
  llenarTabla("#tablaProyeccionGuardada", resultados ?? []);
}

export function actualizarListaProyecciones(proyecciones, plantaNombre) {
  const estado = document.getElementById("estadoProyecciones");
  const lista = document.getElementById("listaProyecciones");
  if (!lista) return;

  lista.innerHTML = "";
  if (estado) estado.textContent = `${proyecciones.length} guardadas`;

  if (!proyecciones.length) {
    lista.innerHTML = `<div class="meta-item-proyeccion">No hay proyecciones guardadas para ${plantaNombre}.</div>`;
    return;
  }

  proyecciones.forEach(proyeccion => {
    const fecha = new Date(proyeccion.creadoEn).toLocaleString("es-GT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
    const boton = document.createElement("button");
    boton.type = "button";
    boton.className = "boton-proyeccion";
    boton.dataset.proyeccionId = proyeccion.id;
    boton.innerHTML = `
      <div class="titulo-item-proyeccion">
        <span>${fecha}</span>
        <span>${Number(proyeccion.nivelFinal).toFixed(2)} msnm</span>
      </div>
      <div class="meta-item-proyeccion">Nivel inicial ${Number(proyeccion.nivelInicial).toFixed(2)} | Potencia ${Number(proyeccion.potenciaGeneracion ?? proyeccion.potenciaElegida ?? 0).toFixed(1)} MW | ${proyeccion.horasProduccion} h producción</div>
    `;
    lista.appendChild(boton);
  });
}

export function actualizarDetalleProyeccion(proyeccion) {
  const titulo = document.getElementById("tituloProyeccionGuardada");
  const resumen = document.getElementById("resumenProyeccionGuardada");
  if (!titulo || !resumen) return;

  const fecha = new Date(proyeccion.creadoEn).toLocaleString("es-GT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
  titulo.textContent = `Proyección ${fecha}`;
  resumen.innerHTML = `
    <div class="dato-real">
      <div class="etiqueta-dato-real">Nivel inicial</div>
      <div class="valor-dato-real">${Number(proyeccion.nivelInicial).toFixed(2)} msnm</div>
    </div>
    <div class="dato-real">
      <div class="etiqueta-dato-real">Nivel final</div>
      <div class="valor-dato-real">${Number(proyeccion.resumen.nivelFinal).toFixed(2)} msnm</div>
    </div>
    <div class="dato-real">
      <div class="etiqueta-dato-real">Patrón QE</div>
      <div class="valor-dato-real">${proyeccion.fechaPatron ?? "--"}</div>
    </div>
    <div class="dato-real">
      <div class="etiqueta-dato-real">Potencia</div>
      <div class="valor-dato-real">${Number(proyeccion.potenciaGeneracion ?? proyeccion.resumen.potenciaElegida).toFixed(1)} MW</div>
    </div>
    <div class="dato-real">
      <div class="etiqueta-dato-real">Producción</div>
      <div class="valor-dato-real">${proyeccion.resumen.horasProduccion} horas</div>
    </div>
  `;
  llenarTablaProyeccionGuardada(proyeccion.resultados);
}

export function establecerEstadoProyecciones(texto) {
  const estado = document.getElementById("estadoProyecciones");
  if (estado) estado.textContent = texto;
}

/**
 * Desactiva botón y muestra estado de carga
 */
export function establecerBotonCargando(estaCargando) {
  const boton = document.getElementById("botonCalcular");
  if (!boton) return;

  boton.disabled = estaCargando;
  boton.textContent = estaCargando ? "Calculando..." : "Calcular";
}

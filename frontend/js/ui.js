/**
 * UI.JS - Gestión de interfaz de usuario
 * Maneja todas las actualizaciones del DOM y eventos
 */

import { UBICACION, CODIGOS_CLIMA, ICONOS_CLIMA, HORAS_OBLIGATORIAS } from './config.js';
import { evaluarEscenario, nivelAVolumen, redondear2 } from './calculator.js';

// ============================================
// ESTADO GLOBAL
// ============================================
let resultadosActuales = [];

/**
 * Obtiene los inputs del formulario
 */
export function obtenerEntradasFormulario() {
  const nivelInicial = parseFloat(document.getElementById("nivelInicial").value);
  const caudalBase = parseFloat(document.getElementById("caudalBase").value);
  return { nivelInicial, caudalBase };
}

/**
 * Valida que los inputs sean válidos
 */
export function validarEntradas() {
  const { nivelInicial, caudalBase } = obtenerEntradasFormulario();
  if (isNaN(nivelInicial)) return false;
  if (nivelInicial < 770 || nivelInicial > 778) return false;
  return true;
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
export function llenarTablaResultados(resultados) {
  resultadosActuales = JSON.parse(JSON.stringify(resultados));

  const cuerpoTabla = document.querySelector("#tablaResultados tbody");
  if (!cuerpoTabla) return;

  cuerpoTabla.innerHTML = "";

  resultadosActuales.forEach((r, indice) => {
    const fila = document.createElement("tr");
    fila.innerHTML = `
      <td>${String(r.de).padStart(2, "0")}:00</td>
      <td>${String(r.a).padStart(2, "0")}:00</td>
      <td class="editable" data-indice="${indice}" data-campo="potencia">${r.potencia.toFixed(2)}</td>
      <td>${r.caudalSalida.toFixed(2)}</td>
      <td>${r.volumenTurbinado.toFixed(2)}</td>
      <td class="editable" data-indice="${indice}" data-campo="caudalIngreso">${r.caudalIngreso.toFixed(2)}</td>
      <td>${r.nivel.toFixed(2)}</td>
      <td>${r.estado}</td>
    `;
    cuerpoTabla.appendChild(fila);
  });

  habilitarEdicionTabla();
}

/**
 * Habilita edición de celdas en la tabla
 */
function habilitarEdicionTabla() {
  const celdas = document.querySelectorAll(".editable");

  celdas.forEach(celda => {
    celda.ondblclick = function () {
      if (celda.querySelector("input")) return;

      const valorActual = celda.textContent.trim();
      const entrada = document.createElement("input");
      entrada.type = "number";
      entrada.step = "0.01";
      entrada.value = valorActual;
      entrada.style.width = "80px";

      celda.textContent = "";
      celda.appendChild(entrada);
      entrada.focus();
      entrada.select();

      function guardarCambio() {
        const nuevoValor = parseFloat(entrada.value);
        const indice = parseInt(celda.dataset.indice, 10);
        const campo = celda.dataset.campo;

        if (!isNaN(nuevoValor)) {
          resultadosActuales[indice][campo] = redondear2(nuevoValor);
          recalcularDesdeFila(indice);
        } else {
          llenarTablaResultados(resultadosActuales);
        }
      }

      entrada.addEventListener("blur", guardarCambio);
      entrada.addEventListener("keydown", function (e) {
        if (e.key === "Enter") guardarCambio();
        if (e.key === "Escape") llenarTablaResultados(resultadosActuales);
      });
    };
  });
}

/**
 * Recalcula resultados desde una fila específica
 */
export function recalcularDesdeFila(indiceInicial) {
  const { nivelInicial } = obtenerEntradasFormulario();

  for (let i = indiceInicial; i < resultadosActuales.length; i++) {
    const fila = resultadosActuales[i];
    const volumenAnterior = i === 0
      ? nivelAVolumen(nivelInicial)
      : resultadosActuales[i - 1].acumulado;

    const caudalEntrada = fila.caudalIngreso;
    const potenciaGenerada = fila.potencia;

    const escenario = evaluarEscenario(volumenAnterior, caudalEntrada, potenciaGenerada);

    let estado = "Apagada";
    if (HORAS_OBLIGATORIAS.horas.includes(fila.de) && potenciaGenerada === 0) {
      estado = "No viable";
    } else if (HORAS_OBLIGATORIAS.horas.includes(fila.de) && potenciaGenerada > 0) {
      estado = "Encendida obligatoria";
    } else if (potenciaGenerada >= 8.2) {
      estado = "Encendida";
    } else if (potenciaGenerada >= 4.2) {
      estado = "Encendida";
    }

    resultadosActuales[i] = {
      ...fila,
      caudalSalida: escenario.salida,
      volumenTurbinado: escenario.volumenTurbinado,
      volumenPorHora: escenario.volumenPorHora,
      diferencia: escenario.diferencia,
      acumulado: redondear2(escenario.volumenFinal),
      nivel: redondear2(escenario.nivelFinal),
      estado: estado
    };
  }

  llenarTablaResultados(resultadosActuales);
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

/**
 * UI.JS - Gestión de interfaz de usuario
 * Maneja todas las actualizaciones del DOM y eventos
 */

import { LOCATION, WEATHER_CODES, WEATHER_ICONS, MANDATORY_HOURS } from './config.js';
import { round2 } from './calculator.js';

// ============================================
// ESTADO GLOBAL
// ============================================
let currentResults = [];

/**
 * Obtiene los inputs del formulario
 */
export function getFormInputs() {
  const initialLevel = parseFloat(document.getElementById("nivelInicial").value);
  const baseFlow = parseFloat(document.getElementById("caudalBase").value);
  return { initialLevel, baseFlow };
}

/**
 * Valida que los inputs sean válidos
 */
export function validateInputs() {
  const { initialLevel, baseFlow } = getFormInputs();
  if (isNaN(initialLevel) || isNaN(baseFlow)) return false;
  if (initialLevel < 770 || initialLevel > 778) return false;
  return true;
}

/**
 * Convierte código de clima a descripción
 */
export function getWeatherDescription(code) {
  return WEATHER_CODES[code] ?? "Condición desconocida";
}

/**
 * Convierte código de clima a icono
 */
export function getWeatherIcon(code, isDay = true) {
  const iconSet = isDay ? WEATHER_ICONS.day : WEATHER_ICONS.night;

  if (code === 0) return iconSet.clear;
  if ([1, 2].includes(code)) return iconSet.partly;
  if (code === 3) return iconSet.cloudy;
  if ([45, 48].includes(code)) return iconSet.fog;
  if ([51, 53, 55, 56, 57].includes(code)) return iconSet.drizzle;
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return iconSet.rain;
  if ([71, 73, 75, 77, 85, 86].includes(code)) return iconSet.snow;
  if ([95, 96, 99].includes(code)) return iconSet.storm;

  return iconSet.cloudy;
}

/**
 * Convierte grados a dirección cardinal
 */
export function getWindDirection(degrees) {
  if (degrees == null || isNaN(degrees)) return "--";
  const directions = ["N", "NE", "E", "SE", "S", "SO", "O", "NO"];
  const idx = Math.round(degrees / 45) % 8;
  return directions[idx];
}

/**
 * Actualiza la tarjeta principal de clima
 */
export function updateHeroCard(currentWeather, dailyWeather) {
  document.getElementById("heroFecha").textContent = new Date().toLocaleDateString("es-GT", {
    weekday: "long",
    day: "2-digit",
    month: "long"
  });

  document.getElementById("heroTemp").textContent = `${Math.round(currentWeather.temperature_2m)}°`;
  document.getElementById("heroDesc").textContent = getWeatherDescription(currentWeather.weather_code);
  document.getElementById("heroMaxMin").textContent =
    `${Math.round(dailyWeather.temperature_2m_max[0])}° / ${Math.round(dailyWeather.temperature_2m_min[0])}°`;
  document.getElementById("heroIcon").textContent =
    getWeatherIcon(currentWeather.weather_code, currentWeather.is_day === 1);
}

/**
 * Actualiza el pronóstico de 24 horas
 */
export function updateHourlyForecast(hourlyWeather) {
  const container = document.getElementById("pronostico24h");
  if (!container) return;

  container.innerHTML = "";

  const { time, temperature, precipitation, weatherCode, isDay } = hourlyWeather;

  for (let i = 0; i < time.length; i++) {
    const dt = new Date(time[i]);
    const timeStr = dt.toLocaleTimeString("es-GT", {
      hour: "2-digit",
      minute: "2-digit"
    });

    const item = document.createElement("div");
    item.className = "hourly-item";
    item.innerHTML = `
      <div class="hourly-time">${timeStr}</div>
      <div class="hourly-icon">${getWeatherIcon(weatherCode[i], isDay[i] === 1)}</div>
      <div class="hourly-temp">${Math.round(temperature[i])}°</div>
      <div class="hourly-rain">${(precipitation[i] ?? 0).toFixed(1)} mm</div>
    `;

    container.appendChild(item);
  }
}

/**
 * Actualiza detalles de clima
 */
export function updateWeatherDetails(currentWeather, dailyWeather) {
  document.getElementById("detalleHumedad").textContent = `${Math.round(currentWeather.relative_humidity_2m)}%`;
  document.getElementById("detalleSensacion").textContent = `${Math.round(currentWeather.apparent_temperature)}°`;
  document.getElementById("detalleViento").textContent = `${round2(currentWeather.wind_speed_10m)} km/h`;
  document.getElementById("detalleDireccion").textContent = getWindDirection(currentWeather.wind_direction_10m);
  document.getElementById("detallePresion").textContent = `${Math.round(currentWeather.pressure_msl)}`;
  document.getElementById("detalleAmanecer").textContent =
    new Date(dailyWeather.sunrise[0]).toLocaleTimeString("es-GT", { hour: "2-digit", minute: "2-digit" });
  document.getElementById("detalleAtardecer").textContent =
    new Date(dailyWeather.sunset[0]).toLocaleTimeString("es-GT", { hour: "2-digit", minute: "2-digit" });
}

/**
 * Actualiza estado del clima
 */
export function setClimateStatus(text) {
  const element = document.getElementById("estadoClima");
  if (element) element.textContent = text;
}

/**
 * Actualiza timestamp de última actualización
 */
export function setLastUpdate() {
  const element = document.getElementById("ultimaActualizacion");
  if (!element) return;

  const now = new Date();
  const time = now.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit"
  });

  element.textContent = `Última actualización: ${time}`;
}

/**
 * Rellena la tabla de resultados
 */
export function fillResultsTable(results) {
  currentResults = JSON.parse(JSON.stringify(results));

  const tbody = document.querySelector("#tablaResultados tbody");
  if (!tbody) return;

  tbody.innerHTML = "";

  currentResults.forEach((r, index) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${String(r.de).padStart(2, "0")}:00</td>
      <td>${String(r.a).padStart(2, "0")}:00</td>
      <td class="editable" data-index="${index}" data-field="potencia">${r.potencia.toFixed(2)}</td>
      <td>${r.caudalSalida.toFixed(2)}</td>
      <td>${r.volumenTurbinado.toFixed(2)}</td>
      <td class="editable" data-index="${index}" data-field="caudalIngreso">${r.caudalIngreso.toFixed(2)}</td>
      <td>${r.volumenPorHora.toFixed(2)}</td>
      <td>${r.diferencia.toFixed(2)}</td>
      <td>${r.acumulado.toFixed(2)}</td>
      <td>${r.nivel.toFixed(2)}</td>
      <td>${r.estado}</td>
    `;
    tbody.appendChild(row);
  });

  enableTableEditing();
}

/**
 * Habilita edición de celdas en la tabla
 */
function enableTableEditing() {
  const cells = document.querySelectorAll(".editable");

  cells.forEach(cell => {
    cell.ondblclick = function () {
      if (cell.querySelector("input")) return;

      const currentValue = cell.textContent.trim();
      const input = document.createElement("input");
      input.type = "number";
      input.step = "0.01";
      input.value = currentValue;
      input.style.width = "80px";

      cell.textContent = "";
      cell.appendChild(input);
      input.focus();
      input.select();

      function saveChange() {
        const newValue = parseFloat(input.value);
        const index = parseInt(cell.dataset.index, 10);
        const field = cell.dataset.field;

        if (!isNaN(newValue)) {
          currentResults[index][field] = round2(newValue);
          recalculateFromRow(index);
        } else {
          fillResultsTable(currentResults);
        }
      }

      input.addEventListener("blur", saveChange);
      input.addEventListener("keydown", function (e) {
        if (e.key === "Enter") saveChange();
        if (e.key === "Escape") fillResultsTable(currentResults);
      });
    };
  });
}

/**
 * Recalcula resultados desde una fila específica
 */
export function recalculateFromRow(startIndex) {
  const { initialLevel } = getFormInputs();
  const { levelToVolume, evaluateScenario, round2: r2 } = window.calculatorModule;

  for (let i = startIndex; i < currentResults.length; i++) {
    const row = currentResults[i];
    const previousVolume = i === 0
      ? levelToVolume(initialLevel)
      : currentResults[i - 1].acumulado;

    const inflow = row.caudalIngreso;
    const power = row.potencia;

    const scenario = evaluateScenario(previousVolume, inflow, power);

    let status = "Apagada";
    if (MANDATORY_HOURS.hours.includes(row.de) && power === 0) {
      status = "No viable";
    } else if (MANDATORY_HOURS.hours.includes(row.de) && power > 0) {
      status = "Encendida obligatoria";
    } else if (power >= 8.2) {
      status = "Encendida continua (2 unidades)";
    } else if (power >= 4.2) {
      status = "Encendida continua (1 unidad)";
    }

    currentResults[i] = {
      ...row,
      caudalSalida: scenario.outflow,
      volumenTurbinado: scenario.turbinedVolume,
      volumenPorHora: scenario.volumePerHour,
      diferencia: scenario.difference,
      acumulado: r2(scenario.finalVolume),
      nivel: r2(scenario.finalLevel),
      estado: status
    };
  }

  fillResultsTable(currentResults);
}

/**
 * Desactiva botón y muestra estado de carga
 */
export function setButtonLoading(isLoading) {
  const btn = document.getElementById("btnCalcular");
  if (!btn) return;

  btn.disabled = isLoading;
  btn.textContent = isLoading ? "Calculando..." : "Calcular";
}

/**
 * MAIN.JS - Punto de entrada principal de la aplicación
 * Coordina API, cálculos e interfaz
 */

import { fetchClimateData, extractCurrentWeather, extractDailyWeather, extractHourlyWeather, extractRainfallData } from './api.js';
import { simulateDay, round2 } from './calculator.js';
import {
  getFormInputs,
  validateInputs,
  updateHeroCard,
  updateHourlyForecast,
  updateWeatherDetails,
  setClimateStatus,
  setLastUpdate,
  fillResultsTable,
  setButtonLoading
} from './ui.js';
import { MANDATORY_HOURS } from './config.js';

/**
 * Realiza la actualización completa del sistema
 */
async function updateEverything() {
  try {
    setClimateStatus("Clima: actualizando automáticamente...");
    const climateData = await fetchClimateData();
    await renderFromClimateData(climateData);
  } catch (error) {
    console.error('Error in automatic update:', error);
    setClimateStatus("Clima: no disponible, simulando sin lluvia");
    setLastUpdate();

    const rainfallData = Array(MANDATORY_HOURS.simulation).fill(0);
    if (!validateInputs()) return;

    const { initialLevel, baseFlow } = getFormInputs();
    const { resultados } = simulateDay(initialLevel, baseFlow, rainfallData);
    fillResultsTable(resultados);
  }
}

/**
 * Procesa datos de clima y renderiza todo
 */
async function renderFromClimateData(climateData) {
  const currentWeather = extractCurrentWeather(climateData);
  const dailyWeather = extractDailyWeather(climateData);
  const hourlyWeather = extractHourlyWeather(climateData);
  const rainfallData = extractRainfallData(climateData);

  // Actualizar UI de clima
  updateHeroCard(currentWeather, dailyWeather);
  updateHourlyForecast(hourlyWeather);
  updateWeatherDetails(currentWeather, dailyWeather);

  // Calcular total de lluvia
  const totalRainfall = round2(rainfallData.reduce((a, b) => a + b, 0));
  setClimateStatus(`Clima: datos cargados | lluvia total 24h = ${totalRainfall} mm`);
  setLastUpdate();

  // Ejecutar simulación si inputs son válidos
  if (!validateInputs()) return;

  const { initialLevel, baseFlow } = getFormInputs();
  const { resultados } = simulateDay(initialLevel, baseFlow, rainfallData);
  fillResultsTable(resultados);
}

/**
 * Cálculo manual iniciado por el usuario
 */
async function handleManualCalculation() {
  const { initialLevel, baseFlow } = getFormInputs();

  if (isNaN(initialLevel) || isNaN(baseFlow)) {
    alert("Ingresa valores numéricos válidos.");
    return;
  }

  if (initialLevel < 770 || initialLevel > 778) {
    alert("El nivel inicial debe estar entre 770 y 778 msnm.");
    return;
  }

  try {
    setButtonLoading(true);
    setClimateStatus("Clima: obteniendo datos reales...");

    const climateData = await fetchClimateData();
    await renderFromClimateData(climateData);
  } catch (error) {
    console.error('Error in manual calculation:', error);
    setClimateStatus("Clima: no disponible, simulando sin lluvia");

    const rainfallData = Array(MANDATORY_HOURS.simulation).fill(0);
    const { resultados } = simulateDay(initialLevel, baseFlow, rainfallData);
    fillResultsTable(resultados);
  } finally {
    setButtonLoading(false);
  }
}

/**
 * Inicializa la aplicación
 */
document.addEventListener("DOMContentLoaded", async () => {
  const calculateBtn = document.getElementById("btnCalcular");

  if (calculateBtn) {
    calculateBtn.addEventListener("click", handleManualCalculation);
  }

  // Actualización inicial
  await updateEverything();

  // Actualización automática cada 10 minutos
  setInterval(updateEverything, MANDATORY_HOURS.updateInterval);
});

/**
 * CALCULATOR.JS - Lógica de cálculos de caudales
 * Contiene toda la lógica matemática para las simulaciones
 */

import {
  VOLUME_TABLE,
  OPERATION_LEVELS,
  MANDATORY_HOURS,
  POWER,
  SIMULATION_PARAMS,
  INFLOW_PATTERN
} from './config.js';

const { minimum: MIN_LEVEL, start: START_LEVEL, overflow: OVERFLOW_LEVEL, maximum: MAX_LEVEL } = OPERATION_LEVELS;
const { hours: MANDATORY_HRS, simulation: SIMULATION_HOURS } = MANDATORY_HOURS;
const { unit1: POWER_UNIT1, unit2: POWER_UNIT2 } = POWER;

/**
 * Redondea a 2 decimales
 */
export function round2(value) {
  return Math.round(value * 100) / 100;
}

/**
 * Convierte nivel de agua (msnm) a volumen (m3)
 */
export function levelToVolume(level) {
  if (level <= VOLUME_TABLE[0][1]) return VOLUME_TABLE[0][0];
  if (level >= VOLUME_TABLE[VOLUME_TABLE.length - 1][1]) {
    return VOLUME_TABLE[VOLUME_TABLE.length - 1][0];
  }

  for (let i = 0; i < VOLUME_TABLE.length - 1; i++) {
    const [v1, h1] = VOLUME_TABLE[i];
    const [v2, h2] = VOLUME_TABLE[i + 1];

    if (level >= h1 && level <= h2) {
      return round2(v1 + ((level - h1) / (h2 - h1)) * (v2 - v1));
    }
  }

  return 0;
}

/**
 * Convierte volumen (m3) a nivel de agua (msnm)
 */
export function volumeToLevel(volume) {
  if (volume <= VOLUME_TABLE[0][0]) return VOLUME_TABLE[0][1];
  if (volume >= VOLUME_TABLE[VOLUME_TABLE.length - 1][0]) {
    return VOLUME_TABLE[VOLUME_TABLE.length - 1][1];
  }

  for (let i = 0; i < VOLUME_TABLE.length - 1; i++) {
    const [v1, h1] = VOLUME_TABLE[i];
    const [v2, h2] = VOLUME_TABLE[i + 1];

    if (volume >= v1 && volume <= v2) {
      return round2(h1 + ((volume - v1) / (v2 - v1)) * (h2 - h1));
    }
  }

  return 770;
}

/**
 * Calcula el caudal de salida basado en potencia
 */
export function calculateOutflowRate(power) {
  return round2(power / 2.69266667);
}

/**
 * Calcula el volumen turbinado en una hora
 */
export function calculateTurbinedVolume(outflowRate) {
  return round2(outflowRate * 3600);
}

/**
 * Calcula factor de clima basado en lluvia
 */
export function calculateClimateFactorByRain(rainfall) {
  if (rainfall >= 20) return 1.50;
  if (rainfall >= 10) return 1.30;
  if (rainfall >= 5) return 1.15;
  if (rainfall > 0) return 1.05;
  return 1.00;
}

/**
 * Genera caudales de entrada para 24 horas
 */
export function generateInflowPattern(baseFlow, rainfallData) {
  const averagePattern = INFLOW_PATTERN.reduce((a, b) => a + b, 0) / INFLOW_PATTERN.length;
  const inflowArray = [];

  for (let h = 0; h < SIMULATION_HOURS; h++) {
    const patternHour = INFLOW_PATTERN[h];
    const rainfall = rainfallData[h - 2] ?? 0;
    const climateFactor = calculateClimateFactorByRain(rainfall);
    const hourlyFactor = patternHour / averagePattern;
    const flow = baseFlow * hourlyFactor * climateFactor;
    inflowArray.push(round2(flow));
  }

  return inflowArray;
}

/**
 * Limita el volumen dentro de rangos válidos
 */
export function limitVolume(volume) {
  const min = VOLUME_TABLE[0][0];
  const max = VOLUME_TABLE[VOLUME_TABLE.length - 1][0];
  return Math.max(min, Math.min(max, round2(volume)));
}

/**
 * Evalúa un escenario de operación
 */
export function evaluateScenario(previousVolume, inflow, power) {
  const outflow = power > 0 ? calculateOutflowRate(power) : 0;
  const turbinedVolume = power > 0 ? calculateTurbinedVolume(outflow) : 0;
  const volumePerHour = round2(inflow * 3600);
  const difference = round2(volumePerHour - turbinedVolume);
  const finalVolume = limitVolume(previousVolume + difference);
  const finalLevel = volumeToLevel(finalVolume);

  return {
    power,
    outflow: round2(outflow),
    turbinedVolume: round2(turbinedVolume),
    volumePerHour,
    difference,
    finalVolume,
    finalLevel
  };
}

/**
 * Calcula el promedio de ingreso proyectado
 */
export function calculateProjectedAverageInflow(inflowArray, currentHour, hoursAhead = SIMULATION_PARAMS.projectionHours) {
  let sum = 0;
  let count = 0;

  for (let i = currentHour; i < Math.min(currentHour + hoursAhead, inflowArray.length); i++) {
    sum += inflowArray[i];
    count++;
  }

  return count > 0 ? round2(sum / count) : 0;
}

/**
 * Verifica si la reserva es viable para el bloque obligatorio
 */
export function isViableForMandatoryBlock(currentHour, volume, inflowArray) {
  let currentVolume = volume;

  for (let h = currentHour + 1; h < SIMULATION_HOURS; h++) {
    const inflow = inflowArray[h];
    const power = MANDATORY_HRS.includes(h) ? POWER_UNIT2 : 0;
    const scenario = evaluateScenario(currentVolume, inflow, power);
    currentVolume = scenario.finalVolume;

    if (scenario.finalLevel < MIN_LEVEL) {
      return false;
    }
  }

  return true;
}

/**
 * Ejecuta la simulación completa de 24 horas
 */
export function simulateDay(initialLevel, baseFlow, rainfallData) {
  const initialVolume = levelToVolume(initialLevel);
  const inflowArray = generateInflowPattern(baseFlow, rainfallData);

  let accumulatedVolume = initialVolume;
  let currentLevel = initialLevel;
  let isValidProduction = true;
  let productionHours = 0;
  let productionMode = 0;  // 0=off, 1=unit1, 2=unit2
  let hoursInMode = 0;

  const results = [];

  for (let h = 0; h < SIMULATION_HOURS; h++) {
    const fromHour = h;
    const toHour = (h + 1) % 24;
    const previousVolume = accumulatedVolume;
    const inflow = inflowArray[h];
    const isMandatory = MANDATORY_HRS.includes(h);
    const projectedAvgInflow = calculateProjectedAverageInflow(inflowArray, h, SIMULATION_PARAMS.projectionHours);

    // Evaluar escenarios
    const scenario0 = evaluateScenario(previousVolume, inflow, 0);
    const scenario1 = evaluateScenario(previousVolume, inflow, POWER_UNIT1);
    const scenario2 = evaluateScenario(previousVolume, inflow, POWER_UNIT2);

    let chosen = scenario0;
    let status = "Apagada";
    let newMode = productionMode;

    // LÓGICA DE OPERACIÓN
    if (isMandatory) {
      newMode = 2;
      if (scenario2.finalLevel < MIN_LEVEL) {
        chosen = scenario0;
        status = "No viable - Apagada";
        isValidProduction = false;
        newMode = 0;
      } else {
        chosen = scenario2;
        status = "Encendida obligatoria (2 unidades)";
        productionHours++;
      }
    } else {
      const afterMandatory = h > MANDATORY_HRS[MANDATORY_HRS.length - 1];
      const nearMandatory = h < MANDATORY_HRS[0] && (MANDATORY_HRS[0] - h) <= 1;

      if (afterMandatory) {
        const safeLevel = currentLevel >= (MIN_LEVEL + SIMULATION_PARAMS.postMandatoryMargin);
        const highInflow = projectedAvgInflow >= SIMULATION_PARAMS.highInflowThreshold;

        if (!safeLevel || !highInflow) {
          chosen = scenario0;
          status = "Apagada";
          newMode = 0;
        } else {
          // Lógica de operación post-obligatoria
          if (productionMode === 2) {
            if (scenario2.finalLevel >= MIN_LEVEL) {
              chosen = scenario2;
              status = "Encendida continua (2 unidades)";
              newMode = 2;
              productionHours++;
            } else if (scenario1.finalLevel >= MIN_LEVEL && hoursInMode >= POWER.minHoursUnit2) {
              chosen = scenario1;
              status = "Encendida continua (1 unidad)";
              newMode = 1;
              productionHours++;
            } else {
              chosen = scenario0;
              status = "Apagada";
              newMode = 0;
            }
          } else if (productionMode === 1) {
            if (hoursInMode >= POWER.minHoursBeforeUnit2 && scenario2.finalLevel >= MIN_LEVEL && currentLevel >= START_LEVEL) {
              chosen = scenario2;
              status = "Encendida continua (2 unidades)";
              newMode = 2;
              productionHours++;
            } else if (scenario1.finalLevel >= MIN_LEVEL) {
              chosen = scenario1;
              status = "Encendida continua (1 unidad)";
              newMode = 1;
              productionHours++;
            } else {
              chosen = scenario0;
              status = "Apagada";
              newMode = 0;
            }
          } else {
            if (scenario1.finalLevel >= MIN_LEVEL && currentLevel >= START_LEVEL) {
              chosen = scenario1;
              status = "Encendida continua (1 unidad)";
              newMode = 1;
              productionHours++;
            } else {
              chosen = scenario0;
              status = "Apagada";
              newMode = 0;
            }
          }
        }
      } else {
        // Lógica pre-obligatoria
        if (productionMode === 2) {
          const blockViableWith2 = isViableForMandatoryBlock(h, scenario2.finalVolume, inflowArray);

          if (nearMandatory) {
            if (scenario2.finalLevel >= MIN_LEVEL && blockViableWith2) {
              chosen = scenario2;
              status = "Encendida continua (2 unidades)";
              newMode = 2;
              productionHours++;
            } else {
              chosen = scenario0;
              status = "Apagada";
              newMode = 0;
            }
          } else {
            if (scenario2.finalLevel >= MIN_LEVEL && blockViableWith2) {
              chosen = scenario2;
              status = "Encendida continua (2 unidades)";
              newMode = 2;
              productionHours++;
            } else if (scenario1.finalLevel >= MIN_LEVEL && hoursInMode >= POWER.minHoursUnit2) {
              chosen = scenario1;
              status = "Encendida continua (1 unidad)";
              newMode = 1;
              productionHours++;
            } else {
              chosen = scenario0;
              status = "Apagada";
              newMode = 0;
            }
          }
        } else if (productionMode === 1) {
          const hoursUntilMandatory = MANDATORY_HRS[0] - h;
          const canUpgrade = hoursInMode >= POWER.minHoursBeforeUnit2 && 
                            (currentLevel >= START_LEVEL || (hoursUntilMandatory <= 1 && scenario2.finalLevel >= MIN_LEVEL));

          if (canUpgrade && scenario2.finalLevel >= MIN_LEVEL) {
            chosen = scenario2;
            status = "Encendida continua (2 unidades)";
            newMode = 2;
            productionHours++;
          } else if (scenario1.finalLevel >= MIN_LEVEL) {
            chosen = scenario1;
            status = "Encendida continua (1 unidad)";
            newMode = 1;
            productionHours++;
          } else {
            chosen = scenario0;
            status = "Apagada";
            newMode = 0;
          }
        } else {
          const blockViableWith2 = isViableForMandatoryBlock(h, scenario2.finalVolume, inflowArray);
          const blockViableWith1 = isViableForMandatoryBlock(h, scenario1.finalVolume, inflowArray);

          if (currentLevel >= OVERFLOW_LEVEL && scenario2.finalLevel >= MIN_LEVEL && blockViableWith2) {
            chosen = scenario2;
            status = "Encendida continua (2 unidades)";
            newMode = 2;
            productionHours++;
          } else if (currentLevel >= START_LEVEL && scenario1.finalLevel >= MIN_LEVEL && blockViableWith1) {
            chosen = scenario1;
            status = "Encendida continua (1 unidad)";
            newMode = 1;
            productionHours++;
          } else {
            chosen = scenario0;
            status = "Apagada";
            newMode = 0;
          }
        }
      }
    }

    accumulatedVolume = chosen.finalVolume;
    currentLevel = chosen.finalLevel;

    if (newMode === productionMode) {
      hoursInMode++;
    } else {
      hoursInMode = 1;
    }

    productionMode = newMode;

    results.push({
      de: fromHour,
      a: toHour,
      potencia: chosen.power,
      caudalSalida: chosen.outflow,
      volumenTurbinado: chosen.turbinedVolume,
      caudalIngreso: inflow,
      volumenPorHora: chosen.volumePerHour,
      diferencia: chosen.difference,
      acumulado: accumulatedVolume,
      nivel: currentLevel,
      estado: status
    });
  }

  return {
    resultados: results,
    resumen: {
      nivelInicial: initialLevel,
      volumenInicial: initialVolume,
      nivelFinal: results[results.length - 1].nivel,
      volumenFinal: results[results.length - 1].acumulado,
      nivelMinimo: Math.min(...results.map(r => r.nivel)),
      nivelMaximo: Math.max(...results.map(r => r.nivel)),
      potenciaElegida: POWER_UNIT2,
      horasProduccion: productionHours,
      produccionValida: isValidProduction
    }
  };
}

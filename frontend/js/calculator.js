/**
 * CALCULATOR.JS - Lógica de cálculos de caudales
 * Contiene toda la lógica matemática para las simulaciones
 */

import {
  tabla_volumen,
  niveles_operacion,
  horas_obligatorias,
  potencia,
  parametros_simulacion,
  AJUSTES_CAUDAL_NETO
} from './config.js';

const { minimo: NIVEL_MINIMO, inicio: NIVEL_INICIO, rebalse: NIVEL_REBALSE, maximo: NIVEL_MAXIMO } = niveles_operacion;
const { horas: HORAS_OBLIGATORIAS_LISTA, simulacion: HORAS_SIMULACION } = horas_obligatorias;
const potencia_unidad1 = potencia.unidad1;
const potencia_unidad2 = potencia.unidad2;
const OPCIONES_OBLIGATORIAS_COMBINADAS = Array.isArray(potencia.opcionesObligatoriasCombinadas) ? potencia.opcionesObligatoriasCombinadas.slice().sort((a,b)=>a-b) : [potencia_unidad1 + potencia_unidad2];
const potencia_dos_unidades = Math.min(potencia_unidad1 + potencia_unidad2, Math.max(...OPCIONES_OBLIGATORIAS_COMBINADAS));

function obtenerCantidadUnidadesPorPotencia(potenciaGenerada) {
  if (potenciaGenerada <= 0) return 0;
  return potenciaGenerada <= potencia_unidad1 ? 1 : 2;
}

/**
 * Redondea a 2 decimales
 */
export function redondear2(valor) {
  return Math.round(valor * 100) / 100;
}

/**
 * Convierte nivel de agua (msnm) a volumen (m3)
 */
export function nivelAVolumen(nivel) {
  if (nivel <= tabla_volumen[0][1]) return tabla_volumen[0][0];
  if (nivel >= tabla_volumen[tabla_volumen.length - 1][1]) {
    return tabla_volumen[tabla_volumen.length - 1][0];
  }

  for (let i = 0; i < tabla_volumen.length - 1; i++) {
    const [v1, h1] = tabla_volumen[i];
    const [v2, h2] = tabla_volumen[i + 1];

    if (nivel >= h1 && nivel <= h2) {
      return redondear2(v1 + ((nivel - h1) / (h2 - h1)) * (v2 - v1));
    }
  }

  return 0;
}

/**
 * Convierte volumen (m3) a nivel de agua (msnm)
 */
export function volumenANivel(volumen) {
  if (volumen <= tabla_volumen[0][0]) return tabla_volumen[0][1];
  if (volumen >= tabla_volumen[tabla_volumen.length - 1][0]) {
    return tabla_volumen[tabla_volumen.length - 1][1];
  }

  for (let i = 0; i < tabla_volumen.length - 1; i++) {
    const [v1, h1] = tabla_volumen[i];
    const [v2, h2] = tabla_volumen[i + 1];

    if (volumen >= v1 && volumen <= v2) {
      return redondear2(h1 + ((volumen - v1) / (v2 - v1)) * (h2 - h1));
    }
  }

  return 770;
}

/**
 * Calcula el caudal de salida basado en potencia
 */
export function calcularCaudalSalida(potenciaGenerada) {
  return redondear2(potenciaGenerada / 2.69266667);
}

/**
 * Calcula el volumen turbinado en una hora
 */
export function calcularVolumenTurbinado(caudalSalida) {
  return redondear2(caudalSalida * 3600);
}

/**
 * Calcula factor de clima basado en lluvia
 */
export function calcularFactorClimaPorLluvia(lluvia) {
  if (lluvia >= 20) return 1.50;
  if (lluvia >= 10) return 1.30;
  if (lluvia >= 5) return 1.15;
  if (lluvia > 0) return 1.05;
  return 1.00;
}

/**
 * Genera caudales de entrada para 24 horas
 */
export function generarPatronEntrada(caudalBase, datosLluvia, patronEntradaReal = null) {
  const arregloEntrada = [];

  for (let h = 0; h < HORAS_SIMULACION; h++) {
    const entradaReal = patronEntradaReal?.[h];
    if (!Number.isFinite(entradaReal)) {
      throw new Error(`Falta QE en base de datos para la hora ${String(h).padStart(2, "0")}:00.`);
    }

    const lluvia = datosLluvia[h - 2] ?? 0;
    const factorClima = calcularFactorClimaPorLluvia(lluvia);
    const ajuste = AJUSTES_CAUDAL_NETO[h] ?? 0;
    const caudal = (entradaReal * factorClima) + ajuste;
    arregloEntrada.push(redondear2(caudal));
  }

  return arregloEntrada;
}

/**
 * Limita el volumen dentro de rangos válidos
 */
export function limitarVolumen(volumen) {
  const min = tabla_volumen[0][0];
  const max = tabla_volumen[tabla_volumen.length - 1][0];
  return Math.max(min, Math.min(max, redondear2(volumen)));
}

/**
 * Evalúa un escenario de operación
 */
export function evaluarEscenario(volumenAnterior, caudalEntrada, potenciaGenerada) {
  const salida = potenciaGenerada > 0 ? calcularCaudalSalida(potenciaGenerada) : 0;
  const volumenTurbinado = salida > 0 ? calcularVolumenTurbinado(salida) : 0;
  const volumenPorHora = redondear2(caudalEntrada * 3600);
  const diferencia = redondear2(volumenPorHora - volumenTurbinado);
  const volumenFinal = limitarVolumen(volumenAnterior + diferencia);
  const nivelFinal = volumenANivel(volumenFinal);

  return {
    potenciaGenerada,
    salida: redondear2(salida),
    volumenTurbinado: redondear2(volumenTurbinado),
    volumenPorHora,
    diferencia,
    volumenFinal,
    nivelFinal
  };
}

/**
 * Calcula el promedio de ingreso proyectado
 */
export function calcularPromedioEntradaProyectada(arregloEntrada, horaActual, horasAdelante = parametros_simulacion.horasProyeccion) {
  let suma = 0;
  let conteo = 0;

  for (let i = horaActual; i < Math.min(horaActual + horasAdelante, arregloEntrada.length); i++) {
    suma += arregloEntrada[i];
    conteo++;
  }

  return conteo > 0 ? redondear2(suma / conteo) : 0;
}

/**
 * Verifica si la reserva es viable para el bloque obligatorio
 */
export function esViableParaBloqueObligatorio(horaActual, volumen, arregloEntrada) {
  let volumenActual = volumen;

  for (let h = horaActual + 1; h < HORAS_SIMULACION; h++) {
    const caudalEntrada = arregloEntrada[h];
    // Para evaluar la viabilidad del bloque obligatorio, asumimos el peor caso:
    // la mayor potencia combinada que podría requerirse durante horas obligatorias.
    const potenciaObligatoriaMaxima = Math.max(...OPCIONES_OBLIGATORIAS_COMBINADAS);
    const potenciaGenerada = HORAS_OBLIGATORIAS_LISTA.includes(h) ? potenciaObligatoriaMaxima : 0;
    const escenario = evaluarEscenario(volumenActual, caudalEntrada, potenciaGenerada);
    volumenActual = escenario.volumenFinal;

    if (escenario.nivelFinal < NIVEL_MINIMO) {
      return false;
    }
  }

  return true;
}

/**
 * Encuentra la máxima potencia constante viable para el bloque obligatorio completo
 * @param {number} volumenInicialBloque Volumen inicial para el bloque
 * @param {Array} arregloEntrada Array de caudales de entrada
 * @returns {number} La máxima potencia constante viable, o 0 si ninguna es viable
 */
export function encontrarPotenciaObligatoriaConstanteMaxima(volumenInicialBloque, arregloEntrada) {
  // Iterar de mayor a menor potencia
  for (let i = OPCIONES_OBLIGATORIAS_COMBINADAS.length - 1; i >= 0; i--) {
    const potenciaPrueba = OPCIONES_OBLIGATORIAS_COMBINADAS[i];
    let volumenActual = volumenInicialBloque;
    let esViable = true;

    // Simular todo el bloque obligatorio con esta potencia constante
    for (const horaObligatoria of HORAS_OBLIGATORIAS_LISTA) {
      const caudalEntrada = arregloEntrada[horaObligatoria];
      const escenario = evaluarEscenario(volumenActual, caudalEntrada, potenciaPrueba);
      
      if (escenario.nivelFinal < NIVEL_MINIMO) {
        esViable = false;
        break;
      }
      
      volumenActual = escenario.volumenFinal;
    }

    // Si esta potencia es viable para todo el bloque, retornarla
    if (esViable) {
      return potenciaPrueba;
    }
  }

  return 0; // Ninguna potencia es viable
}

/**
 * Ejecuta la simulación completa de 24 horas
 */
export function simularDia(nivelInicial, caudalBase, datosLluvia, patronEntradaReal = null) {
  const volumenInicial = nivelAVolumen(nivelInicial);
  const arregloEntrada = generarPatronEntrada(caudalBase, datosLluvia, patronEntradaReal);

  let volumenAcumulado = volumenInicial;
  let nivelActual = nivelInicial;
  let produccionValida = true;
  let horasProduccion = 0;
  let modoProduccion = 0;  // 0=off, 1=unidad1, 2=unidad2
  let horasEnModo = 0;
  
  // La potencia constante se calculará cuando se llegue a la primera hora obligatoria
  let potenciaObligatoriaConstante = null;

  const resultados = [];

  for (let h = 0; h < HORAS_SIMULACION; h++) {
    const horaDesde = h;
    const horaHasta = (h + 1) % 24;
    const volumenAnterior = volumenAcumulado;
    const caudalEntrada = arregloEntrada[h];
    const esObligatoria = HORAS_OBLIGATORIAS_LISTA.includes(h);
    const promedioEntradaProyectada = calcularPromedioEntradaProyectada(arregloEntrada, h, parametros_simulacion.horasProyeccion);

    // Evaluar escenarios
    const escenario0 = evaluarEscenario(volumenAnterior, caudalEntrada, 0);
    const escenario1 = evaluarEscenario(volumenAnterior, caudalEntrada, potencia_unidad1);
    const escenario2 = evaluarEscenario(volumenAnterior, caudalEntrada, potencia_dos_unidades);

    let elegido = escenario0;
    let estado = "Apagada";
    let nuevoModo = modoProduccion;

    // LÓGICA DE OPERACIÓN
    if (esObligatoria) {
      // Las horas obligatorias forman un bloque único de 18:00 a 22:00.
      // La potencia se mantiene constante durante las 4 horas.
      if (potenciaObligatoriaConstante === null) {
        potenciaObligatoriaConstante = encontrarPotenciaObligatoriaConstanteMaxima(volumenAnterior, arregloEntrada);
      }

      if (potenciaObligatoriaConstante > 0) {
        const escenarioObligatorioElegido = evaluarEscenario(volumenAnterior, caudalEntrada, potenciaObligatoriaConstante);
        const cantidadUnidades = obtenerCantidadUnidadesPorPotencia(escenarioObligatorioElegido.potenciaGenerada);
        elegido = escenarioObligatorioElegido;
        nuevoModo = cantidadUnidades;
        estado = "Encendida";
        horasProduccion++;
      } else {
        // Si ninguna potencia es viable, marcar no viable
        elegido = escenario0;
        estado = "No viable - Apagada";
        produccionValida = false;
        nuevoModo = 0;
      }
    } else {
      const despuesObligatoria = h > HORAS_OBLIGATORIAS_LISTA[HORAS_OBLIGATORIAS_LISTA.length - 1];
      const cercaObligatoria = h < HORAS_OBLIGATORIAS_LISTA[0] && (HORAS_OBLIGATORIAS_LISTA[0] - h) <= 1;

      if (despuesObligatoria) {
        const nivelSeguro = nivelActual >= (NIVEL_MINIMO + parametros_simulacion.margenPosteriorObligatorio);
        const caudalSuficiente = promedioEntradaProyectada >= parametros_simulacion.umbralCaudalAlto;

        if (nivelSeguro && caudalSuficiente && escenario2.nivelFinal >= NIVEL_MINIMO) {
          elegido = escenario2;
          estado = "Encendida";
          nuevoModo = 2;
          horasProduccion++;
        } else if (nivelSeguro && caudalSuficiente && escenario1.nivelFinal >= NIVEL_MINIMO) {
          elegido = escenario1;
          estado = "Encendida ";
          nuevoModo = 1;
          horasProduccion++;
        } else {
          elegido = escenario0;
          estado = "Apagada";
          nuevoModo = 0;
        }
      } else {
        // Lógica pre-obligatoria
        if (modoProduccion === 2) {
          const bloqueViableCon2 = esViableParaBloqueObligatorio(h, escenario2.volumenFinal, arregloEntrada);

          if (cercaObligatoria) {
            if (escenario2.nivelFinal >= NIVEL_MINIMO && bloqueViableCon2) {
              elegido = escenario2;
              estado = "Encendida continua (2 unidades)";
              nuevoModo = 2;
              horasProduccion++;
            } else {
              elegido = escenario0;
              estado = "Apagada";
              nuevoModo = 0;
            }
          } else {
            if (escenario2.nivelFinal >= NIVEL_MINIMO && bloqueViableCon2) {
              elegido = escenario2;
              estado = "Encendida continua (2 unidades)";
              nuevoModo = 2;
              horasProduccion++;
            } else if (escenario1.nivelFinal >= NIVEL_MINIMO && horasEnModo >= potencia.horasMinimasUnidad2) {
              elegido = escenario1;
              estado = "Encendida continua (1 unidad)";
              nuevoModo = 1;
              horasProduccion++;
            } else {
              elegido = escenario0;
              estado = "Apagada";
              nuevoModo = 0;
            }
          }
        } else if (modoProduccion === 1) {
          const horasHastaObligatoria = HORAS_OBLIGATORIAS_LISTA[0] - h;
          const puedeSubirUnidad = horasEnModo >= potencia.horasMinimasAntesUnidad2 && 
                            (nivelActual >= NIVEL_INICIO || (horasHastaObligatoria <= 1 && escenario2.nivelFinal >= NIVEL_MINIMO));

          if (puedeSubirUnidad && escenario2.nivelFinal >= NIVEL_MINIMO) {
            elegido = escenario2;
            estado = "Encendida continua (2 unidades)";
            nuevoModo = 2;
            horasProduccion++;
          } else if (escenario1.nivelFinal >= NIVEL_MINIMO) {
            elegido = escenario1;
            estado = "Encendida continua (1 unidad)";
            nuevoModo = 1;
            horasProduccion++;
          } else {
            elegido = escenario0;
            estado = "Apagada";
            nuevoModo = 0;
          }
        } else {
          const bloqueViableCon2 = esViableParaBloqueObligatorio(h, escenario2.volumenFinal, arregloEntrada);
          const bloqueViableCon1 = esViableParaBloqueObligatorio(h, escenario1.volumenFinal, arregloEntrada);

          if (nivelActual >= NIVEL_REBALSE && escenario2.nivelFinal >= NIVEL_MINIMO && bloqueViableCon2) {
            elegido = escenario2;
            estado = "Encendida continua (2 unidades)";
            nuevoModo = 2;
            horasProduccion++;
          } else if (nivelActual >= NIVEL_INICIO && escenario1.nivelFinal >= NIVEL_MINIMO && bloqueViableCon1) {
            elegido = escenario1;
            estado = "Encendida continua (1 unidad)";
            nuevoModo = 1;
            horasProduccion++;
          } else {
            elegido = escenario0;
            estado = "Apagada";
            nuevoModo = 0;
          }
        }
      }
    }

    volumenAcumulado = elegido.volumenFinal;
    nivelActual = elegido.nivelFinal;

    if (nuevoModo === modoProduccion) {
      horasEnModo++;
    } else {
      horasEnModo = 1;
    }

    modoProduccion = nuevoModo;

    resultados.push({
      de: horaDesde,
      a: horaHasta,
      potencia: elegido.potenciaGenerada,
      caudalSalida: elegido.salida,
      volumenTurbinado: elegido.volumenTurbinado,
      caudalIngreso: caudalEntrada,
      volumenPorHora: elegido.volumenPorHora,
      diferencia: elegido.diferencia,
      acumulado: volumenAcumulado,
      nivel: nivelActual,
      estado: estado
    });
  }

  return {
    resultados: resultados,
    resumen: {
      nivelInicial: nivelInicial,
      volumenInicial: volumenInicial,
      nivelFinal: resultados[resultados.length - 1].nivel,
      volumenFinal: resultados[resultados.length - 1].acumulado,
      nivelMinimo: Math.min(...resultados.map(r => r.nivel)),
      nivelMaximo: Math.max(...resultados.map(r => r.nivel)),
      potenciaElegida: potencia_dos_unidades,
      horasProduccion: horasProduccion,
      produccionValida: produccionValida
    }
  };
}

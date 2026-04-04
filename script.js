const LATITUD = 14.6349;
const LONGITUD = -90.5069;

const TABLA_VOL_NIVEL = [
  [0.00, 770.00],
  [2297.00, 770.50],
  [5167.70, 771.00],
  [8623.90, 771.50],
  [12769.60, 772.00],
  [17624.49, 772.50],
  [23241.57, 773.00],
  [29304.76, 773.50],
  [35764.33, 774.00],
  [42637.14, 774.50],
  [49924.80, 775.00],
  [57672.94, 775.50],
  [65881.95, 776.00],
  [74567.19, 776.50],
  [83801.42, 777.00],
  [93664.56, 777.50],
  [104784.00, 778.00]
];

const NIVEL_MINIMO_OPERATIVO = 773.50;
const NIVEL_REBALSE = 778.00;
const HORAS_OBLIGATORIAS = [18, 19, 20, 21];
const HORAS_SIMULACION = 24;
const INTERVALO_ACTUALIZACION_MS = 10 * 60 * 1000;

const PATRON_ENTRADA_REAL = [
  1.70, 1.55, 1.55, 1.75, 1.95, 2.10,
  2.15, 2.35, 2.25, 2.05, 2.15, 2.05,
  1.70, 1.95, 1.90, 1.95, 2.20, 2.10,
  1.55, 1.55, 1.55, 1.70, 1.95, 2.65
];

function round2(valor) {
  return Math.round(valor * 100) / 100;
}

function setEstadoClima(texto) {
  const estado = document.getElementById("estadoClima");
  if (estado) estado.textContent = texto;
}

function setUltimaActualizacion() {
  const el = document.getElementById("ultimaActualizacion");
  if (!el) return;

  const ahora = new Date();
  const hora = ahora.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit"
  });

  el.textContent = `Última actualización: ${hora}`;
}

function obtenerInputs() {
  const nivelInicial = parseFloat(document.getElementById("nivelInicial").value);
  const caudalBase = parseFloat(document.getElementById("caudalBase").value);
  return { nivelInicial, caudalBase };
}

function inputsValidos() {
  const { nivelInicial, caudalBase } = obtenerInputs();
  if (isNaN(nivelInicial) || isNaN(caudalBase)) return false;
  if (nivelInicial < 770 || nivelInicial > 778) return false;
  return true;
}

function direccionViento(grados) {
  if (grados == null || isNaN(grados)) return "--";
  const dirs = ["N", "NE", "E", "SE", "S", "SO", "O", "NO"];
  const idx = Math.round(grados / 45) % 8;
  return dirs[idx];
}

function descripcionWeatherCode(code) {
  const map = {
    0: "Despejado",
    1: "Mayormente despejado",
    2: "Parcialmente nublado",
    3: "Nublado",
    45: "Neblina",
    48: "Neblina con escarcha",
    51: "Llovizna ligera",
    53: "Llovizna",
    55: "Llovizna intensa",
    56: "Llovizna helada ligera",
    57: "Llovizna helada intensa",
    61: "Lluvia ligera",
    63: "Lluvia",
    65: "Lluvia intensa",
    66: "Lluvia helada ligera",
    67: "Lluvia helada intensa",
    71: "Nieve ligera",
    73: "Nieve",
    75: "Nieve intensa",
    77: "Granos de nieve",
    80: "Chubascos ligeros",
    81: "Chubascos",
    82: "Chubascos intensos",
    85: "Chubascos de nieve",
    86: "Chubascos de nieve intensos",
    95: "Tormenta",
    96: "Tormenta con granizo",
    99: "Tormenta fuerte con granizo"
  };
  return map[code] ?? "Condición desconocida";
}

function iconoWeather(code, isDay = true) {
  const day = {
    clear: "☀️",
    partly: "🌤️",
    cloudy: "☁️",
    fog: "🌫️",
    drizzle: "🌦️",
    rain: "🌧️",
    snow: "🌨️",
    storm: "⛈️"
  };

  const night = {
    clear: "🌙",
    partly: "🌙☁️",
    cloudy: "☁️",
    fog: "🌫️",
    drizzle: "🌦️",
    rain: "🌧️",
    snow: "🌨️",
    storm: "⛈️"
  };

  const set = isDay ? day : night;

  if (code === 0) return set.clear;
  if ([1, 2].includes(code)) return set.partly;
  if (code === 3) return set.cloudy;
  if ([45, 48].includes(code)) return set.fog;
  if ([51, 53, 55, 56, 57].includes(code)) return set.drizzle;
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return set.rain;
  if ([71, 73, 75, 77, 85, 86].includes(code)) return set.snow;
  if ([95, 96, 99].includes(code)) return set.storm;

  return set.cloudy;
}

async function obtenerDatosClima() {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${LATITUD}&longitude=${LONGITUD}&timezone=auto&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,pressure_msl,wind_speed_10m,wind_direction_10m&hourly=temperature_2m,precipitation,weather_code,is_day&daily=temperature_2m_max,temperature_2m_min,sunrise,sunset&forecast_days=1`;

  const resp = await fetch(url);
  if (!resp.ok) {
    throw new Error("No se pudo obtener el clima.");
  }
  return await resp.json();
}

function mostrarHero(data) {
  const current = data.current;
  const daily = data.daily;

  document.getElementById("heroFecha").textContent = new Date().toLocaleDateString("es-GT", {
    weekday: "long",
    day: "2-digit",
    month: "long"
  });

  document.getElementById("heroTemp").textContent = `${Math.round(current.temperature_2m)}°`;
  document.getElementById("heroDesc").textContent = descripcionWeatherCode(current.weather_code);
  document.getElementById("heroMaxMin").textContent =
    `${Math.round(daily.temperature_2m_max[0])}° / ${Math.round(daily.temperature_2m_min[0])}°`;
  document.getElementById("heroIcon").textContent =
    iconoWeather(current.weather_code, current.is_day === 1);
}

function mostrarPronostico24h(data) {
  const contenedor = document.getElementById("pronostico24h");
  contenedor.innerHTML = "";

  const horas = data.hourly.time.slice(0, HORAS_SIMULACION);
  const temps = data.hourly.temperature_2m.slice(0, HORAS_SIMULACION);
  const lluvias = data.hourly.precipitation.slice(0, HORAS_SIMULACION);
  const codes = data.hourly.weather_code.slice(0, HORAS_SIMULACION);
  const isDay = data.hourly.is_day.slice(0, HORAS_SIMULACION);

  for (let i = 0; i < horas.length; i++) {
    const dt = new Date(horas[i]);
    const horaTxt = dt.toLocaleTimeString("es-GT", {
      hour: "2-digit",
      minute: "2-digit"
    });

    const item = document.createElement("div");
    item.className = "hourly-item";

    item.innerHTML = `
      <div class="hourly-time">${horaTxt}</div>
      <div class="hourly-icon">${iconoWeather(codes[i], isDay[i] === 1)}</div>
      <div class="hourly-temp">${Math.round(temps[i])}°</div>
      <div class="hourly-rain">${(lluvias[i] ?? 0).toFixed(1)} mm</div>
    `;

    contenedor.appendChild(item);
  }
}

function mostrarDetalles(data) {
  const current = data.current;
  const daily = data.daily;

  document.getElementById("detalleHumedad").textContent = `${Math.round(current.relative_humidity_2m)}%`;
  document.getElementById("detalleSensacion").textContent = `${Math.round(current.apparent_temperature)}°`;
  document.getElementById("detalleViento").textContent = `${round2(current.wind_speed_10m)} km/h`;
  document.getElementById("detalleDireccion").textContent = direccionViento(current.wind_direction_10m);
  document.getElementById("detallePresion").textContent = `${Math.round(current.pressure_msl)}`;
  document.getElementById("detalleAmanecer").textContent =
    new Date(daily.sunrise[0]).toLocaleTimeString("es-GT", { hour: "2-digit", minute: "2-digit" });
  document.getElementById("detalleAtardecer").textContent =
    new Date(daily.sunset[0]).toLocaleTimeString("es-GT", { hour: "2-digit", minute: "2-digit" });
}

function calcularFactorClima(lluvia) {
  if (lluvia >= 20) return 1.50;
  if (lluvia >= 10) return 1.30;
  if (lluvia >= 5) return 1.15;
  if (lluvia > 0) return 1.05;
  return 1.00;
}

function nivelAVolumen(nivel) {
  if (nivel <= TABLA_VOL_NIVEL[0][1]) return TABLA_VOL_NIVEL[0][0];
  if (nivel >= TABLA_VOL_NIVEL[TABLA_VOL_NIVEL.length - 1][1]) {
    return TABLA_VOL_NIVEL[TABLA_VOL_NIVEL.length - 1][0];
  }

  for (let i = 0; i < TABLA_VOL_NIVEL.length - 1; i++) {
    const [v1, h1] = TABLA_VOL_NIVEL[i];
    const [v2, h2] = TABLA_VOL_NIVEL[i + 1];

    if (nivel >= h1 && nivel <= h2) {
      return round2(v1 + ((nivel - h1) / (h2 - h1)) * (v2 - v1));
    }
  }
  return 0;
}

function volumenANivel(volumen) {
  if (volumen <= TABLA_VOL_NIVEL[0][0]) return TABLA_VOL_NIVEL[0][1];
  if (volumen >= TABLA_VOL_NIVEL[TABLA_VOL_NIVEL.length - 1][0]) {
    return TABLA_VOL_NIVEL[TABLA_VOL_NIVEL.length - 1][1];
  }

  for (let i = 0; i < TABLA_VOL_NIVEL.length - 1; i++) {
    const [v1, h1] = TABLA_VOL_NIVEL[i];
    const [v2, h2] = TABLA_VOL_NIVEL[i + 1];

    if (volumen >= v1 && volumen <= v2) {
      return round2(h1 + ((volumen - v1) / (v2 - v1)) * (h2 - h1));
    }
  }
  return 770;
}

function calcularCaudalSalida(potencia) {
  return round2(potencia / 2.69266667);
}

function calcularVolumenTurbinado(caudalSalida) {
  return round2(caudalSalida * 3600);
}

function generarCaudales24h(caudalBase, lluvias) {
  const promedioPatron =
    PATRON_ENTRADA_REAL.reduce((a, b) => a + b, 0) / PATRON_ENTRADA_REAL.length;

  const resultado = [];

  for (let h = 0; h < HORAS_SIMULACION; h++) {
    const patronHora = PATRON_ENTRADA_REAL[h];
    const lluvia = lluvias[h - 2] ?? 0;
    const factorClima = calcularFactorClima(lluvia);
    const factorHorario = patronHora / promedioPatron;
    const caudal = caudalBase * factorHorario * factorClima;
    resultado.push(round2(caudal));
  }

  return resultado;
}

function simularDiaConPotencia(nivelInicial, caudalBase, potencia, lluvias) {
  const volumenInicial = nivelAVolumen(nivelInicial);
  const caudalesEntrada = generarCaudales24h(caudalBase, lluvias);

  let volumenAcumulado = volumenInicial;
  let nivelActual = nivelInicial;
  let produccionValida = true;
  let horasProducidas = 0;
  let produccionExtendida = false;

  const resultados = [];

  for (let h = 0; h < HORAS_SIMULACION; h++) {
    const horaDesde = h;
    const horaHasta = (h + 1) % 24;
    const acumuladoAnterior = volumenAcumulado;
    const qIngresoBaseHora = caudalesEntrada[h];
    const esHoraObligatoria = HORAS_OBLIGATORIAS.includes(h);

    let potenciaHora = 0.0;
    let caudalSalida = 0.0;
    let volumenTurbinado = 0.0;
    let qIngreso = qIngresoBaseHora;
    let volumenPorHora = 0.0;
    let diferencia = 0.0;
    let estado = "Apagada";

    if (nivelActual >= NIVEL_REBALSE) {
      produccionExtendida = true;
    }

    let debeProducir = false;
    if (esHoraObligatoria) debeProducir = true;
    else if (produccionExtendida && nivelActual > NIVEL_MINIMO_OPERATIVO) debeProducir = true;

    if (debeProducir) {
      potenciaHora = potencia;
      caudalSalida = calcularCaudalSalida(potenciaHora);
      volumenTurbinado = calcularVolumenTurbinado(caudalSalida);

      qIngreso = qIngresoBaseHora;
      volumenPorHora = round2(qIngreso * 3600);
      diferencia = round2(volumenPorHora - volumenTurbinado);

      let volumenPrueba = round2(acumuladoAnterior + diferencia);

      if (volumenPrueba < TABLA_VOL_NIVEL[0][0]) volumenPrueba = TABLA_VOL_NIVEL[0][0];
      if (volumenPrueba > TABLA_VOL_NIVEL[TABLA_VOL_NIVEL.length - 1][0]) {
        volumenPrueba = TABLA_VOL_NIVEL[TABLA_VOL_NIVEL.length - 1][0];
      }

      const nivelPrueba = volumenANivel(volumenPrueba);

      if (nivelPrueba < NIVEL_MINIMO_OPERATIVO) {
        if (esHoraObligatoria) {
          produccionValida = false;
          estado = "No viable";
          volumenAcumulado = volumenPrueba;
          nivelActual = nivelPrueba;
        } else {
          produccionExtendida = false;
          potenciaHora = 0.0;
          caudalSalida = 0.0;
          volumenTurbinado = 0.0;
          qIngreso = qIngresoBaseHora;
          volumenPorHora = round2(qIngreso * 3600);
          diferencia = round2(volumenPorHora);

          volumenAcumulado = round2(acumuladoAnterior + diferencia);
          if (volumenAcumulado < TABLA_VOL_NIVEL[0][0]) volumenAcumulado = TABLA_VOL_NIVEL[0][0];
          if (volumenAcumulado > TABLA_VOL_NIVEL[TABLA_VOL_NIVEL.length - 1][0]) {
            volumenAcumulado = TABLA_VOL_NIVEL[TABLA_VOL_NIVEL.length - 1][0];
          }

          nivelActual = volumenANivel(volumenAcumulado);
          estado = "Apagada";
        }
      } else {
        volumenAcumulado = volumenPrueba;
        nivelActual = nivelPrueba;
        horasProducidas++;
        estado = esHoraObligatoria ? "Encendida obligatoria" : "Encendida por rebalse";
      }
    } else {
      qIngreso = qIngresoBaseHora;
      volumenPorHora = round2(qIngreso * 3600);
      diferencia = round2(volumenPorHora);
      volumenAcumulado = round2(acumuladoAnterior + diferencia);

      if (volumenAcumulado < TABLA_VOL_NIVEL[0][0]) volumenAcumulado = TABLA_VOL_NIVEL[0][0];
      if (volumenAcumulado > TABLA_VOL_NIVEL[TABLA_VOL_NIVEL.length - 1][0]) {
        volumenAcumulado = TABLA_VOL_NIVEL[TABLA_VOL_NIVEL.length - 1][0];
      }

      nivelActual = volumenANivel(volumenAcumulado);
      estado = "Apagada";
    }

    if (nivelActual <= NIVEL_MINIMO_OPERATIVO && !esHoraObligatoria) {
      produccionExtendida = false;
    }

    resultados.push({
      de: horaDesde,
      a: horaHasta,
      potencia: potenciaHora,
      caudalSalida,
      volumenTurbinado,
      caudalIngreso: qIngreso,
      volumenPorHora,
      diferencia,
      acumulado: volumenAcumulado,
      nivel: nivelActual,
      estado
    });
  }

  const niveles = resultados.map(r => r.nivel);

  return {
    resultados,
    resumen: {
      nivelInicial,
      volumenInicial,
      nivelFinal: resultados[resultados.length - 1].nivel,
      volumenFinal: resultados[resultados.length - 1].acumulado,
      nivelMinimo: Math.min(...niveles),
      nivelMaximo: Math.max(...niveles),
      potenciaElegida: potencia,
      horasProduccion: horasProducidas,
      produccionValida
    }
  };
}

function simuladorEmbalse(nivelInicial, caudalBase, lluvias) {
  let mejorResultado = null;
  let mejorResumen = null;
  let mejorPotencia = 0.0;

  for (let potencia = 0.5; potencia <= 8.2; potencia = round2(potencia + 0.1)) {
    const intento = simularDiaConPotencia(nivelInicial, caudalBase, round2(potencia), lluvias);

    if (intento.resumen.produccionValida && potencia > mejorPotencia) {
      mejorPotencia = round2(potencia);
      mejorResultado = intento.resultados;
      mejorResumen = intento.resumen;
    }
  }

  if (mejorResultado === null) {
    return simularDiaConPotencia(nivelInicial, caudalBase, 0.0, lluvias);
  }

  return { resultados: mejorResultado, resumen: mejorResumen };
}

function llenarTabla(resultados) {
  const tbody = document.querySelector("#tablaResultados tbody");
  tbody.innerHTML = "";

  resultados.forEach(r => {
    const fila = document.createElement("tr");
    fila.innerHTML = `
      <td>${String(r.de).padStart(2, "0")}:00</td>
      <td>${String(r.a).padStart(2, "0")}:00</td>
      <td>${r.potencia.toFixed(2)}</td>
      <td>${r.caudalSalida.toFixed(2)}</td>
      <td>${r.volumenTurbinado.toFixed(2)}</td>
      <td>${r.caudalIngreso.toFixed(2)}</td>
      <td>${r.volumenPorHora.toFixed(2)}</td>
      <td>${r.diferencia.toFixed(2)}</td>
      <td>${r.acumulado.toFixed(2)}</td>
      <td>${r.nivel.toFixed(2)}</td>
      <td>${r.estado}</td>
    `;
    tbody.appendChild(fila);
  });
}

function mostrarResumen(resumen) {
  const resumenDiv = document.getElementById("resumen");
  const estadoTexto = resumen.produccionValida
    ? "Sí, se cumple la producción obligatoria y puede extenderse por rebalse dentro del día"
    : "No se puede cumplir la producción obligatoria";
  const estadoClase = resumen.produccionValida ? "ok" : "bad";

  resumenDiv.innerHTML = `
    <strong>Nivel inicial:</strong> ${resumen.nivelInicial.toFixed(2)} msnm<br>
    <strong>Volumen inicial:</strong> ${resumen.volumenInicial.toFixed(2)} m³<br>
    <strong>Potencia elegida automáticamente:</strong> ${resumen.potenciaElegida.toFixed(2)} MW<br>
    <strong>Horas totales producidas:</strong> ${resumen.horasProduccion}<br>
    <strong>Nivel final:</strong> ${resumen.nivelFinal.toFixed(2)} msnm<br>
    <strong>Volumen final:</strong> ${resumen.volumenFinal.toFixed(2)} m³<br>
    <strong>Nivel mínimo:</strong> ${resumen.nivelMinimo.toFixed(2)} msnm<br>
    <strong>Nivel máximo:</strong> ${resumen.nivelMaximo.toFixed(2)} msnm<br>
  `;
}

async function renderizarTodoDesdeClima(data) {
  const lluvias = data.hourly.precipitation.slice(0, HORAS_SIMULACION);

  while (lluvias.length < HORAS_SIMULACION) {
    lluvias.push(0);
  }

  mostrarHero(data);
  mostrarPronostico24h(data);
  mostrarDetalles(data);

  const lluviaTotal = round2(lluvias.reduce((a, b) => a + b, 0));
  setEstadoClima(`Clima: datos cargados | lluvia total 24h = ${lluviaTotal} mm`);
  setUltimaActualizacion();

  if (!inputsValidos()) return;

  const { nivelInicial, caudalBase } = obtenerInputs();
  const { resultados, resumen } = simuladorEmbalse(nivelInicial, caudalBase, lluvias);
  llenarTabla(resultados);
  mostrarResumen(resumen);
}

async function actualizarTodoAutomaticamente() {
  try {
    setEstadoClima("Clima: actualizando automáticamente...");
    const data = await obtenerDatosClima();
    await renderizarTodoDesdeClima(data);
  } catch (error) {
    console.error(error);
    setEstadoClima("Clima: no disponible, simulando sin lluvia");
    setUltimaActualizacion();

    const lluvias = Array(HORAS_SIMULACION).fill(0);

    if (!inputsValidos()) return;
    const { nivelInicial, caudalBase } = obtenerInputs();
    const { resultados, resumen } = simuladorEmbalse(nivelInicial, caudalBase, lluvias);
    llenarTabla(resultados);
    mostrarResumen(resumen);
  }
}

async function calcularManual() {
  const btn = document.getElementById("btnCalcular");
  const { nivelInicial, caudalBase } = obtenerInputs();

  if (isNaN(nivelInicial) || isNaN(caudalBase)) {
    alert("Ingresa valores numéricos válidos.");
    return;
  }

  if (nivelInicial < 770 || nivelInicial > 778) {
    alert("El nivel inicial debe estar entre 770 y 778 msnm.");
    return;
  }

  try {
    btn.disabled = true;
    btn.textContent = "Calculando...";
    setEstadoClima("Clima: obteniendo datos reales...");
    const data = await obtenerDatosClima();
    await renderizarTodoDesdeClima(data);
  } catch (error) {
    console.error(error);
    setEstadoClima("Clima: no disponible, simulando sin lluvia");
    const lluvias = Array(HORAS_SIMULACION).fill(0);
    const { resultados, resumen } = simuladorEmbalse(nivelInicial, caudalBase, lluvias);
    llenarTabla(resultados);
    mostrarResumen(resumen);
  } finally {
    btn.disabled = false;
    btn.textContent = "Calcular";
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  const btn = document.getElementById("btnCalcular");
  const nivelInput = document.getElementById("nivelInicial");
  const caudalInput = document.getElementById("caudalBase");

  btn.addEventListener("click", calcularManual);

  await actualizarTodoAutomaticamente();
  setInterval(actualizarTodoAutomaticamente, INTERVALO_ACTUALIZACION_MS);
});
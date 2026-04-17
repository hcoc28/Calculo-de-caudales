const LATITUD = 15.14375;
const LONGITUD = -90.07007;

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
const NIVEL_REBALSE_OPERATIVO = 777.50;
const NIVEL_REBALSE_REAL = 777.75;
const NIVEL_MAXIMO_EMBALSE = 778.00;

const HORAS_OBLIGATORIAS = [18, 19, 20, 21];
const HORAS_SIMULACION = 24;
const INTERVALO_ACTUALIZACION_MS = 10 * 60 * 1000;

const POTENCIA_MINIMA_GENERACION = 4.2; // 1 unidad
const POTENCIA_MAXIMA_GENERACION = 8.2; // 2 unidades

const PATRON_ENTRADA_REAL = [
  1.70, 1.55, 1.55, 1.75, 1.95, 2.10,
  2.15, 2.35, 2.25, 2.05, 2.15, 2.05,
  1.70, 1.95, 1.90, 1.95, 2.20, 2.10,
  1.55, 1.55, 1.55, 1.70, 1.95, 2.65
];

let resultadosActuales = [];

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
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${LATITUD}&longitude=${LONGITUD}` +
    `&timezone=auto` +
    `&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,pressure_msl,wind_speed_10m,wind_direction_10m` +
    `&hourly=temperature_2m,precipitation,weather_code,is_day` +
    `&daily=temperature_2m_max,temperature_2m_min,sunrise,sunset` +
    `&forecast_days=1`;

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
  if (!contenedor) return;

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

function limitarVolumen(volumen) {
  const min = TABLA_VOL_NIVEL[0][0];
  const max = TABLA_VOL_NIVEL[TABLA_VOL_NIVEL.length - 1][0];
  return Math.max(min, Math.min(max, round2(volumen)));
}

function evaluarEscenario(acumuladoAnterior, qIngreso, potencia) {
  const caudalSalida = potencia > 0 ? calcularCaudalSalida(potencia) : 0;
  const volumenTurbinado = potencia > 0 ? calcularVolumenTurbinado(caudalSalida) : 0;
  const volumenPorHora = round2(qIngreso * 3600);
  const diferencia = round2(volumenPorHora - volumenTurbinado);
  const volumenFinal = limitarVolumen(acumuladoAnterior + diferencia);
  const nivelFinal = volumenANivel(volumenFinal);

  return {
    potencia,
    caudalSalida: round2(caudalSalida),
    volumenTurbinado: round2(volumenTurbinado),
    volumenPorHora,
    diferencia,
    volumenFinal,
    nivelFinal
  };
}

function reservaBloqueObligatorioViable(horaActual, volumenInicial, caudalesEntrada) {
  let volumen = volumenInicial;

  for (let h = horaActual + 1; h < HORAS_SIMULACION; h++) {
    const qIngreso = caudalesEntrada[h];
    const esHoraObligatoria = HORAS_OBLIGATORIAS.includes(h);

    let potencia = 0;
    if (esHoraObligatoria) {
      potencia = POTENCIA_MAXIMA_GENERACION;
    }

    const escenario = evaluarEscenario(volumen, qIngreso, potencia);
    volumen = escenario.volumenFinal;

    if (escenario.nivelFinal < NIVEL_MINIMO_OPERATIVO) {
      return false;
    }
  }

  return true;
}

function simularDiaConPotencia(nivelInicial, caudalBase, _potencia, lluvias) {
  const volumenInicial = nivelAVolumen(nivelInicial);
  const caudalesEntrada = generarCaudales24h(caudalBase, lluvias);

  let volumenAcumulado = volumenInicial;
  let nivelActual = nivelInicial;
  let produccionValida = true;
  let horasProducidas = 0;

  // 0 = apagada, 1 = una unidad, 2 = dos unidades
  let modoProduccion = 0;

  const resultados = [];

  for (let h = 0; h < HORAS_SIMULACION; h++) {
    const horaDesde = h;
    const horaHasta = (h + 1) % 24;
    const acumuladoAnterior = volumenAcumulado;
    const qIngreso = caudalesEntrada[h];
    const esHoraObligatoria = HORAS_OBLIGATORIAS.includes(h);

    const escenario0 = evaluarEscenario(acumuladoAnterior, qIngreso, 0);
    const escenario1 = evaluarEscenario(acumuladoAnterior, qIngreso, POTENCIA_MINIMA_GENERACION);
    const escenario2 = evaluarEscenario(acumuladoAnterior, qIngreso, POTENCIA_MAXIMA_GENERACION);

    let elegido = escenario0;
    let estado = "Apagada";

    if (esHoraObligatoria) {
      modoProduccion = 2;

      if (escenario2.nivelFinal < NIVEL_MINIMO_OPERATIVO) {
        elegido = escenario0;
        estado = "No viable - Apagada";
        produccionValida = false;
      } else {
        elegido = escenario2;
        estado = "Encendida obligatoria (2 unidades)";
        horasProducidas++;
      }
    } else {
      if (modoProduccion === 2) {
        const bloqueOkConDos = reservaBloqueObligatorioViable(h, escenario2.volumenFinal, caudalesEntrada);

        if (escenario2.nivelFinal >= NIVEL_MINIMO_OPERATIVO && bloqueOkConDos) {
          elegido = escenario2;
          estado = "Encendida continua (2 unidades)";
          horasProducidas++;
        } else {
          if (escenario1.nivelFinal >= NIVEL_MINIMO_OPERATIVO) {
            modoProduccion = 1;
            elegido = escenario1;
            estado = "Encendida continua (1 unidad)";
            horasProducidas++;
          } else {
            modoProduccion = 0;
            elegido = escenario0;
            estado = "Apagada";
          }
        }
      } else if (modoProduccion === 1) {
        const faltanParaObligatoria = HORAS_OBLIGATORIAS[0] - h;
        const subirADos =
          nivelActual >= NIVEL_REBALSE_OPERATIVO ||
          (faltanParaObligatoria <= 1 && escenario2.nivelFinal >= NIVEL_MINIMO_OPERATIVO);

        if (subirADos && escenario2.nivelFinal >= NIVEL_MINIMO_OPERATIVO) {
          modoProduccion = 2;
          elegido = escenario2;
          estado = "Encendida continua (2 unidades)";
          horasProducidas++;
        } else if (escenario1.nivelFinal >= NIVEL_MINIMO_OPERATIVO) {
          elegido = escenario1;
          estado = "Encendida continua (1 unidad)";
          horasProducidas++;
        } else {
          modoProduccion = 0;
          elegido = escenario0;
          estado = "Apagada";
        }
      } else {
        const bloqueOkConDos = reservaBloqueObligatorioViable(h, escenario2.volumenFinal, caudalesEntrada);
        const bloqueOkConUna = reservaBloqueObligatorioViable(h, escenario1.volumenFinal, caudalesEntrada);

        if (
          nivelActual >= NIVEL_REBALSE_REAL &&
          escenario2.nivelFinal >= NIVEL_MINIMO_OPERATIVO &&
          bloqueOkConDos
        ) {
          modoProduccion = 2;
          elegido = escenario2;
          estado = "Encendida continua (2 unidades)";
          horasProducidas++;
        } else if (
          nivelActual >= NIVEL_REBALSE_OPERATIVO &&
          escenario1.nivelFinal >= NIVEL_MINIMO_OPERATIVO &&
          bloqueOkConUna
        ) {
          modoProduccion = 1;
          elegido = escenario1;
          estado = "Encendida continua (1 unidad)";
          horasProducidas++;
        } else {
          elegido = escenario0;
          estado = "Apagada";
        }
      }
    }

    volumenAcumulado = elegido.volumenFinal;
    nivelActual = elegido.nivelFinal;

    resultados.push({
      de: horaDesde,
      a: horaHasta,
      potencia: elegido.potencia,
      caudalSalida: elegido.caudalSalida,
      volumenTurbinado: elegido.volumenTurbinado,
      caudalIngreso: qIngreso,
      volumenPorHora: elegido.volumenPorHora,
      diferencia: elegido.diferencia,
      acumulado: volumenAcumulado,
      nivel: nivelActual,
      estado
    });
  }

  return {
    resultados,
    resumen: {
      nivelInicial,
      volumenInicial,
      nivelFinal: resultados[resultados.length - 1].nivel,
      volumenFinal: resultados[resultados.length - 1].acumulado,
      nivelMinimo: Math.min(...resultados.map(r => r.nivel)),
      nivelMaximo: Math.max(...resultados.map(r => r.nivel)),
      potenciaElegida: POTENCIA_MAXIMA_GENERACION,
      horasProduccion: horasProducidas,
      produccionValida
    }
  };
}

function simuladorEmbalse(nivelInicial, caudalBase, lluvias) {
  return simularDiaConPotencia(nivelInicial, caudalBase, 0, lluvias);
}

function llenarTabla(resultados) {
  resultadosActuales = JSON.parse(JSON.stringify(resultados));

  const tbody = document.querySelector("#tablaResultados tbody");
  if (!tbody) return;

  tbody.innerHTML = "";

  resultadosActuales.forEach((r, index) => {
    const fila = document.createElement("tr");

    fila.innerHTML = `
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

    tbody.appendChild(fila);
  });

  activarEdicionTabla();
}

function activarEdicionTabla() {
  const celdas = document.querySelectorAll(".editable");

  celdas.forEach(celda => {
    celda.ondblclick = function () {
      if (celda.querySelector("input")) return;

      const valorActual = celda.textContent.trim();
      const input = document.createElement("input");
      input.type = "number";
      input.step = "0.01";
      input.value = valorActual;
      input.style.width = "80px";

      celda.textContent = "";
      celda.appendChild(input);
      input.focus();
      input.select();

      function guardarCambio() {
        const nuevoValor = parseFloat(input.value);
        const index = parseInt(celda.dataset.index, 10);
        const field = celda.dataset.field;

        if (!isNaN(nuevoValor)) {
          resultadosActuales[index][field] = round2(nuevoValor);
          recalcularDesdeFila(index);
        } else {
          llenarTabla(resultadosActuales);
        }
      }

      input.addEventListener("blur", guardarCambio);

      input.addEventListener("keydown", function (e) {
        if (e.key === "Enter") guardarCambio();
        if (e.key === "Escape") llenarTabla(resultadosActuales);
      });
    };
  });
}

function recalcularDesdeFila(inicio) {
  for (let i = inicio; i < resultadosActuales.length; i++) {
    const fila = resultadosActuales[i];

    const acumuladoAnterior = i === 0
      ? nivelAVolumen(obtenerInputs().nivelInicial)
      : resultadosActuales[i - 1].acumulado;

    const qIngreso = fila.caudalIngreso;
    const potencia = fila.potencia;

    const escenario = evaluarEscenario(acumuladoAnterior, qIngreso, potencia);

    let estado = "Apagada";
    if (HORAS_OBLIGATORIAS.includes(fila.de) && potencia === 0) {
      estado = "No viable";
    } else if (HORAS_OBLIGATORIAS.includes(fila.de) && potencia > 0) {
      estado = "Encendida obligatoria";
    } else if (potencia >= POTENCIA_MAXIMA_GENERACION) {
      estado = "Encendida continua (2 unidades)";
    } else if (potencia >= POTENCIA_MINIMA_GENERACION) {
      estado = "Encendida continua (1 unidad)";
    }

    resultadosActuales[i] = {
      ...fila,
      caudalSalida: escenario.caudalSalida,
      volumenTurbinado: escenario.volumenTurbinado,
      volumenPorHora: escenario.volumenPorHora,
      diferencia: escenario.diferencia,
      acumulado: round2(escenario.volumenFinal),
      nivel: round2(escenario.nivelFinal),
      estado
    };
  }

  llenarTabla(resultadosActuales);
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
  const { resultados } = simuladorEmbalse(nivelInicial, caudalBase, lluvias);
  llenarTabla(resultados);
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
    const { resultados } = simuladorEmbalse(nivelInicial, caudalBase, lluvias);
    llenarTabla(resultados);
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
    if (btn) {
      btn.disabled = true;
      btn.textContent = "Calculando...";
    }

    setEstadoClima("Clima: obteniendo datos reales...");
    const data = await obtenerDatosClima();
    await renderizarTodoDesdeClima(data);
  } catch (error) {
    console.error(error);
    setEstadoClima("Clima: no disponible, simulando sin lluvia");

    const lluvias = Array(HORAS_SIMULACION).fill(0);
    const { resultados } = simuladorEmbalse(nivelInicial, caudalBase, lluvias);
    llenarTabla(resultados);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = "Calcular";
    }
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  const btn = document.getElementById("btnCalcular");

  if (btn) {
    btn.addEventListener("click", calcularManual);
  }

  await actualizarTodoAutomaticamente();
  setInterval(actualizarTodoAutomaticamente, INTERVALO_ACTUALIZACION_MS);
});
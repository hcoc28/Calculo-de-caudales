const LATITUD = 15.14375;
const LONGITUD = -90.07007;

const Tabla_volumen = [
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

const Nivel_minimo = 773.50;
const Nivel_inicio = 777.50;
const Nivel_rebalse = 777.75;
const Nivel_embalse = 778.00;

const Horas_obligatorias = [18, 19, 20, 21];
const Simulacion = 24;
const Intervalo_actualizacion = 10 * 60 * 1000;

const Potencia_una_unidad = 4.2;
const Potencia_dos_unidades = 8.2;

const HORAS_MIN_ANTES_DE_SUBIR_A_DOS = 2;
const HORAS_MIN_EN_UNA_UNIDAD = 2;
const HORAS_MIN_EN_DOS_UNIDADES = 2;

const UMBRAL_INGRESO_ALTO = 1.80; // m3/s
const MARGEN_NIVEL_POST_OBLIGATORIO = 0.20; // msnm
const HORAS_PROYECCION_INGRESO = 3;

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

  const horas = data.hourly.time.slice(0, Simulacion);
  const temps = data.hourly.temperature_2m.slice(0, Simulacion);
  const lluvias = data.hourly.precipitation.slice(0, Simulacion);
  const codes = data.hourly.weather_code.slice(0, Simulacion);
  const isDay = data.hourly.is_day.slice(0, Simulacion);

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
  if (nivel <= Tabla_volumen[0][1]) return Tabla_volumen[0][0];
  if (nivel >= Tabla_volumen[Tabla_volumen.length - 1][1]) {
    return Tabla_volumen[Tabla_volumen.length - 1][0];
  }

  for (let i = 0; i < Tabla_volumen.length - 1; i++) {
    const [v1, h1] = Tabla_volumen[i];
    const [v2, h2] = Tabla_volumen[i + 1];

    if (nivel >= h1 && nivel <= h2) {
      return round2(v1 + ((nivel - h1) / (h2 - h1)) * (v2 - v1));
    }
  }

  return 0;
}

function volumenANivel(volumen) {
  if (volumen <= Tabla_volumen[0][0]) return Tabla_volumen[0][1];
  if (volumen >= Tabla_volumen[Tabla_volumen.length - 1][0]) {
    return Tabla_volumen[Tabla_volumen.length - 1][1];
  }

  for (let i = 0; i < Tabla_volumen.length - 1; i++) {
    const [v1, h1] = Tabla_volumen[i];
    const [v2, h2] = Tabla_volumen[i + 1];

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

  for (let h = 0; h < Simulacion; h++) {
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
  const min = Tabla_volumen[0][0];
  const max = Tabla_volumen[Tabla_volumen.length - 1][0];
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

function promedioIngresoProyectado(caudalesEntrada, horaActual, cantidadHoras = HORAS_PROYECCION_INGRESO) {
  let suma = 0;
  let conteo = 0;

  for (let i = horaActual; i < Math.min(horaActual + cantidadHoras, caudalesEntrada.length); i++) {
    suma += caudalesEntrada[i];
    conteo++;
  }

  return conteo > 0 ? round2(suma / conteo) : 0;
}

function yaPasaronHorasObligatorias(hora) {
  return hora > Horas_obligatorias[Horas_obligatorias.length - 1];
}

function faltaPocoParaHorasObligatorias(hora) {
  return hora < Horas_obligatorias[0] && (Horas_obligatorias[0] - hora) <= 1;
}

function reservaBloqueObligatorioViable(horaActual, volumenInicial, caudalesEntrada) {
  let volumen = volumenInicial;

  for (let h = horaActual + 1; h < Simulacion; h++) {
    const qIngreso = caudalesEntrada[h];
    const esHoraObligatoria = Horas_obligatorias.includes(h);

    let potencia = 0;
    if (esHoraObligatoria) {
      potencia = Potencia_dos_unidades;
    }

    const escenario = evaluarEscenario(volumen, qIngreso, potencia);
    volumen = escenario.volumenFinal;

    if (escenario.nivelFinal < Nivel_minimo) {
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
  let horasEnModoActual = 0;

  const resultados = [];

  for (let h = 0; h < Simulacion; h++) {
    const horaDesde = h;
    const horaHasta = (h + 1) % 24;
    const acumuladoAnterior = volumenAcumulado;
    const qIngreso = caudalesEntrada[h];
    const esHoraObligatoria = Horas_obligatorias.includes(h);
    const ingresoPromedioProyectado = promedioIngresoProyectado(caudalesEntrada, h, HORAS_PROYECCION_INGRESO);

    const escenario0 = evaluarEscenario(acumuladoAnterior, qIngreso, 0);
    const escenario1 = evaluarEscenario(acumuladoAnterior, qIngreso, Potencia_una_unidad);
    const escenario2 = evaluarEscenario(acumuladoAnterior, qIngreso, Potencia_dos_unidades);

    let elegido = escenario0;
    let estado = "Apagada";
    let nuevoModo = modoProduccion;

    if (esHoraObligatoria) {
      nuevoModo = 2;

      if (escenario2.nivelFinal < Nivel_minimo) {
        elegido = escenario0;
        estado = "No viable - Apagada";
        produccionValida = false;
        nuevoModo = 0;
      } else {
        elegido = escenario2;
        estado = "Encendida obligatoria (2 unidades)";
        horasProducidas++;
      }
    } else {
      const despuesDeObligatorias = yaPasaronHorasObligatorias(h);
      const cercaDeObligatorias = faltaPocoParaHorasObligatorias(h);

      if (despuesDeObligatorias) {
        const nivelSeguroPost =
          nivelActual >= (Nivel_minimo + MARGEN_NIVEL_POST_OBLIGATORIO);

        const ingresoAlto =
          ingresoPromedioProyectado >= UMBRAL_INGRESO_ALTO;

        if (!nivelSeguroPost || !ingresoAlto) {
          elegido = escenario0;
          estado = "Apagada";
          nuevoModo = 0;
        } else {
          if (modoProduccion === 2) {
            if (escenario2.nivelFinal >= Nivel_minimo) {
              elegido = escenario2;
              estado = "Encendida continua (2 unidades)";
              nuevoModo = 2;
              horasProducidas++;
            } else if (escenario1.nivelFinal >= Nivel_minimo && horasEnModoActual >= HORAS_MIN_EN_DOS_UNIDADES) {
              elegido = escenario1;
              estado = "Encendida continua (1 unidad)";
              nuevoModo = 1;
              horasProducidas++;
            } else {
              elegido = escenario0;
              estado = "Apagada";
              nuevoModo = 0;
            }
          } else if (modoProduccion === 1) {
            if (
              horasEnModoActual >= HORAS_MIN_ANTES_DE_SUBIR_A_DOS &&
              escenario2.nivelFinal >= Nivel_minimo &&
              nivelActual >= Nivel_inicio
            ) {
              elegido = escenario2;
              estado = "Encendida continua (2 unidades)";
              nuevoModo = 2;
              horasProducidas++;
            } else if (escenario1.nivelFinal >= Nivel_minimo) {
              elegido = escenario1;
              estado = "Encendida continua (1 unidad)";
              nuevoModo = 1;
              horasProducidas++;
            } else {
              elegido = escenario0;
              estado = "Apagada";
              nuevoModo = 0;
            }
          } else {
            if (escenario1.nivelFinal >= Nivel_minimo && nivelActual >= Nivel_inicio) {
              elegido = escenario1;
              estado = "Encendida continua (1 unidad)";
              nuevoModo = 1;
              horasProducidas++;
            } else {
              elegido = escenario0;
              estado = "Apagada";
              nuevoModo = 0;
            }
          }
        }
      } else {
        if (modoProduccion === 2) {
          const bloqueOkConDos = reservaBloqueObligatorioViable(h, escenario2.volumenFinal, caudalesEntrada);

          if (cercaDeObligatorias) {
            if (escenario2.nivelFinal >= Nivel_minimo && bloqueOkConDos) {
              elegido = escenario2;
              estado = "Encendida continua (2 unidades)";
              nuevoModo = 2;
              horasProducidas++;
            } else {
              elegido = escenario0;
              estado = "Apagada";
              nuevoModo = 0;
            }
          } else {
            if (escenario2.nivelFinal >= Nivel_minimo && bloqueOkConDos) {
              elegido = escenario2;
              estado = "Encendida continua (2 unidades)";
              nuevoModo = 2;
              horasProducidas++;
            } else if (
              escenario1.nivelFinal >= Nivel_minimo &&
              horasEnModoActual >= HORAS_MIN_EN_DOS_UNIDADES
            ) {
              elegido = escenario1;
              estado = "Encendida continua (1 unidad)";
              nuevoModo = 1;
              horasProducidas++;
            } else {
              elegido = escenario0;
              estado = "Apagada";
              nuevoModo = 0;
            }
          }
        } else if (modoProduccion === 1) {
          const faltanParaObligatoria = Horas_obligatorias[0] - h;

          const puedeSubirADos =
            horasEnModoActual >= HORAS_MIN_ANTES_DE_SUBIR_A_DOS &&
            (
              nivelActual >= Nivel_inicio ||
              (faltanParaObligatoria <= 1 && escenario2.nivelFinal >= Nivel_minimo)
            );

          if (puedeSubirADos && escenario2.nivelFinal >= Nivel_minimo) {
            elegido = escenario2;
            estado = "Encendida continua (2 unidades)";
            nuevoModo = 2;
            horasProducidas++;
          } else if (escenario1.nivelFinal >= Nivel_minimo) {
            elegido = escenario1;
            estado = "Encendida continua (1 unidad)";
            nuevoModo = 1;
            horasProducidas++;
          } else {
            elegido = escenario0;
            estado = "Apagada";
            nuevoModo = 0;
          }
        } else {
          const bloqueOkConDos = reservaBloqueObligatorioViable(h, escenario2.volumenFinal, caudalesEntrada);
          const bloqueOkConUna = reservaBloqueObligatorioViable(h, escenario1.volumenFinal, caudalesEntrada);

          if (
            nivelActual >= Nivel_rebalse &&
            escenario2.nivelFinal >= Nivel_minimo &&
            bloqueOkConDos
          ) {
            elegido = escenario2;
            estado = "Encendida continua (2 unidades)";
            nuevoModo = 2;
            horasProducidas++;
          } else if (
            nivelActual >= Nivel_inicio &&
            escenario1.nivelFinal >= Nivel_minimo &&
            bloqueOkConUna
          ) {
            elegido = escenario1;
            estado = "Encendida continua (1 unidad)";
            nuevoModo = 1;
            horasProducidas++;
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
      horasEnModoActual++;
    } else {
      horasEnModoActual = 1;
    }

    modoProduccion = nuevoModo;

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
      potenciaElegida: Potencia_dos_unidades,
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
    if (Horas_obligatorias.includes(fila.de) && potencia === 0) {
      estado = "No viable";
    } else if (Horas_obligatorias.includes(fila.de) && potencia > 0) {
      estado = "Encendida obligatoria";
    } else if (potencia >= Potencia_dos_unidades) {
      estado = "Encendida continua (2 unidades)";
    } else if (potencia >= Potencia_una_unidad) {
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
  const lluvias = data.hourly.precipitation.slice(0, Simulacion);

  while (lluvias.length < Simulacion) {
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

    const lluvias = Array(Simulacion).fill(0);

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

    const lluvias = Array(Simulacion).fill(0);
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
  setInterval(actualizarTodoAutomaticamente, Intervalo_actualizacion);
});
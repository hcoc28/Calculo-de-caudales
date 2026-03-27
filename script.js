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

const NIVEL_MINIMO_OPERATIVO = 773.0;
const HORAS_OBLIGATORIAS = [18, 19, 20, 21]; // produce de 18 a 22

function round2(valor) {
  return Math.round(valor * 100) / 100;
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

function generarCaudales24h(caudalBase) {
  // En la mañana sube más
  const factores = [
    0.96, 0.96, 0.97, 0.98, 1.00, 1.03,
    1.08, 1.12, 1.15, 1.14, 1.12, 1.09,
    1.05, 1.03, 1.01, 1.00, 0.99, 0.98,
    0.99, 1.00, 1.01, 1.00, 0.99, 0.98
  ];

  return factores.map(f => round2(caudalBase * f));
}

function calcularAjusteEmbalse(potencia, nivelActual) {
  // ajuste automático cuando se produce
  const ajustePotencia = potencia / 20.0;

  let ajusteNivel = 0.01;
  if (nivelActual >= 777) ajusteNivel = 0.08;
  else if (nivelActual >= 776) ajusteNivel = 0.05;
  else if (nivelActual >= 775) ajusteNivel = 0.03;

  return round2(ajustePotencia + ajusteNivel);
}

function simularDiaConPotencia(nivelInicial, caudalBase, potencia) {
  const volumenInicial = nivelAVolumen(nivelInicial);
  const caudalesEntradaBase = generarCaudales24h(caudalBase);

  let volumenAcumulado = volumenInicial;
  let nivelActual = nivelInicial;
  let produccionValida = true;
  let horasProducidas = 0;

  const resultados = [];

  for (let h = 0; h < 24; h++) {
    const horaDesde = h;
    const horaHasta = (h + 1) % 24;

    const acumuladoAnterior = volumenAcumulado;
    const qIngresoBaseHora = caudalesEntradaBase[h];

    let potenciaHora = 0.0;
    let caudalSalida = 0.0;
    let volumenTurbinado = 0.0;
    let ajusteEmbalse = 0.0;
    let qIngreso = qIngresoBaseHora;
    let volumenPorHora = 0.0;
    let diferencia = 0.0;
    let estado = "Apagada";

    if (HORAS_OBLIGATORIAS.includes(h)) {
      potenciaHora = potencia;
      caudalSalida = calcularCaudalSalida(potenciaHora);
      volumenTurbinado = calcularVolumenTurbinado(caudalSalida);
      ajusteEmbalse = calcularAjusteEmbalse(potenciaHora, nivelActual);

      // puede dar 0 o negativo
      qIngreso = round2(qIngresoBaseHora - ajusteEmbalse);

      volumenPorHora = round2(qIngreso * 3600);

      // diferencia = entrada - salida
      diferencia = round2(volumenPorHora - volumenTurbinado);

      // acumulado nuevo = acumulado anterior + diferencia
      let volumenPrueba = round2(acumuladoAnterior + diferencia);

      if (volumenPrueba < TABLA_VOL_NIVEL[0][0]) {
        volumenPrueba = TABLA_VOL_NIVEL[0][0];
      }

      if (volumenPrueba > TABLA_VOL_NIVEL[TABLA_VOL_NIVEL.length - 1][0]) {
        volumenPrueba = TABLA_VOL_NIVEL[TABLA_VOL_NIVEL.length - 1][0];
      }

      const nivelPrueba = volumenANivel(volumenPrueba);

      if (nivelPrueba < NIVEL_MINIMO_OPERATIVO) {
        produccionValida = false;
        estado = "No viable";
        volumenAcumulado = volumenPrueba;
        nivelActual = nivelPrueba;
      } else {
        volumenAcumulado = volumenPrueba;
        nivelActual = nivelPrueba;
        horasProducidas++;
        estado = "Encendida";
      }
    } else {
      qIngreso = qIngresoBaseHora;
      volumenPorHora = round2(qIngreso * 3600);

      // cuando no produce, diferencia = volumen por hora
      diferencia = round2(volumenPorHora);

      volumenAcumulado = round2(acumuladoAnterior + diferencia);

      if (volumenAcumulado < TABLA_VOL_NIVEL[0][0]) {
        volumenAcumulado = TABLA_VOL_NIVEL[0][0];
      }

      if (volumenAcumulado > TABLA_VOL_NIVEL[TABLA_VOL_NIVEL.length - 1][0]) {
        volumenAcumulado = TABLA_VOL_NIVEL[TABLA_VOL_NIVEL.length - 1][0];
      }

      nivelActual = volumenANivel(volumenAcumulado);
      estado = "Apagada";
    }

    resultados.push({
      de: horaDesde,
      a: horaHasta,
      acumuladoAnterior: acumuladoAnterior,
      potencia: potenciaHora,
      caudalSalida: caudalSalida,
      volumenTurbinado: volumenTurbinado,
      ajusteEmbalse: ajusteEmbalse,
      caudalIngreso: qIngreso,
      volumenPorHora: volumenPorHora,
      diferencia: diferencia,
      acumulado: volumenAcumulado,
      nivel: nivelActual,
      estado: estado
    });
  }

  const niveles = resultados.map(r => r.nivel);

  const resumen = {
    nivelInicial,
    volumenInicial,
    nivelFinal: resultados[resultados.length - 1].nivel,
    volumenFinal: resultados[resultados.length - 1].acumulado,
    nivelMinimo: Math.min(...niveles),
    nivelMaximo: Math.max(...niveles),
    potenciaElegida: potencia,
    horasProduccion: horasProducidas,
    produccionValida
  };

  return { resultados, resumen };
}

function simuladorEmbalse(nivelInicial, caudalBase) {
  let mejorResultado = null;
  let mejorResumen = null;
  let mejorPotencia = 0.0;

  for (let potencia = 0.5; potencia <= 10.0; potencia = round2(potencia + 0.1)) {
    const intento = simularDiaConPotencia(nivelInicial, caudalBase, round2(potencia));

    if (
      intento.resumen.produccionValida &&
      intento.resumen.horasProduccion === HORAS_OBLIGATORIAS.length
    ) {
      if (potencia > mejorPotencia) {
        mejorPotencia = round2(potencia);
        mejorResultado = intento.resultados;
        mejorResumen = intento.resumen;
      }
    }
  }

  if (mejorResultado === null) {
    const intento = simularDiaConPotencia(nivelInicial, caudalBase, 0.0);
    intento.resumen.potenciaElegida = 0.0;
    intento.resumen.horasProduccion = 0;
    intento.resumen.produccionValida = false;
    return intento;
  }

  return {
    resultados: mejorResultado,
    resumen: mejorResumen
  };
}

function llenarTabla(resultados) {
  const tbody = document.querySelector("#tablaResultados tbody");
  tbody.innerHTML = "";

  resultados.forEach(r => {
    const fila = document.createElement("tr");

    fila.innerHTML = `
      <td>${r.de}</td>
      <td>${r.a}</td>
      <td>${r.acumuladoAnterior.toFixed(2)}</td>
      <td>${r.potencia.toFixed(2)}</td>
      <td>${r.caudalSalida.toFixed(2)}</td>
      <td>${r.volumenTurbinado.toFixed(2)}</td>
      <td>${r.ajusteEmbalse.toFixed(2)}</td>
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
    ? "Sí, se puede producir de 18 a 22 hrs"
    : "No se puede cumplir la producción obligatoria de 18 a 22 hrs";

  const estadoClase = resumen.produccionValida ? "ok" : "bad";

  resumenDiv.innerHTML = `
Nivel inicial: ${resumen.nivelInicial.toFixed(2)} msnm
Volumen inicial: ${resumen.volumenInicial.toFixed(2)} m³
Potencia elegida automáticamente: ${resumen.potenciaElegida.toFixed(2)}
Horas obligatorias producidas: ${resumen.horasProduccion}
Nivel final: ${resumen.nivelFinal.toFixed(2)} msnm
Volumen final: ${resumen.volumenFinal.toFixed(2)} m³
Nivel mínimo: ${resumen.nivelMinimo.toFixed(2)} msnm
Nivel máximo: ${resumen.nivelMaximo.toFixed(2)} msnm
Resultado: <span class="${estadoClase}">${estadoTexto}</span>
  `;
}

function calcular() {
  const nivelInicial = parseFloat(document.getElementById("nivelInicial").value);
  const caudalBase = parseFloat(document.getElementById("caudalBase").value);

  if (isNaN(nivelInicial) || isNaN(caudalBase)) {
    alert("Ingresa valores numéricos válidos.");
    return;
  }

  if (nivelInicial < 770 || nivelInicial > 778) {
    alert("El nivel inicial debe estar entre 770 y 778 msnm.");
    return;
  }

  const { resultados, resumen } = simuladorEmbalse(nivelInicial, caudalBase);

  llenarTabla(resultados);
  mostrarResumen(resumen);
}

document.getElementById("btnCalcular").addEventListener("click", calcular);
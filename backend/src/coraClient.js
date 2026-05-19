const CORA_API_URL = process.env.CORA_API_URL;
const CORA_API_CANTIDAD = Number(process.env.CORA_API_CANTIDAD ?? 24);

function normalizarLista(datos) {
  if (Array.isArray(datos)) return datos;
  if (Array.isArray(datos?.data)) return datos.data;
  if (Array.isArray(datos?.items)) return datos.items;
  if (Array.isArray(datos?.result)) return datos.result;
  if (datos && typeof datos === 'object') return [datos];
  return [];
}

function buscarValor(registro, candidatos) {
  if (!registro || typeof registro !== 'object') return null;

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

function aNumero(valor) {
  if (valor == null || valor === '') return null;
  const numero = Number(String(valor).replace(',', '.'));
  return Number.isFinite(numero) ? numero : null;
}

function dosDigitos(valor) {
  return String(valor).padStart(2, '0');
}

function formatearFechaLocal(fecha) {
  return [
    fecha.getFullYear(),
    dosDigitos(fecha.getMonth() + 1),
    dosDigitos(fecha.getDate())
  ].join('-');
}

function formatearHoraLocal(fecha) {
  return [
    dosDigitos(fecha.getHours()),
    dosDigitos(fecha.getMinutes()),
    dosDigitos(fecha.getSeconds())
  ].join(':');
}

function separarFechaHora(registro) {
  const fechaLectura = buscarValor(registro, [
    'fechalectura',
    'fecha_lectura',
    'timestamp',
    'createdat',
    'created_at',
    'datetime',
    'fecha'
  ]);
  const horaLectura = buscarValor(registro, ['hora', 'time']);

  if (fechaLectura) {
    const fecha = new Date(fechaLectura);
    if (!Number.isNaN(fecha.getTime())) {
      return {
        fecha: formatearFechaLocal(fecha),
        hora: formatearHoraLocal(fecha)
      };
    }
  }

  return {
    fecha: String(fechaLectura ?? '').slice(0, 10),
    hora: String(horaLectura ?? '00:00:00').slice(0, 8)
  };
}

export function normalizarRegistroCora(registro) {
  const { fecha, hora } = separarFechaHora(registro);

  return {
    fecha,
    hora,
    nivel: aNumero(buscarValor(registro, ['nivel', 'embalse'])),
    qe: aNumero(buscarValor(registro, ['qe', 'caudalentrada', 'entrada', 'ingreso'])),
    qs: aNumero(buscarValor(registro, ['qs', 'caudalsalida', 'salida'])),
    qv: aNumero(buscarValor(registro, ['qv', 'caudalvertido', 'vertido', 'vertedero'])),
    potenciaActiva: aNumero(buscarValor(registro, [
      'potenciaactiva',
      'potencia_activa',
      'potencia',
      'pa',
      'mw'
    ])),
    clima: buscarValor(registro, ['clima', 'weather', 'condicion', 'condición']) ?? null,
    datosOriginales: registro
  };
}

export async function obtenerDatosCora() {
  if (!CORA_API_URL) {
    throw new Error('Falta configurar CORA_API_URL.');
  }

  const url = new URL(CORA_API_URL);
  url.searchParams.set('cantidad', String(CORA_API_CANTIDAD));

  const respuesta = await fetch(url, { cache: 'no-store' });
  if (!respuesta.ok) {
    throw new Error(`CORA respondió con estado ${respuesta.status}.`);
  }

  return normalizarLista(await respuesta.json())
    .map(normalizarRegistroCora)
    .filter(registro => registro.fecha && registro.hora);
}

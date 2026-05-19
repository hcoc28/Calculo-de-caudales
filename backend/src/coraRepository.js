import { db } from './db.js';

export async function guardarDatoCora(dato) {
  const resultado = await db.query(
    `
    INSERT INTO datos_cora (
      fecha, hora, nivel, qe, qs, qv, potencia_activa, clima, datos_originales
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    ON CONFLICT (fecha, hora)
    DO UPDATE SET
      nivel = EXCLUDED.nivel,
      qe = EXCLUDED.qe,
      qs = EXCLUDED.qs,
      qv = EXCLUDED.qv,
      potencia_activa = EXCLUDED.potencia_activa,
      clima = EXCLUDED.clima,
      datos_originales = EXCLUDED.datos_originales,
      actualizado_en = CURRENT_TIMESTAMP
    RETURNING *
    `,
    [
      dato.fecha,
      dato.hora,
      dato.nivel,
      dato.qe,
      dato.qs,
      dato.qv,
      dato.potenciaActiva,
      dato.clima,
      dato.datosOriginales
    ]
  );

  return resultado.rows[0];
}

export async function guardarDatosCora(datos) {
  const guardados = [];
  for (const dato of datos) {
    guardados.push(await guardarDatoCora(dato));
  }
  return guardados;
}

export async function listarDatosCora(limite = 24) {
  const resultado = await db.query(
    `
    SELECT
      id,
      fecha,
      hora,
      nivel,
      qe,
      qs,
      qv,
      potencia_activa AS "potenciaActiva",
      clima,
      (fecha::text || 'T' || hora::text) AS "fechaLectura",
      creado_en AS "creadoEn",
      actualizado_en AS "actualizadoEn"
    FROM datos_cora
    ORDER BY fecha DESC, hora DESC
    LIMIT $1
    `,
    [limite]
  );

  return resultado.rows;
}

export async function obtenerPatronEntradaPorFecha(fecha) {
  const resultado = await db.query(
    `
    SELECT
      EXTRACT(HOUR FROM hora)::int AS hora,
      qe
    FROM datos_cora
    WHERE fecha = $1
      AND qe IS NOT NULL
    ORDER BY hora ASC
    `,
    [fecha]
  );

  const patron = Array(24).fill(null);
  for (const fila of resultado.rows) {
    if (fila.hora >= 0 && fila.hora < 24) {
      patron[fila.hora] = Number(fila.qe);
    }
  }

  return {
    fecha,
    patron,
    registros: resultado.rows.length,
    completo: patron.every(valor => Number.isFinite(valor))
  };
}

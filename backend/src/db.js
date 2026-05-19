import 'dotenv/config';
import pg from 'pg';

const { Pool } = pg;

export const db = new Pool({
  connectionString: process.env.DATABASE_URL
});

export async function verificarConexion() {
  const resultado = await db.query('SELECT NOW() AS ahora');
  return resultado.rows[0];
}

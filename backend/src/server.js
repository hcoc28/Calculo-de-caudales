import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { verificarConexion } from './db.js';
import { listarDatosCora, obtenerPatronEntradaPorFecha } from './coraRepository.js';
import { iniciarSincronizadorCora, sincronizarCora } from './scheduler.js';

const app = express();
const port = Number(process.env.PORT ?? 4000);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendPath = path.resolve(__dirname, '../../frontend');

app.use(cors());
app.use(express.json());

app.get('/api/salud', async (_req, res) => {
  const db = await verificarConexion();
  res.json({ ok: true, db });
});

app.get('/api/cora/datos', async (req, res, next) => {
  try {
    const limite = Math.min(Number(req.query.cantidad ?? 24), 500);
    res.json(await listarDatosCora(limite));
  } catch (error) {
    next(error);
  }
});

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

function obtenerFechaAyer() {
  const fecha = new Date();
  fecha.setDate(fecha.getDate() - 1);
  return formatearFechaLocal(fecha);
}

app.get('/api/cora/patron-entrada', async (req, res, next) => {
  try {
    const fecha = req.query.fecha || obtenerFechaAyer();
    res.json(await obtenerPatronEntradaPorFecha(fecha));
  } catch (error) {
    next(error);
  }
});

app.post('/api/cora/sincronizar', async (_req, res, next) => {
  try {
    res.json(await sincronizarCora());
  } catch (error) {
    next(error);
  }
});

app.use(express.static(frontendPath));

app.get('/', (_req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({
    error: 'Error interno del backend',
    detalle: error.message
  });
});

app.listen(port, () => {
  iniciarSincronizadorCora();
  console.log(`Backend escuchando en http://localhost:${port}`);
});

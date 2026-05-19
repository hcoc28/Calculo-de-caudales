import cron from 'node-cron';
import { obtenerDatosCora } from './coraClient.js';
import { guardarDatosCora } from './coraRepository.js';

export async function sincronizarCora() {
  const datos = await obtenerDatosCora();
  const guardados = await guardarDatosCora(datos);
  return {
    recibidos: datos.length,
    guardados: guardados.length
  };
}

export function iniciarSincronizadorCora() {
  const expresion = process.env.CORA_SYNC_CRON ?? '0 * * * *';

  cron.schedule(expresion, async () => {
    try {
      const resumen = await sincronizarCora();
      console.log(`[CORA] Sincronización completada: ${resumen.guardados} registros.`);
    } catch (error) {
      console.error('[CORA] Error al sincronizar:', error);
    }
  });

  if (process.env.CORA_SYNC_ON_START !== 'false') {
    sincronizarCora()
      .then(resumen => console.log(`[CORA] Sincronización inicial: ${resumen.guardados} registros.`))
      .catch(error => console.error('[CORA] Error en sincronización inicial:', error));
  }
}

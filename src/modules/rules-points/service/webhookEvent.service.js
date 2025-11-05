// RUTA: src/modules/rules-points/service/webhookEvent.service.js
 
import prisma from '../../../config/prisma.js';
 
/**
 * Guarda un evento crudo de GitHub en la base de datos, manejando duplicados por deliveryId.
 * Esta es la primera capa de persistencia para los webhooks entrantes.
 * @async
 * @function saveGithubEvent
 * @param {object} record - Objeto con datos formateados para el modelo GithubEvent.
 * @param {string} record.deliveryId - ID de entrega único de GitHub.
 * @param {string} record.eventType - Tipo de evento (e.g., 'push').
 * @param {object} record.payload - Cuerpo completo del webhook.
 * @param {string|null} [record.action] - Acción específica del evento.
 * @param {string|null} [record.repoFullName] - Nombre del repositorio.
 * @param {string|null} [record.senderLogin] - Usuario que disparó el evento.
 * @returns {Promise<object|null>} El evento guardado (o existente si duplicado) o null en error irrecuperable.
 * @throws {Error} Si ocurre un error de base de datos no relacionado con duplicados.
 */
export const saveGithubEvent = async (record) => {
  try {
    const savedEvent = await prisma.githubEvent.create({
      data: record
    });
    // Log de éxito eliminado para producción más limpia. Descomentar si se necesita para depuración.
    // console.info(`[WebhookEventService] Webhook almacenado: delivery=${record.deliveryId} id=${savedEvent.id}`);
    return savedEvent;
 
  } catch (error) {
    // Manejo específico y robusto de duplicados
    if (error.code === 'P2002' && error.meta?.target?.includes('deliveryId')) {
      // Log de duplicado se mantiene, útil para monitoreo
      console.info(`[WebhookEventService] Webhook duplicado (ya existe): delivery=${record.deliveryId}`);
      // Devolver el evento existente es importante para que el flujo pueda continuar si es necesario
      return prisma.githubEvent.findUnique({
        where: { deliveryId: record.deliveryId },
      });
    }
    // Si es otro error, loguearlo y relanzarlo
    console.error(`[WebhookEventService] Error al guardar webhook ${record.deliveryId}:`, error);
    throw error; // Relanzar para que el webhook controller pueda manejarlo (ej. enviar 500)
  }
};
// RUTA: src/modules/rules-points/engine/rule.engine.js

import prisma from '../../../config/prisma.js';
import { processCommitRule } from './rules/commit.rule.js';
import { processBranchRule } from './rules/branch.rule.js';
import { processPullRequestRule } from './rules/pr.rule.js';
// Asegúrate de tener estos archivos o comentar estas líneas si no existen aún
// import { processReviewRule } from './rules/review.rule.js'; 
// import { processOtherEventsRule } from './rules/other.rule.js';
// import { processTeamEvent } from './rules/team.rule.js';

/**
 * Orquesta la ejecución de todas las reglas relevantes para un evento.
 * Se llama después de guardar el evento en la BD para asegurar persistencia.
 */
export const runRulesForActivity = async (deliveryId) => {
  const event = await prisma.githubEvent.findUnique({ where: { deliveryId: deliveryId } });

  if (!event || event.processedStatus !== 'stored') {
    // Si no existe o ya fue procesado/falló, salimos
    return;
  }

  // Marcar como procesando
  await prisma.githubEvent.update({
      where: { id: event.id },
      data: { processedStatus: 'processing' },
  });

  // Intentar encontrar al usuario
  const user = await prisma.user.findUnique({ where: { username: event.senderLogin }});
  
  // Excepción: Eventos de organización/equipo pueden no tener un usuario "sender" registrado en nuestro sistema
  const isSystemEvent = ['team', 'membership', 'organization'].includes(event.eventType);

  if (!user && !isSystemEvent) {
    await prisma.githubEvent.update({ where: { id: event.id }, data: { processedStatus: 'failed_user_not_found' } });
    console.warn(`[RuleEngine] Usuario no encontrado: ${event.senderLogin}. Ignorando evento.`);
    return;
  }

  console.log(`[RuleEngine] Iniciando evaluación para evento ${event.eventType} del usuario ${user?.username || 'Sistema'}`);

  try {
    // Reconstruimos el objeto 'event' con el payload parseado para pasarlo a las reglas
    const eventContext = {
        type: event.eventType,
        payload: event.payload, // Prisma ya lo devuelve como JSON
        id: event.deliveryId
    };

    switch (event.eventType) {
      case 'push':
        await processCommitRule(eventContext, user);
        // También pasamos el push a reglas de rama (para detectar push directos)
        await processBranchRule(eventContext, user);
        break;
      
      case 'pull_request':
        await processPullRequestRule(eventContext, user);
        break;
      
      /* // Descomenta cuando tengas estos archivos
      case 'pull_request_review':
        await processReviewRule(eventContext, user);
        break;
      */

      case 'create':
      case 'delete':
        await processBranchRule(eventContext, user);
        break;

      /*
      case 'release':
        await processOtherEventsRule(eventContext, user);
        break;
      case 'team':
      case 'membership':
      case 'organization':
        await processTeamEvent(eventContext, user); 
        break;
      */
    }

    // Si todo salió bien, marcamos como completado
    await prisma.githubEvent.update({
        where: { id: event.id },
        data: { processedStatus: 'processed_ok' },
    });
    console.log(`[RuleEngine] Evaluación completada para ${deliveryId}`);

  } catch (error) {
    console.error(`[RuleEngine] Error procesando evento ${deliveryId}:`, error);
    await prisma.githubEvent.update({ where: { id: event.id }, data: { processedStatus: 'failed_rule_error' } });
  }
};
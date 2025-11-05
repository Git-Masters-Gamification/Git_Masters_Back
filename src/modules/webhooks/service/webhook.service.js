import prisma from '../../../config/prisma.js';
import { runRulesForActivity } from '../../rules-points/engine/ruleEngine.js';
// IMPORTACIÓN CLAVE: Importamos la función de sincronización completa
import { syncTeamsAndMembers } from '../../sync/service/sync.service.js';
 
const handleTeamEvent = async (payload, eventType, organizationLogin) => {
  console.log(`[Webhook Service] Evento de equipo recibido desde '${organizationLogin}'.`);
  const team = payload.team;
  if (!team) {
    console.warn(`[Webhook Service] Payload de equipo no contiene datos válidos.`);
    return false;
  }
 
  try {
    if (payload.action === 'deleted') {
      await prisma.team.delete({ where: { githubId: team.id } });
      console.log(`[Webhook Service] Equipo '${team.name}' eliminado correctamente.`);
    } else {
      const teamRecord = await prisma.team.upsert({
        where: { githubId: team.id },
        update: {
          name: team.name,
          slug: team.slug,
          description: team.description || null,
        },
        create: {
          githubId: team.id,
          name: team.name,
          slug: team.slug,
          description: team.description || null,
        },
      });
      console.log(`[Webhook Service] Equipo '${teamRecord.name}' registrado/actualizado correctamente.`);
    }
    return true;
  } catch (err) {
    console.error(`[Webhook Service] Error procesando el equipo '${team?.name}' (${eventType}):`, err);
    return false;
  }
};
 
const handleActivityLog = async (payload, deliveryId, eventType, user) => {
  const record = {
    deliveryId,
    eventType,
    action: payload.action || null,
    repoFullName: payload.repository?.full_name || null,
    senderLogin: user.username,
    payload,
  };
 
  try {
    const savedEvent = await prisma.githubEvent.create({ data: record });
    console.info(`[Webhook Service] Evento guardado: delivery=${savedEvent.deliveryId}`);
 
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        type: eventType,
        metadata: { action: record.action, repo: record.repoFullName },
      },
    });
    console.info(`[Webhook Service] ActivityLog creado para: ${user.username}`);
 
    runRulesForActivity(savedEvent.deliveryId).catch(err => {
      console.error(`Error en ruleEngine para delivery ${deliveryId}:`, err);
    });
  } catch (err) {
    if (err.code === 'P2002' && err.meta?.target?.includes('deliveryId')) {
      console.warn(`[Webhook Service] Webhook duplicado ignorado: ${deliveryId}`);
      return;
    }
    throw err;
  }
};
 
export const processGitHubEvent = async (payload, deliveryId, eventType) => {
  if (eventType === 'ping') {
    console.log(`[Webhook Service] Ping de GitHub (${deliveryId}) recibido.`);
    return;
  }
 
  const organizationLogin = payload.organization?.login || null;
  let shouldRunFullSync = false;
 
  if (eventType.startsWith('team')) {
    shouldRunFullSync = await handleTeamEvent(payload, eventType, organizationLogin);
  }
 
  if (eventType === 'membership') {
    console.log(`[Webhook Service] Evento de membresía recibido: ${payload.action}`);
    shouldRunFullSync = true;
  }
 
  if (shouldRunFullSync) {
    console.log(`[Webhook Service] Disparando sincronización completa de equipos y miembros...`);
    syncTeamsAndMembers().catch(err => {
      console.error(`Error durante la sincronización completa disparada por webhook:`, err);
    });
    return;
  }
 
  const senderLogin = payload.sender?.login || payload.pusher?.name || null;
 
  if (senderLogin === 'Git-Masters-Gamification') {
    console.log(`[Webhook Service] Evento de organización '${senderLogin}' ignorado.`);
    return;
  }
 
  const user = await prisma.user.findUnique({
    where: { username: senderLogin },
  });
 
  if (!user) {
    console.warn(`[Webhook Service] Usuario '${senderLogin}' no encontrado. Ignorando evento.`);
    return;
  }
 
  await handleActivityLog(payload, deliveryId, eventType, user);
};
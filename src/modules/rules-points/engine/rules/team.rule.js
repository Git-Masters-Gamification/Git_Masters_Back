// RUTA: src/modules/rules-points/engine/rules/team.rule.js

import prisma from '../../../../config/prisma.js';

/**
 * Maneja un evento de tipo 'team' (creado, borrado, editado).
 */
const handleTeamEvent = async (event) => {
  const { action, team } = event.payload;
  if (!team?.id) return;

  const githubTeamId = team.id; // Este es el ID numérico de GitHub

  try {
    switch (action) {
      case 'created':
        // Un equipo fue creado en GitHub, lo creamos en nuestra BD
        await prisma.team.upsert({
          // Buscar por 'githubId'
          where: { githubId: githubTeamId },
          update: { 
            name: team.name,
            slug: team.slug, // Asumiendo que tienes 'slug' en tu schema
            description: team.description || null,
           },
          create: {
            githubId: githubTeamId, // Usar el ID de GitHub
            id: team.id.toString(), // Puedes usar el ID de GitHub como ID de Prisma si es string
            name: team.name,
            slug: team.slug,
            description: team.description || null,
          },
        });
        console.log(`[TeamRule] Equipo "${team.name}" creado o actualizado en la BD.`);
        break;

      case 'deleted':
        // Un equipo fue borrado en GitHub, lo borramos en nuestra BD
        await prisma.team.delete({
          // Borrar por 'githubId'
          where: { githubId: githubTeamId },
        });
        console.log(`[TeamRule] Equipo "${team.name}" eliminado de la BD.`);
        break;

      case 'edited':
        // El nombre u otra propiedad del equipo cambió
        await prisma.team.update({
          // Actualizar por 'githubId'
          where: { githubId: githubTeamId },
          data: { 
            name: team.name,
            slug: team.slug,
            description: team.description || null,
          },
        });
        console.log(`[TeamRule] Equipo "${team.name}" actualizado.`);
        break;
    }
  } catch (error) {
    if (error.code !== 'P2025') { // Ignorar error "Registro no encontrado"
      console.error(`[TeamRule] Error procesando evento 'team' (acción ${action}):`, error);
    }
  }
};

/**
 * Maneja un evento de tipo 'membership' (usuario añadido/quitado de un equipo).
 */
const handleMembershipEvent = async (event) => {
  const { action, team, member } = event.payload;
  if (!team || !member) return;

  const githubTeamId = team.id;
  const username = member.login;

  try {
    // 1. Encontrar el ID interno de nuestro equipo basado en el ID de GitHub
    const localTeam = await prisma.team.findUnique({
      where: { githubId: githubTeamId },
      select: { id: true } // Solo necesitamos el ID interno
    });

    if (!localTeam) {
        console.warn(`[TeamRule] Evento 'membership' recibido para un equipo desconocido (GitHub ID: ${githubTeamId})`);
        return;
    }
    const localTeamId = localTeam.id;

    // 2. Aplicar la lógica de membresía
    switch (action) {
      case 'added':
        await prisma.user.update({
          where: { username: username },
          data: { teamId: localTeamId }, // Asignamos el ID interno
        });
        console.log(`[TeamRule] Usuario "${username}" añadido al equipo "${team.name}".`);
        break;

      case 'removed':
        await prisma.user.update({
          where: { username: username },
          data: { teamId: null }, // Quitamos la asignación
        });
        console.log(`[TeamRule] Usuario "${username}" quitado del equipo "${team.name}".`);
        break;
    }
  } catch (error) {
    if (error.code !== 'P2025') { // Ignorar si el usuario no existe
      console.error(`[TeamRule] Error procesando 'membership' para ${username}:`, error);
    }
  }
};

/**
 * Maneja un evento de tipo 'organization' (usuario añadido/quitado de la org).
 */
const handleOrganizationEvent = async (event) => {
    // ... (Tu lógica aquí es correcta, asume que 'username' es la clave) ...
    const { action, membership } = event.payload;
    if (!membership?.user) return;
    const username = membership.user.login;

    try {
        if (action === 'member_removed') {
        await prisma.user.update({
            where: { username: username },
            data: { teamId: null },
        });
        console.log(`[TeamRule] Usuario "${username}" eliminado de la org, quitado de equipos.`);
        }
    } catch (error) {
        if (error.code !== 'P2025') {
        console.error(`[TeamRule] Error en 'organization' para ${username}:`, error);
        }
    }
};


/**
 * Punto de entrada principal para las reglas de Sincronización de Equipos.
 */
export const processTeamEvent = async (event, user) => {
  switch (event.eventType) {
    case 'team':
      await handleTeamEvent(event);
      break;
    case 'membership':
      await handleMembershipEvent(event);
      break;
    case 'organization':
      await handleOrganizationEvent(event);
      break;
  }
};
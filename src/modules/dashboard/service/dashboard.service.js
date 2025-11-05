// backend/src/modules/dashboard/service/dashboard.service.js
import prisma from '../../../config/prisma.js';
import { getActivityLogByUserId } from '../../profile/service/profile.service.js';

export const getDashboardData = async (userId) => {
  // --- PASO 1: Obtener todos los datos crudos en paralelo ---
  const [userProfile, allUsersSorted, allTeams, activity] = await Promise.all([
    // Perfil del usuario actual con sus insignias
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        pointsBalance: true,
        assignedBadges: {
          select: { badge: { select: { name: true, description: true } } },
        },
      },
    }),
    // Todos los usuarios para calcular el ranking
    prisma.user.findMany({
      orderBy: { pointsBalance: 'desc' },
      select: { id: true },
    }),
    // Todos los equipos con sus miembros y puntos
    prisma.team.findMany({
      include: {
        members: {
          select: { pointsBalance: true },
        },
      },
    }),
    // El historial de actividad (excluyendo resets por defecto)
    getActivityLogByUserId(userId, { excludeResets: true }),
  ]);

  if (!userProfile) {
    throw new Error('Perfil de usuario no encontrado.');
  }

  // --- PASO 2: Calcular el rango del usuario actual ---
  const rank = allUsersSorted.findIndex((user) => user.id === userId) + 1;

  // --- PASO 3: Calcular el ranking de equipos ---
  const teamRanking = allTeams
    .map((team) => {
      const totalPoints = team.members.reduce((sum, member) => sum + member.pointsBalance, 0);
      return {
        id: team.id,
        name: team.name,
        totalPoints,
      };
    })
    .sort((a, b) => b.totalPoints - a.totalPoints);

  // --- PASO 4: Ensamblar el objeto final con el contrato exacto ---
  return {
    userId: userProfile.id,
    pointsTotal: userProfile.pointsBalance,
    rank,
    badges: userProfile.assignedBadges.map((ab) => ab.badge),
    history: activity, // ya excluye resets
    teamRanking,
  };
};
// RUTA: src/modules/rules-points/service/point.service.js

import prisma from '../../../config/prisma.js';

/**
 * Actualiza el rango de un usuario basado en su puntaje total.
 * @param {string} userId - El ID del usuario a verificar.
 */
async function updateUserRank(userId) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        pointsBalance: true,
        profile: { select: { id: true, rankId: true } },
      },
    });

    if (!user?.profile) return;

    // Obtener todos los rangos, ordenados del más alto al más bajo
    const allRanks = await prisma.rank.findMany({
      orderBy: { pointsRequired: 'desc' },
    });

    // Encontrar el rango más alto para el que califica el usuario
    const newRank = allRanks.find(rank => user.pointsBalance >= rank.pointsRequired);

    // Si el nuevo rango es diferente al actual, actualizarlo
    if (newRank && newRank.id !== user.profile.rankId) {
      await prisma.profile.update({
        where: { id: user.profile.id },
        data: { rankId: newRank.id },
      });
      console.log(`[RankSystem] Usuario ${userId} ha ascendido al rango: ${newRank.name}`);
    }
  } catch (error)
 {
    console.error(`[RankSystem] Error al actualizar el rango para el usuario ${userId}:`, error);
  }
}

/**
 Otorga o deduce puntos a un usuario de forma transaccional.
 */
export const applyPoints = async ({
  userId,
  points,
  ruleKey,
  entityId,
  ruleVersion = 'v1.0',
  notes,
  isReversible = true,
}) => {
  if (points === 0) return null;

  try {
    const [ledgerEntry] = await prisma.$transaction([
      prisma.pointLedger.create({
        data: {
          userId,
          points,
          ruleKey,
          entityId,
          ruleVersion,
          notes,
          isReversible,
        },
      }),
      prisma.user.update({
        where: { id: userId },
        data: {
          pointsBalance: {
            increment: points,
          },
        },
      }),
    ]);

    console.log(`[PointService] ${points} pts aplicados al usuario ${userId} por regla ${ruleKey}.`);
    
    // Después de aplicar los puntos, verificamos si el rango del usuario debe cambiar.
    await updateUserRank(userId);
    
    return ledgerEntry;
  } catch (error) {
    console.error(`[PointService] Falló la transacción de puntos para el usuario ${userId}:`, error);
    throw error;
  }
};

/**
 Obtiene los datos del dashboard para un usuario específico.
 */
export const getDashboardData = async (userId) => {
  const userProfile = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      username: true,
      avatarUrl: true,
      pointsBalance: true,
      createdAt: true,
      profile: {
        select: {
          level: true,
          // Incluir la información del rango en la consulta
          rank: {
            select: { name: true, color: true },
          },
        },
      },
      assignedBadges: {
        select: {
          badge: {
            select: { name: true, description: true },
          },
          obtainedAt: true,
        },
        orderBy: {
          obtainedAt: 'desc',
        },
      },
      pointLedgerEntries: {
        take: 10,
        orderBy: {
          createdAt: 'desc',
        },
        select: {
          points: true,
          notes: true,
          createdAt: true,
        },
      },
    },
  });

  if (!userProfile) {
    return null;
  }

  const badges = userProfile.assignedBadges.map(ab => ({
    name: ab.badge.name,
    description: ab.badge.description,
    obtainedAt: ab.obtainedAt,
  }));

  return {
    username: userProfile.username,
    avatarUrl: userProfile.avatarUrl,
    memberSince: userProfile.createdAt,
    totalPoints: userProfile.pointsBalance,
    level: userProfile.profile?.level || 1,
    // Añadir el rango al objeto de respuesta. Si no tiene, se usa un default.
    rank: userProfile.profile?.rank || { name: 'Iniciado', color: '#A0AEC0' },
    recentActivity: userProfile.pointLedgerEntries,
    badges: badges,
  };
};

/**
 Obtiene los 10 usuarios con más puntos para el ranking.
 */
export const getLeaderboard = async () => {
  const topUsers = await prisma.user.findMany({
    take: 10,
    orderBy: {
      pointsBalance: 'desc',
    },
    select: {
      username: true,
      avatarUrl: true,
      pointsBalance: true,
      profile: {
        select: {
          level: true,
          rank: { select: { name: true } },
        },
      },
    },
  });

  return topUsers.map(user => ({
    username: user.username,
    avatarUrl: user.avatarUrl,
    totalPoints: user.pointsBalance,
    level: user.profile?.level || 1,
    rank: user.profile?.rank?.name || 'Iniciado',
  }));
};
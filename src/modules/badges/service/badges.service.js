// RUTA: src/modules/badges/service/badges.service.js

import prisma from '../../../config/prisma.js';
import { subDays, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { applyPoints } from '../../rules-points/service/point.service.js';

// ==========================================================
// FUNCIÓN PRINCIPAL PARA OTORGAR INSIGNIAS (USO INSTANTÁNEO)
// ==========================================================

/**
 * Otorga una insignia a un usuario si aún no la tiene.
 * Esta es la función principal llamada por las reglas en tiempo real.
 * @param {string} userId - El ID del usuario.
 * @param {string} badgeKey - La clave única de la insignia (ej. 'rompiendo_el_hielo').
 */
export const awardBadge = async (userId, badgeKey) => {
  try {
    const badge = await prisma.badge.findUnique({ where: { key: badgeKey } });
    if (!badge) {
      console.warn(`[BadgeService] Insignia con key '${badgeKey}' no encontrada.`);
      return;
    }

    // Usamos upsert: crea la relación UserBadge solo si no existe.
    await prisma.userBadge.upsert({
      where: { userId_badgeId: { userId, badgeId: badge.id } }, // Índice único
      update: {}, // No hacer nada si ya existe
      create: { userId, badgeId: badge.id }, // Crear si no existe
    });
    console.log(`[BadgeService] Insignia '${badge.name}' otorgada al usuario ${userId}.`);

  } catch (error) {
    console.error(`[BadgeService] Error al otorgar la insignia '${badgeKey}' a ${userId}:`, error);
  }
};


// ==========================================================
// LÓGICA PARA EVALUACIÓN PERIÓDICA (CRON JOBS)
// ==========================================================

// --- Funciones Evaluadoras Específicas ---

/**
 * Evalúa si un usuario cumple los criterios para la insignia "Commit Perfecto".
 * @param {object} user - Objeto User de Prisma.
 * @param {object} badge - Objeto Badge de Prisma ("Commit Perfecto").
 * @returns {Promise<boolean>} - True si el usuario cumple, false si no.
 */
async function checkCommitPerfecto(user, badge) {
  const { durationDays, minCommits, minAtomicityRate } = badge.criteria; // Leer criteria directamente
  const dateLimit = subDays(new Date(), durationDays);

  // Obtener todas las entradas de puntos de commit del usuario en el periodo
  const commitEntries = await prisma.pointLedger.findMany({
    where: { 
      userId: user.id, 
      ruleKey: { startsWith: 'commit.' }, // Solo reglas de commit
      createdAt: { gte: dateLimit } 
    },
    select: { entityId: true, ruleKey: true }, // Seleccionar solo lo necesario
  });
  
  // Agrupar por entityId (commit SHA) para contar commits únicos
  const uniqueCommits = new Map();
  commitEntries.forEach(entry => {
      if (!uniqueCommits.has(entry.entityId)) {
          uniqueCommits.set(entry.entityId, { hasAtomicityBonus: false });
      }
      if (entry.ruleKey === 'commit.atomicity_bonus') {
          uniqueCommits.get(entry.entityId).hasAtomicityBonus = true;
      }
  });

  const totalUniqueCommits = uniqueCommits.size;
  if (totalUniqueCommits < minCommits) return false; // No cumple el mínimo de commits

  const atomicCommitsCount = [...uniqueCommits.values()].filter(c => c.hasAtomicityBonus).length;
  const atomicityRate = totalUniqueCommits > 0 ? atomicCommitsCount / totalUniqueCommits : 0;
  
  return atomicityRate >= minAtomicityRate; // Cumple si la tasa es suficiente
}

/**
 * Evalúa si un usuario cumple los criterios para la insignia "Revisor Experto".
 * NOTA: La lógica para 'minCorrectedReviews' es compleja y se deja como placeholder.
 * @param {object} user - Objeto User de Prisma.
 * @param {object} badge - Objeto Badge de Prisma ("Revisor Experto").
 * @returns {Promise<boolean>} - True si el usuario cumple, false si no.
 */
async function checkRevisorExperto(user, badge) {
  const { durationDays, minReviews, minCorrectedReviews } = badge.criteria; // Leer criteria directamente
  const dateLimit = subDays(new Date(), durationDays);

  // Contar cuántas revisiones ha hecho el usuario en el periodo
  const totalReviews = await prisma.pointLedger.count({
    where: { 
        userId: user.id, 
        ruleKey: 'review.submission', 
        createdAt: { gte: dateLimit } 
    },
  });

  if (totalReviews < minReviews) return false; // No cumple el mínimo de revisiones

  // Placeholder para la lógica de contar correcciones válidas.
  // Esto requeriría una lógica similar a 'countCorrectionsInBulk',
  // pero adaptada para buscar pushes *posteriores* a cada revisión.
  const validCorrections = 0; 
  console.warn(`[BadgeService] Lógica para contar correcciones válidas (Revisor Experto) no implementada.`);

  return validCorrections >= minCorrectedReviews;
}

/**
 * Evalúa y asigna la insignia mensual "Guardián de la Calidad".
 * @param {object} badge - Objeto Badge de Prisma ("Guardián de la Calidad").
 */
async function evaluateGuardianDeLaCalidad(badge) {
  const { minTarget, pointsReward } = badge.criteria; //
  const lastMonthStart = startOfMonth(subMonths(new Date(), 1));
  const lastMonthEnd = endOfMonth(subMonths(new Date(), 1));

  // Contar revisiones con bono de etiqueta (indicador de problema detectado) por usuario
  const reviewersStats = await prisma.pointLedger.groupBy({
    by: ['userId'],
    where: {
      ruleKey: 'review.submission', 
      notes: { contains: 'pts por usar la etiqueta' }, // Filtrar por la nota del bono
      createdAt: { gte: lastMonthStart, lte: lastMonthEnd },
    },
    _count: {
      _all: true, // Contar cuántas entradas cumplen
    },
    orderBy: {
      _count: {
        _all: 'desc', // Ordenar por quien tuvo más
      },
    },
    take: 1, // Tomar solo al mejor
  });

  if (!reviewersStats.length || reviewersStats[0]._count._all < minTarget) {
      console.log('[BadgeService] Guardián de la Calidad: Nadie cumplió el mínimo.');
      return;
  }
  
  const winnerUserId = reviewersStats[0].userId;
  const winnerUser = await prisma.user.findUnique({ where: { id: winnerUserId }}); // Buscar datos del ganador

  if (winnerUser) {
      await awardBadge(winnerUserId, badge.key); // Usar la función centralizada
      await applyPoints({
        userId: winnerUserId,
        points: pointsReward,
        ruleKey: `badge.reward.${badge.key}`,
        entityId: badge.id,
        notes: `+${pointsReward} pts de recompensa por la insignia "${badge.name}".`,
        isReversible: false, // Las recompensas de insignia no suelen ser reversibles
      });
      console.log(`[Badge Service] Insignia mensual '${badge.name}' otorgada a ${winnerUser.username}`);
  }
}


// --- Funciones Orquestadoras (Llamadas por el Scheduler) ---

// Mapeo de badge keys a sus funciones evaluadoras DIARIAS
const dailyBadgeEvaluators = {
  'commit_perfecto': checkCommitPerfecto,
  'revisor_experto': checkRevisorExperto,
};

/**
 * Ejecuta la evaluación de todas las insignias diarias para todos los usuarios.
 */
export const evaluateDailyBadges = async () => {
  console.log('[BadgeService] Iniciando evaluación de insignias diarias...');
  try {
      const users = await prisma.user.findMany({ select: { id: true }}); // Solo necesitamos IDs
      const dailyBadges = await prisma.badge.findMany({
        where: { key: { in: Object.keys(dailyBadgeEvaluators) } },
      });

      for (const user of users) {
        for (const badge of dailyBadges) {
          const evaluator = dailyBadgeEvaluators[badge.key];
          if (evaluator) {
            try {
              const userEarnedBadge = await evaluator(user, badge);
              if (userEarnedBadge) {
                await awardBadge(user.id, badge.key); // Usar la función centralizada
              }
            } catch (evalError) {
              console.error(`[BadgeService] Error evaluando ${badge.key} para ${user.id}:`, evalError);
            }
          }
        }
      }
  } catch (error) {
      console.error('[BadgeService] Error general en evaluación diaria:', error);
  }
  console.log('[BadgeService] Evaluación diaria completada.');
};

/**
 * Ejecuta la evaluación de todas las insignias mensuales.
 */
export const evaluateMonthlyBadges = async () => {
  console.log('[BadgeService] Iniciando evaluación de insignias mensuales...');
  try {
    const guardianBadge = await prisma.badge.findUnique({ where: { key: 'guardian_de_la_calidad' }});
    if (guardianBadge) {
      await evaluateGuardianDeLaCalidad(guardianBadge);
    }
    // Añadir aquí llamadas a otros evaluadores mensuales si los hubiera
  } catch (error) {
    console.error('[Badge Service] Falló la evaluación de insignias mensuales:', error);
  }
  console.log('[BadgeService] Evaluación mensual completada.');
};
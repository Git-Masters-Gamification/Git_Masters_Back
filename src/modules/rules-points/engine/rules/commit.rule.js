// RUTA: src/modules/rules-points/engine/rules/commit.rule.js

import { applyPoints } from '../../service/point.service.js';
import prisma from '../../../../config/prisma.js';
import { startOfDay } from 'date-fns';

const VALID_COMMIT_MESSAGE_REGEX = /^(feat|fix|docs|style|refactor|test|chore|improvement)(\(.+\))?: .{5,}/;
const POINTS = {
  VALID_MESSAGE: 10,
  INCLUDES_TIME: 5,
};
const ATOMICITY_BASE_POINTS = 5;
const DAILY_CAP = 60;
const PENALTY_REDUCTION_FACTOR = 0.4; // Reduce la penalización en 60% (queda el 40%)

/**
 * Procesa un commit de reversión para anular *parcialmente* los puntos otorgados originalmente.
 */
const handleRevertCommit = async (commit, user) => {
  const shaMatch = commit.message.match(/This reverts commit ([a-f0-9]{40})\./);
  if (!shaMatch?.[1]) return;

  const originalCommitSha = shaMatch[1];
  const originalPointEntries = await prisma.pointLedger.findMany({
    where: { entityId: originalCommitSha, isReversible: true },
  });

  if (!originalPointEntries.length) return;

  for (const entry of originalPointEntries) {
    // Solo aplicamos la reducción si la entrada original era de puntos positivos.
    const penaltyPoints = entry.points > 0 
      ? Math.round(-entry.points * PENALTY_REDUCTION_FACTOR) // Reducir penalización
      : -entry.points; // Si la entrada original ya era negativa, no la reducimos más.

    // Asegurarse de que la penalización sea siempre negativa o cero.
    const finalPenalty = Math.min(0, penaltyPoints); 

    if (finalPenalty === 0) continue; // No aplicar 0 puntos

    await applyPoints({
      userId: user.id,
      points: finalPenalty, // <-- Usar la penalización calculada
      ruleKey: 'commit.revert',
      entityId: commit.id,
      notes: `${finalPenalty} pts por revertir commit ${originalCommitSha.substring(0, 7)} (Anula parcialmente regla '${entry.ruleKey}').`, // Mensaje ajustado
      isReversible: false,
    });
  }
};

/**
 * Calcula el total de puntos positivos para un único commit.
 */
function calculateCommitPoints(commit) {
  let points = 0; // Iniciar en 0, solo sumaremos puntos positivos aquí
  const notes = [];

  // Regla 5.1.1: Mensaje válido (+10 pts)
  if (VALID_COMMIT_MESSAGE_REGEX.test(commit.message)) {
    points += POINTS.VALID_MESSAGE;
    notes.push(`+${POINTS.VALID_MESSAGE} (msg válido)`);
  }

  // Regla 5.1.2: Incluye #time (+5 pts)
  if (commit.message.includes('#time')) {
    points += POINTS.INCLUDES_TIME;
    notes.push(`+${POINTS.INCLUDES_TIME} (#time)`);
  }

  // Regla 5.1.3: Atomicity Score (hasta +5 pts)
  const filesChanged = (commit.added?.length || 0) + (commit.modified?.length || 0);
  const linesChanged = commit.stats?.total || 0; // Depende del paso de enriquecimiento
  const atomicityBonus = Math.max(0, ATOMICITY_BASE_POINTS - Math.floor(filesChanged / 3) - Math.floor(linesChanged / 100));
  if (atomicityBonus > 0) {
    points += atomicityBonus;
    notes.push(`+${atomicityBonus} (atomic bonus: ${filesChanged}f/${linesChanged}l)`);
  }

  return { points, notes };
}

/**
 * Procesa los commits de un evento 'push' para asignar puntos (Regla 5.1).
 */
export const processCommitRule = async (event, user) => {
  const commits = event.payload?.commits?.filter(
    c => c.distinct && (c.parents?.length || 0) < 2
  );

  if (!commits?.length) return;

  let currentDailyPoints = (await prisma.pointLedger.aggregate({
    _sum: { points: true },
    where: { userId: user.id, ruleKey: { startsWith: 'commit.' }, createdAt: { gte: startOfDay(new Date()) } },
  }))._sum.points || 0;

  for (const commit of commits) {
    // Aplicar Cap Diario (Regla 5.1.4)
    if (currentDailyPoints >= DAILY_CAP) {
      console.log(`[CommitRule] Límite diario (${DAILY_CAP} pts) alcanzado para ${user.username}.`);
      break;
    }

    // Ignorar Cherry-picks (Regla Adicional)
    if (commit.message.includes('(cherry picked from commit')) continue;
    
    // Manejar Reverts (Regla 5.5.2 con reducción de penalización)
    if (commit.message.startsWith('Revert')) {
      await handleRevertCommit(commit, user);
      continue; // Un revert no otorga puntos positivos
    }

    // Calcular puntos positivos para este commit
    const { points: pointsForCommit, notes } = calculateCommitPoints(commit);
    
    if (pointsForCommit <= 0) continue;

    // Aplicar el cap diario a los puntos calculados
    const pointsToApply = Math.min(pointsForCommit, DAILY_CAP - currentDailyPoints);

    if (pointsToApply > 0) {
      await applyPoints({
        userId: user.id,
        points: pointsToApply,
        ruleKey: 'commit.aggregate', // Clave genérica para puntos de commit
        entityId: commit.id,
        notes: notes.join(', '), // Mensaje para el log visible
        isReversible: true, // Permitir reversión automática
      });
      currentDailyPoints += pointsToApply; // Actualizar el contador diario
    }
  }
};
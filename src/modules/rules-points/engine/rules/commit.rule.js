// RUTA: src/modules/rules-points/engine/rules/commit.rule.js

import { applyPoints } from '../../service/point.service.js';
import prisma from '../../../../config/prisma.js';
import { startOfDay } from 'date-fns';
import { getRuleValue } from '../../../../shared/service/config.service.js';
import { calculateWeightedScore } from '../../service/scoring.calculator.js';
import octokit from '../../../../config/octokit.js';

// Regex para Conventional Commits (feat: ..., fix: ..., etc)
const VALID_COMMIT_MESSAGE_REGEX = /^(feat|fix|docs|style|refactor|test|chore|improvement)(\(.+\))?: .{5,}/;

/**
 * Procesa un commit de reversión para anular *parcialmente* los puntos.
 */
const handleRevertCommit = async (commit, user) => {
  const shaMatch = commit.message.match(/This reverts commit ([a-f0-9]{40})\./);
  if (!shaMatch?.[1]) return;

  const originalCommitSha = shaMatch[1];
  const originalPointEntries = await prisma.pointLedger.findMany({
    where: { entityId: originalCommitSha, isReversible: true },
  });

  if (!originalPointEntries.length) return;

  const reductionFactor = await getRuleValue('PENALTY_REDUCTION_FACTOR', 0.4);

  for (const entry of originalPointEntries) {
    const penaltyPoints = entry.points > 0 
      ? Math.round(-entry.points * reductionFactor)
      : -entry.points;
    const finalPenalty = Math.min(0, penaltyPoints); 

    if (finalPenalty === 0) continue;

    await applyPoints({
      userId: user.id,
      points: finalPenalty,
      ruleKey: 'commit.revert',
      entityId: commit.id,
      notes: `${finalPenalty} pts por revertir commit ${originalCommitSha.substring(0, 7)} (Factor: ${reductionFactor}).`,
      isReversible: false,
    });
  }
};

/**
 * PASO DE ENRIQUECIMIENTO: Obtiene datos detallados del commit desde la API.
 */
async function getEnrichedCommitData(owner, repo, commit) {
  try {
    const commitDetails = await octokit.repos.getCommit({
        owner,
        repo,
        ref: commit.id,
    });
    return {
      stats: commitDetails.data.stats,
      files: commitDetails.data.files.map(f => f.filename),
    };
  } catch (error) {
    console.warn(`[CommitRule] No se pudo enriquecer el commit ${commit.id}. Usando datos del payload.`);
    // Fallback con datos limitados del payload
    return {
      stats: { additions: 0, deletions: 0 },
      files: (commit.added || []).concat(commit.modified || [], commit.removed || []),
    };
  }
}

/**
 * PASO DE CÁLCULO: Calcula los puntos y notas para un commit.
 */
async function calculatePointsForCommit(commit, files, stats) {
  const timeBonus = await getRuleValue('COMMIT_BONUS_TIME', 5);
  const baseRuleKey = 'BASE_COMMIT';
  
  // 1. Cálculo Ponderado
  const { points: weightedPoints, notes: weightedNote } = await calculateWeightedScore(
    baseRuleKey, files, stats, 10
  );

  let totalPoints = weightedPoints;
  let notes = [weightedNote];

  // 2. Bonos Adicionales (no ponderados)
  if (commit.message.includes('#time')) {
    totalPoints += timeBonus;
    notes.push(`+${timeBonus} (#time)`);
  }

  return { totalPointsForCommit: totalPoints, notes };
}


/**
 * Procesa los commits de un evento 'push' para asignar puntos (Lógica Ponderada V2).
 * Esta es la función principal, ahora ajustada para no ignorar mensajes malos, solo penalizarlos.
 */
export const processCommitRule = async (event, user) => {
  const commits = event.payload?.commits?.filter(
    c => c.distinct && (c.parents?.length || 0) < 2
  );

  if (!commits?.length) return; 

  const dailyCap = await getRuleValue('COMMIT_DAILY_CAP', 60);

  let currentDailyPoints = (await prisma.pointLedger.aggregate({
    _sum: { points: true },
    where: { userId: user.id, ruleKey: { startsWith: 'commit.' }, createdAt: { gte: startOfDay(new Date()) } },
  }))._sum.points || 0;

  const [owner, repo] = event.payload.repository.full_name.split('/');

  for (const commit of commits) {
    if (currentDailyPoints >= dailyCap) {
      console.log(`[CommitRule] Límite diario (${dailyCap} pts) alcanzado.`);
      break; 
    }

    // --- Flujo de Reglas por Commit ---
    
    // 1. Manejar casos especiales (Reverts, Cherry-picks)
    if (commit.message.includes('(cherry picked from commit')) continue;
    if (commit.message.startsWith('Revert')) {
      await handleRevertCommit(commit, user);
      continue;
    }
    
    // 2. Validar mensaje (Regla 5.1.1 MODIFICADA)
    // En lugar de ignorar, aplicamos un factor de penalización.
    let penaltyFactor = 1;
    let penaltyNote = '';

    if (!VALID_COMMIT_MESSAGE_REGEX.test(commit.message)) {
      // Obtenemos el factor de castigo (Ej: 0.5 para dar la mitad de puntos)
      penaltyFactor = await getRuleValue('COMMIT_MESSAGE_PENALTY', 0.5); 
      penaltyNote = `(Mensaje no convencional: x${penaltyFactor})`;
      console.log(`[CommitRule] Commit ${commit.id.substring(0,7)} mensaje no convencional. Penalizando con factor ${penaltyFactor}.`);
    }

    // 3. Enriquecer
    const { stats, files } = await getEnrichedCommitData(owner, repo, commit);

    // 4. Calcular Puntos Base
    let { totalPointsForCommit, notes } = await calculatePointsForCommit(commit, files, stats);

    // 5. Aplicar Penalización (Si aplica)
    if (penaltyFactor !== 1) {
        totalPointsForCommit = Math.round(totalPointsForCommit * penaltyFactor);
        notes.push(penaltyNote);
    }

    // Si después de la penalización los puntos son 0 o menos, ahí sí ignoramos
    if (totalPointsForCommit <= 0) continue;

    // 6. Aplicar Cap y Guardar
    const pointsToApply = Math.min(totalPointsForCommit, dailyCap - currentDailyPoints);

    if (pointsToApply > 0) {
      await applyPoints({
        userId: user.id,
        points: pointsToApply,
        ruleKey: 'commit.weighted_aggregate',
        entityId: commit.id,
        notes: notes.join(' '),
        isReversible: true,
      });
      currentDailyPoints += pointsToApply;
    }
  }
};
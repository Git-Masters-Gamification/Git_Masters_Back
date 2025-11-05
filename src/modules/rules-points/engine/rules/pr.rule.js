// RUTA: src/modules/rules-points/engine/rules/pr.rule.js

import { applyPoints } from '../../service/point.service.js';
import prisma from '../../../../config/prisma.js';
import { subDays } from 'date-fns';
import octokit from '../../../../config/octokit.js'; // Cliente de API GitHub

// --- Constantes ---
const POINTS = {
  PR_CREATED: 30,
  PR_MERGED: 80,
  QUALITY_BONUS: 50,
  CHANGE_REQUEST_PENALTY: -10,
  CONFLICT_RESOLVED: 25,
};
const ABUSE_PROTECTION_DAYS = 30;
const PENALTY_REDUCTION_FACTOR = 0.4; // Aplica solo el 40% de las penalizaciones

// --- Funciones Helper ---

/**
 * Maneja la lógica cuando un PR es creado (Regla 5.3.2).
 */
const handlePrOpened = async (pr, author) => {
  // Protección contra abuso (Regla 5.3.7)
  const existingCreationPoints = await prisma.pointLedger.findFirst({
    where: {
      ruleKey: 'pr.creation',
      entityId: pr.head.ref,
      createdAt: { gte: subDays(new Date(), ABUSE_PROTECTION_DAYS) },
    },
  });
  if (existingCreationPoints) return;
  
  // Condición: Checklist presente
  const hasChecklist = /-\s\[[\s|x]\]/.test(pr.body || '');
  if (!hasChecklist) return;

  // Otorgar puntos por creación
  await applyPoints({
    userId: author.id,
    points: POINTS.PR_CREATED,
    ruleKey: 'pr.creation',
    entityId: pr.head.ref,
    notes: `+${POINTS.PR_CREATED} pts por crear el PR #${pr.number} con checklist.`,
    isReversible: true,
  });

  // Otorgar insignia "Rompiendo el Hielo" por el primer PR
  await awardBadge(author.id, 'rompiendo_el_hielo');
};

/**
 * Otorga los puntos base por merge si no se ha hecho recientemente (Regla 5.3.3).
 */
async function applyMergePoints(pr, author) {
  const existingMergePoints = await prisma.pointLedger.findFirst({
    where: {
      ruleKey: 'pr.merge',
      entityId: pr.head.ref,
      createdAt: { gte: subDays(new Date(), ABUSE_PROTECTION_DAYS) },
    },
  });
  if (!existingMergePoints) {
    await applyPoints({
      userId: author.id,
      points: POINTS.PR_MERGED,
      ruleKey: 'pr.merge',
      entityId: pr.head.ref,
      notes: `+${POINTS.PR_MERGED} pts por el merge del PR #${pr.number}.`,
      isReversible: true,
    });
  }
}

/**
 * Guarda un registro de la rama mergeada para la regla de borrado posterior.
 */
async function recordMergedBranch(pr, author) {
  await prisma.mergedBranch.create({
    data: {
      branchName: pr.head.ref,
      prId: pr.id,
      authorId: author.id,
    }
  }).catch(() => {}); // Ignorar error si ya existe
}

/**
 * Llama a la API de GitHub para obtener datos adicionales y aplica el bono/penalización (Reglas 5.3.4, 5.3.5).
 */
async function applyQualityBonusAndPenalties(pr, author) {
  let ciPassed = false;
  let openChangeRequestsCount = 0;
  
  try {
    const [owner, repo] = pr.head.repo.full_name.split('/');
    
    // Obtener estado de checks (CI/CD)
    const checks = await octokit.checks.listForRef({ owner, repo, ref: pr.head.sha });
    const hasFailingChecks = checks.data.check_runs.some(
      run => run.conclusion !== 'success' && run.conclusion !== 'skipped' && run.status === 'completed'
    );
    ciPassed = !hasFailingChecks;

    // Obtener revisiones para contar 'changes_requested'
    const reviews = await octokit.pulls.listReviews({ owner, repo, pull_number: pr.number });
    const latestReviews = new Map();
    for (const review of reviews.data) {
        if (!latestReviews.has(review.user.login) || new Date(review.submitted_at) > new Date(latestReviews.get(review.user.login).submitted_at)) {
            latestReviews.set(review.user.login, review);
        }
    }
    openChangeRequestsCount = [...latestReviews.values()].filter(r => r.state === 'CHANGES_REQUESTED').length;

  } catch (error) {
    console.error(`[PR Rule] Error llamando a la API de GitHub para enriquecer datos:`, error);
    // Continuar aunque falle el enriquecimiento, pero no se aplicará bono/penalización
  }

  // Aplicar Bono de Calidad
  if (ciPassed && openChangeRequestsCount === 0) {
    await applyPoints({
      userId: author.id, points: POINTS.QUALITY_BONUS, ruleKey: 'pr.merge.quality_bonus',
      entityId: pr.id.toString(), notes: `+${POINTS.QUALITY_BONUS} pts (bono calidad) por merge limpio PR #${pr.number}.`,
      isReversible: true,
    });
  } 
  // Aplicar Penalización por Change Requests (con reducción)
  else if (openChangeRequestsCount > 0) {
    const basePenalty = openChangeRequestsCount * POINTS.CHANGE_REQUEST_PENALTY;
    const reducedPenalty = Math.round(basePenalty * PENALTY_REDUCTION_FACTOR);
    const finalPenalty = Math.min(0, reducedPenalty);
    if (finalPenalty < 0) {
        await applyPoints({
            userId: author.id, points: finalPenalty, ruleKey: 'pr.merge.change_request_penalty',
            entityId: pr.id.toString(), notes: `${finalPenalty} pts por ${openChangeRequestsCount} change requests sin resolver (reducido).`,
            isReversible: true,
        });
    }
  }
}

/**
 * Otorga puntos a la persona que resolvió conflictos e hizo el merge (Regla 5.3.6).
 */
async function applyConflictResolverPoints(pr, author) {
  const mergerUsername = pr.merged_by?.login;
  if (mergerUsername && mergerUsername !== author.username) {
    const merger = await prisma.user.findUnique({ where: { username: mergerUsername } });
    if (merger) {
      await applyPoints({
        userId: merger.id, points: POINTS.CONFLICT_RESOLVED, ruleKey: 'pr.resolve_conflicts',
        entityId: pr.merge_commit_sha, notes: `+${POINTS.CONFLICT_RESOLVED} pts por resolver conflictos y mergear PR #${pr.number}.`,
        isReversible: true,
      });
    }
  }
}

/**
 * Maneja la transferencia de puntos de commits en un squash merge (Regla 5.3.1).
 */
async function handleSquashMergePointTransfer(pr, author) {
  // Heurística simple: si el PR mergeado tiene solo 1 commit en el payload del evento.
  const isLikelySquash = pr.commits === 1 && pr.merged;
  if (!isLikelySquash) return;

  console.log(`[PR Rule] PR #${pr.number} detectado como squash merge. Transfiriendo puntos...`);
  let totalPointsToTransfer = 0;
  
  try {
    const [owner, repo] = pr.head.repo.full_name.split('/');
    const commitsResponse = await octokit.pulls.listCommits({ owner, repo, pull_number: pr.number });
    const originalCommitSHAs = commitsResponse.data.map(commit => commit.sha);
    if (!originalCommitSHAs.length) return;

    const commitPointEntries = await prisma.pointLedger.findMany({
      where: { entityId: { in: originalCommitSHAs }, ruleKey: { startsWith: 'commit.' }, isReversible: true },
    });
    if (!commitPointEntries.length) return;

    for (const entry of commitPointEntries) {
      if (entry.points > 0) { // Solo transferir puntos positivos
        totalPointsToTransfer += entry.points;
        await applyPoints({ // Anular puntos originales
          userId: entry.userId, points: -entry.points, ruleKey: 'commit.squash_reversal',
          entityId: entry.entityId, notes: `-${entry.points} pts anulados por squash merge en PR #${pr.number}.`,
          isReversible: false,
        });
      }
    }

    if (totalPointsToTransfer > 0) { // Otorgar puntos transferidos al autor del PR
      await applyPoints({
        userId: author.id, points: totalPointsToTransfer, ruleKey: 'pr.squash_commit_transfer',
        entityId: pr.merge_commit_sha, notes: `+${totalPointsToTransfer} pts transferidos de commits (squash merge) PR #${pr.number}.`,
        isReversible: true,
      });
    }
  } catch (error) {
    console.error(`[PR Rule] Error procesando transferencia por squash merge PR #${pr.number}:`, error);
  }
}

/**
 * Orquesta todas las acciones que ocurren cuando un PR es mergeado.
 */
const handlePrMerged = async (pr, author) => {
  await applyMergePoints(pr, author);
  await recordMergedBranch(pr, author);
  await applyQualityBonusAndPenalties(pr, author);
  await applyConflictResolverPoints(pr, author);
  await handleSquashMergePointTransfer(pr, author); // LLAMADA A LA LÓGICA DE SQUASH
};

/**
 * Punto de entrada principal para las reglas de Pull Request.
 */
export const processPullRequestRule = async (event, user) => {
  const pr = event.payload.pull_request;
  const action = event.payload.action;

  switch (action) {
    case 'opened':
      await handlePrOpened(pr, user);
      break;
    case 'closed':
      if (pr.merged) {
        await handlePrMerged(pr, user);
      }
      break;
  }
};
// RUTA: src/modules/rules-points/engine/rules/pr.rule.js

import { applyPoints } from '../../service/point.service.js';
import prisma from '../../../../config/prisma.js';
import { subDays } from 'date-fns';
import octokit from '../../../../config/octokit.js';
import { getRuleValue } from '../../../../shared/service/config.service.js';
import { calculateWeightedScore } from '../../service/scoring.calculator.js';

// --- Funciones Helper (Ayudantes) ---

/**
 * Regla 5.3.2: Otorga puntos por crear un PR con checklist.
 */
const handlePrOpened = async (pr, author) => {
  const abuseProtectionDays = await getRuleValue('PR_ABUSE_PROTECTION_DAYS', 30);
  
  // Evitar duplicados recientes
  const existingCreationPoints = await prisma.pointLedger.findFirst({
    where: { 
        ruleKey: 'pr.creation', 
        entityId: String(pr.head.ref), 
        createdAt: { gte: subDays(new Date(), abuseProtectionDays) } 
    },
  });
  if (existingCreationPoints) return;
  
  // Validar checklist
  const hasChecklist = /-\s\[[\s|x]\]/.test(pr.body || '');
  if (!hasChecklist) return;

  const points = await getRuleValue('PR_CREATED', 30);
  
  await applyPoints({
    userId: author.id, 
    points, 
    ruleKey: 'pr.creation', 
    entityId: String(pr.head.ref),
    notes: `+${points} pts por crear el PR #${pr.number} con checklist.`, 
    isReversible: true,
  });
};

/**
 * Regla 5.3.3: Otorga puntos base ponderados por merge.
 */
async function applyMergePoints(pr, author, files, stats) {
  const abuseProtectionDays = await getRuleValue('PR_ABUSE_PROTECTION_DAYS', 30);
  const existingMergePoints = await prisma.pointLedger.findFirst({
    where: { 
        ruleKey: 'pr.merge', 
        entityId: String(pr.head.ref), 
        createdAt: { gte: subDays(new Date(), abuseProtectionDays) } 
    },
  });

  if (existingMergePoints) return;

  // Calculamos puntos ponderados usando la regla base de PR
  const { points, notes: weightedNote } = await calculateWeightedScore(
    'PR_MERGED', files, stats, 40 // 40 es el default si no encuentra la regla
  );

  await applyPoints({
    userId: author.id, 
    points, 
    ruleKey: 'pr.merge', 
    entityId: String(pr.head.ref),
    notes: `${weightedNote} (Merge PR #${pr.number})`, 
    isReversible: true,
  });
}

/**
 * Ayudante: Guarda un registro de la rama mergeada para la regla de borrado.
 */
async function recordMergedBranch(pr, author) {
  try {
      await prisma.mergedBranch.create({
        data: { 
            branchName: pr.head.ref, 
            prId: String(pr.id), 
            authorId: author.id 
        }
      });
  } catch (e) {
      console.error(`[PR Rule] No se pudo registrar la rama mergeada ${pr.head.ref}:`, e.message);
  }
}

/**
 * Reglas 5.3.4 y 5.3.5: Aplica bono/penalización por calidad de PR.
 */
async function applyQualityBonusAndPenalties(pr, author, checks, reviews) {
  // Verificar CI/CD
  const hasFailingChecks = checks.data.check_runs.some(
    run => run.conclusion !== 'success' && run.conclusion !== 'skipped' && run.status === 'completed'
  );
  const ciPassed = !hasFailingChecks;

  // Verificar Reviews y Cambios Solicitados
  const latestReviews = new Map();
  if (reviews && reviews.data) {
      reviews.data.forEach(review => {
        if (!latestReviews.has(review.user.login) || new Date(review.submitted_at) > new Date(latestReviews.get(review.user.login).submitted_at)) {
            latestReviews.set(review.user.login, review);
        }
      });
  }
  const openChangeRequestsCount = [...latestReviews.values()].filter(r => r.state === 'CHANGES_REQUESTED').length;

  const qualityBonus = await getRuleValue('PR_BONUS_QUALITY', 50);
  const changePenalty = await getRuleValue('PENALTY_PR_CHANGE_REQUEST', -10);
  const reductionFactor = await getRuleValue('PENALTY_REDUCTION_FACTOR', 0.4);

  if (ciPassed && openChangeRequestsCount === 0) {
    await applyPoints({
      userId: author.id, 
      points: qualityBonus, 
      ruleKey: 'pr.merge.quality_bonus',
      entityId: pr.id.toString(), 
      notes: `+${qualityBonus} pts (bono calidad) por merge limpio PR #${pr.number}.`,
      isReversible: true,
    });
  } else if (openChangeRequestsCount > 0) {
    const rawPenalty = openChangeRequestsCount * changePenalty;
    const finalPenalty = Math.min(0, Math.round(rawPenalty * reductionFactor));
    
    if (finalPenalty < 0) {
        await applyPoints({
            userId: author.id, 
            points: finalPenalty, 
            ruleKey: 'pr.merge.change_request_penalty',
            entityId: pr.id.toString(), 
            notes: `${finalPenalty} pts por ${openChangeRequestsCount} change requests sin resolver (reducido).`,
            isReversible: true,
        });
    }
  }
}

/**
 * Regla 5.3.6: Otorga puntos a quien resuelve conflictos.
 */
async function applyConflictResolverPoints(pr, author) {
  const mergerUsername = pr.merged_by?.login;
  if (!mergerUsername || mergerUsername === author.username) return;

  const merger = await prisma.user.findUnique({ where: { username: mergerUsername } });
  if (merger) {
    const points = await getRuleValue('PR_CONFLICT_RESOLVED', 25);
    await applyPoints({
      userId: merger.id, 
      points, 
      ruleKey: 'pr.resolve_conflicts',
      entityId: String(pr.merge_commit_sha || pr.id), 
      notes: `+${points} pts por resolver conflictos y mergear PR #${pr.number}.`,
      isReversible: true,
    });
  }
}

/**
 * Regla 5.3.1: Transfiere puntos de commits en un squash merge.
 */
async function handleSquashMergePointTransfer(pr, author) {
  // Si solo hay 1 commit en el PR mergeado, es probable que sea Squash
  const isLikelySquash = pr.commits === 1 && pr.merged;
  if (!isLikelySquash) return;

  console.log(`[PR Rule] PR #${pr.number} detectado como squash merge...`);
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

    // Revertimos los puntos individuales
    for (const entry of commitPointEntries) {
      if (entry.points > 0) {
        totalPointsToTransfer += entry.points;
        await applyPoints({ 
          userId: entry.userId, 
          points: -entry.points, 
          ruleKey: 'commit.squash_reversal',
          entityId: entry.entityId, 
          notes: `-${entry.points} pts anulados por squash merge en PR #${pr.number}.`,
          isReversible: false,
        });
      }
    }
    
    // Otorgamos el total consolidado al autor
    if (totalPointsToTransfer > 0) {
      await applyPoints({
        userId: author.id, 
        points: totalPointsToTransfer, 
        ruleKey: 'pr.squash_commit_transfer',
        entityId: String(pr.merge_commit_sha || pr.id), 
        notes: `+${totalPointsToTransfer} pts transferidos de commits (squash merge) PR #${pr.number}.`,
        isReversible: true,
      });
    }
  } catch (error) {
    console.error(`[PR Rule] Error squash merge:`, error);
  }
}

/**
 * Orquesta todas las acciones que ocurren cuando un PR es mergeado.
 */
const handlePrMerged = async (pr, author) => {
  // 1. Paso de Enriquecimiento (Gather Data)
  let files = [], stats = { additions: 0, deletions: 0 }, checks = { data: { check_runs: [] } }, reviews = { data: [] };
  try {
    const [owner, repo] = pr.head.repo.full_name.split('/');
    
    const prFilesResponse = await octokit.pulls.listFiles({ owner, repo, pull_number: pr.number });
    files = prFilesResponse.data.map(f => f.filename);
    stats = prFilesResponse.data.reduce((acc, file) => {
      acc.additions += file.additions;
      acc.deletions += file.deletions;
      return acc;
    }, { additions: 0, deletions: 0 });
    
    // Intentamos obtener checks y reviews, si falla seguimos
    try {
        checks = await octokit.checks.listForRef({ owner, repo, ref: pr.head.sha });
        reviews = await octokit.pulls.listReviews({ owner, repo, pull_number: pr.number });
    } catch (e) { console.warn("[PR Rule] No se pudieron obtener checks/reviews", e.message); }

  } catch (error) {
    console.error(`[PR Rule] Error API GitHub (Enriquecimiento):`, error);
  }

  // 2. Ejecutar Lógica de Puntos
  await applyMergePoints(pr, author, files, stats);
  await recordMergedBranch(pr, author);
  await applyQualityBonusAndPenalties(pr, author, checks, reviews);
  await applyConflictResolverPoints(pr, author);
  await handleSquashMergePointTransfer(pr, author);
};

/**
 * Punto de entrada principal para las reglas de Pull Request.
 */
export const processPullRequestRule = async (event, user) => {
  const pr = event.payload.pull_request;
  const action = event.payload.action;

  console.log(`[PRRule] Procesando PR #${pr.number} Acción: ${action}`);

  switch (action) {
    case 'opened': 
        await handlePrOpened(pr, user); 
        break;
    case 'closed': 
        if (pr.merged) await handlePrMerged(pr, user); 
        break;
  }
};
// RUTA: src/modules/rules-points/engine/rules/branch.rule.js

import { applyPoints } from '../../service/point.service.js';
import prisma from '../../../../config/prisma.js';
import { differenceInDays } from 'date-fns';
import { getRuleValue } from '../../../../shared/service/config.service.js';

// Regex: TIPO-NUMERO_desc_breve (Ej: FEAT-123_login_page)
const VALID_BRANCH_NAME_REGEX = /^[A-Z]+-\d+_[a-z0-9]+_[a-z0-9-_]+$/;
const PROTECTED_BRANCHES = ['refs/heads/main', 'refs/heads/develop', 'refs/heads/master'];
const EXCEPTION_ROLES = ['ADMIN', 'INTEGRATOR', 'MAINTAINER'];

/**
 * Otorga puntos por crear una rama con una convención de nombre válida.
 */
const handleBranchCreation = async (event, user) => {
  if (event.payload.ref_type !== 'branch') return;

  const branchName = event.payload.ref;

  // Solo damos puntos si cumple la regex estricta
  if (VALID_BRANCH_NAME_REGEX.test(branchName)) {
    // ✅ VALOR DINÁMICO
    const points = await getRuleValue('BRANCH_VALID_NAME', 20);

    await applyPoints({
      userId: user.id,
      points: points,
      ruleKey: 'branch.creation.valid_name',
      entityId: branchName,
      notes: `+${points} pts por crear la rama con nombre válido: ${branchName}`,
      isReversible: true,
    });
  }
};

/**
 * Otorga puntos por borrar una rama feature después de ser mergeada.
 */
const handleBranchDeletion = async (event, user) => {
  if (event.payload.ref_type !== 'branch') return;
    
  const branchName = event.payload.ref;
    
  // Buscamos si esta rama fue mergeada recientemente
  const mergedInfo = await prisma.mergedBranch.findUnique({
      where: { branchName },
  });

  if (!mergedInfo) return; // Si no fue mergeada, no damos puntos por borrarla

  // Calcular días desde el merge
  const daysSinceMerge = differenceInDays(new Date(), new Date(mergedInfo.mergedAt || mergedInfo.createdAt));
  
  // Limpiamos el registro de merge
  await prisma.mergedBranch.delete({ where: { branchName } });

  // Si pasaron más de 14 días, no damos puntos (limpieza tardía)
  if (daysSinceMerge > 14) return;

  // Verificar permisos (solo el autor o admins deberían recibir puntos/borrar)
  const isAllowedToDelete = user.id === mergedInfo.authorId || EXCEPTION_ROLES.includes(user.role);
  
  if (isAllowedToDelete) {
      // ✅ VALOR DINÁMICO
      const points = await getRuleValue('BRANCH_DELETE_AFTER_MERGE', 40);

      await applyPoints({
        userId: user.id,
        points: points,
        ruleKey: 'branch.delete.after_merge',
        entityId: branchName,
        notes: `+${points} pts por borrar la rama '${branchName}' a tiempo (${daysSinceMerge} días).`,
        isReversible: false,
      });
  }
};


/**
 * Aplica penalizaciones por push directo o forzado a ramas protegidas.
 */
const handleProtectedBranchPush = async (event, user) => {
  const branchRef = event.payload.ref;
  
  if (!PROTECTED_BRANCHES.includes(branchRef)) return;

  const branchName = branchRef.replace('refs/heads/', '');

  // ✅ VALORES DINÁMICOS
  const forcePenaltyBase = await getRuleValue('PENALTY_FORCE_PUSH', -500);
  const directPenaltyBase = await getRuleValue('PENALTY_DIRECT_PUSH', -150);
  const reductionFactor = await getRuleValue('PENALTY_REDUCTION_FACTOR', 0.4);

  // 1. Penalización por Force-push (Muy grave)
  if (event.payload.forced) {
    const penaltyPoints = Math.round(forcePenaltyBase * reductionFactor);
    
    await applyPoints({
      userId: user.id,
      points: penaltyPoints,
      ruleKey: 'branch.push.force_push_penalty',
      entityId: event.payload.after,
      notes: `${penaltyPoints} pts (reducido) por hacer force-push a rama protegida '${branchName}'.`,
      isReversible: false,
    });
    return; 
  }

  // 2. Penalización por Push Directo (Sin PR)
  // Excluímos roles que tienen permiso de hacer esto (Admins)
  if (!EXCEPTION_ROLES.includes(user.role)) {
    const penaltyPoints = Math.round(directPenaltyBase * reductionFactor);

    await applyPoints({
      userId: user.id,
      points: penaltyPoints,
      ruleKey: 'branch.push.direct_push_penalty',
      entityId: event.payload.after,
      notes: `${penaltyPoints} pts (reducido) por push directo a rama protegida '${branchName}'.`,
      isReversible: false,
    });
  }
};

/**
 * Punto de entrada principal para las reglas de Ramas.
 */
export const processBranchRule = async (event, user) => {
  // GitHub manda el tipo de evento en headers o payload
  const eventType = event.type || event.headers?.['x-github-event'] || 'unknown';

  switch (eventType) {
    case 'create':
      await handleBranchCreation(event, user);
      break;
    case 'push':
      await handleProtectedBranchPush(event, user);
      break;
    case 'delete':
      await handleBranchDeletion(event, user);
      break;
  }
};
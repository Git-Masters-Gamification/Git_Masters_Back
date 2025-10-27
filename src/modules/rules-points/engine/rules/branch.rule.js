// RUTA: src/modules/rules-points/engine/rules/branch.rule.js

import { applyPoints } from '../../service/point.service.js';
import prisma from '../../../../config/prisma.js'; // Asegúrate que la ruta sea correcta
import { subDays } from 'date-fns';

const VALID_BRANCH_NAME_REGEX = /^[A-Z]+-\d+_[a-z0-9]+_[a-z0-9-_]+$/;
const PROTECTED_BRANCHES = ['refs/heads/main', 'refs/heads/develop'];
const EXCEPTION_ROLES = ['ADMIN', 'INTEGRATOR']; // Roles exentos de penalización por push directo
const POINTS = {
  VALID_BRANCH_NAME: 20,
  DELETE_AFTER_MERGE: 40,
  DIRECT_PUSH_PENALTY: -150, // Valor según especificación
  FORCE_PUSH_PENALTY: -500,  // Valor según especificación
};
const PENALTY_REDUCTION_FACTOR = 0.4; // Aplica solo el 40% de la penalización

/**
 * Otorga puntos por crear una rama con una convención de nombre válida (Regla 5.2.1).
 */
const handleBranchCreation = async (event, user) => {
  // Solo aplicar a eventos de creación de ramas
  if (event.payload.ref_type !== 'branch') return;

  const branchName = event.payload.ref;

  // Verificar si el nombre cumple la convención
  if (VALID_BRANCH_NAME_REGEX.test(branchName)) {
    await applyPoints({
      userId: user.id,
      points: POINTS.VALID_BRANCH_NAME,
      ruleKey: 'branch.creation.valid_name',
      entityId: branchName,
      notes: `+${POINTS.VALID_BRANCH_NAME} pts por crear la rama con nombre válido: ${branchName}`,
      isReversible: true, // Una creación podría revertirse si se borra la rama
    });
  }
};

/**
 * Otorga puntos por borrar una rama feature después de ser mergeada (Regla 5.2.2).
 */
const handleBranchDeletion = async (event, user) => {
  // Solo aplicar a eventos de borrado de ramas
  if (event.payload.ref_type !== 'branch') return;
    
  const branchName = event.payload.ref;
    
  // Buscar si esta rama fue registrada como mergeada
  const mergedInfo = await prisma.mergedBranch.findUnique({
      where: { branchName },
  });

  // Si no hay registro o ya pasaron más de 14 días, no hacer nada
  if (!mergedInfo) return;
  const daysSinceMerge = (new Date() - mergedInfo.mergedAt) / (1000 * 60 * 60 * 24);
  if (daysSinceMerge > 14) return;

  // Verificar si quien borra es el autor original del PR o un rol autorizado
  const isAllowedToDelete = user.id === mergedInfo.authorId || EXCEPTION_ROLES.includes(user.role);
  if (!isAllowedToDelete) return;

  // Otorgar los puntos
  await applyPoints({
      userId: user.id, // Los puntos son para quien borra la rama
      points: POINTS.DELETE_AFTER_MERGE,
      ruleKey: 'branch.delete.after_merge',
      entityId: branchName,
      notes: `+${POINTS.DELETE_AFTER_MERGE} pts por borrar la rama '${branchName}' después del merge.`,
      isReversible: false, // Borrar una rama no se revierte fácilmente
  });

  // Eliminar el registro para evitar otorgar puntos de nuevo si se recrea/borra la rama
  await prisma.mergedBranch.delete({ where: { branchName } });
};


/**
 * Aplica penalizaciones por push directo o forzado a ramas protegidas (Reglas 5.2.3 y 5.2.4).
 */
const handleProtectedBranchPush = async (event, user) => {
  const branchRef = event.payload.ref;
  
  // Retorno temprano si la rama no está protegida
  if (!PROTECTED_BRANCHES.includes(branchRef)) return;

  const branchName = branchRef.replace('refs/heads/', '');

  // Penalización por Force-push (Regla 5.2.4)
  if (event.payload.forced) {
    const penaltyPoints = Math.round(POINTS.FORCE_PUSH_PENALTY * PENALTY_REDUCTION_FACTOR);
    await applyPoints({
      userId: user.id,
      points: penaltyPoints,
      ruleKey: 'branch.push.force_push_penalty',
      entityId: event.payload.after, // SHA del commit forzado
      notes: `${penaltyPoints} pts por hacer force-push a la rama protegida '${branchName}' (Penalización reducida). Requiere revisión.`,
      isReversible: false, // Requiere proceso de apelación manual
    });
    // Aquí se podría añadir lógica para enviar una alerta a administradores
    return; // La penalización por force-push es más grave y excluye la otra
  }

  // Penalización por Push Directo (Regla 5.2.3)
  // Aplicar solo si el usuario no tiene un rol exento
  if (!EXCEPTION_ROLES.includes(user.role)) {
    const penaltyPoints = Math.round(POINTS.DIRECT_PUSH_PENALTY * PENALTY_REDUCTION_FACTOR);
    await applyPoints({
      userId: user.id,
      points: penaltyPoints,
      ruleKey: 'branch.push.direct_push_penalty',
      entityId: event.payload.after, // SHA del último commit en el push
      notes: `${penaltyPoints} pts por push directo a la rama protegida '${branchName}' (Penalización reducida).`,
      isReversible: false, // Requiere proceso de apelación manual
    });
     // Aquí se podría añadir lógica para enviar una alerta a administradores
  }
};

/**
 * Punto de entrada principal para las reglas de Ramas. Es llamado por el ruleEngine.
 */
export const processBranchRule = async (event, user) => {
  // El 'event' que recibe puede estar enriquecido, aunque estas reglas no lo usan
  switch (event.eventType) {
    case 'create': // Evento cuando se crea una rama o tag
      await handleBranchCreation(event, user);
      break;
    case 'push': // Evento cuando se empujan commits
      await handleProtectedBranchPush(event, user);
      break;
    case 'delete': // Evento cuando se borra una rama o tag
      await handleBranchDeletion(event, user);
      break;
  }
};
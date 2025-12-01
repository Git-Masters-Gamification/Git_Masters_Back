// RUTA: src/modules/rules-points/engine/rules/review.rule.js

import { applyPoints } from '../../service/point.service.js';
import prisma from '../../../../config/prisma.js';
//  1. IMPORTAR EL SERVICIO DE CONFIGURACIÓN
import { getRuleValue } from '../../../../shared/service/config.service.js';

const VALID_TAGS = ['#Diseño', '#Estilo', '#Pruebas', '#Seguridad', '#Performance'];

/**
 * Procesa los eventos de revisión de Pull Request.
 * Otorga puntos por revisiones aprobadas o con cambios solicitados.
 */
export const processReviewRule = async (event, reviewerUser) => {
  // Solo procesar cuando una revisión es enviada
  if (event.payload.action !== 'submitted') return;

  const review = event.payload.review;
  const pr = event.payload.pull_request;
  const reviewState = review.state;

  // Regla: Solo otorgar puntos por revisiones constructivas
  if (reviewState !== 'approved' && reviewState !== 'changes_requested') return;
  
  // Protección contra abuso: Una sola recompensa por PR y por revisor
  const existingReviewPoints = await prisma.pointLedger.findFirst({
    where: {
      userId: reviewerUser.id,
      ruleKey: { startsWith: 'review.' },
      entityId: pr.id.toString(),
    },
  });
  if (existingReviewPoints) return;

  //  2. OBTENER VALORES DINÁMICOS DE LA BD
  const basePoints = await getRuleValue('REVIEW_CONSTRUCTIVE', 10);
  const tagBonusPoints = await getRuleValue('REVIEW_TAG_BONUS', 20);

  let totalPoints = 0;
  const notes = [];

  // Puntos base
  totalPoints += basePoints;
  notes.push(`+${basePoints} pts por revisión en PR #${pr.number}`);

  // Bono por uso de etiquetas en cambios solicitados
  if (reviewState === 'changes_requested' && review.body) {
    const foundTag = VALID_TAGS.find(tag => review.body.includes(tag));
    if (foundTag) {
      totalPoints += tagBonusPoints;
      notes.push(`+${tagBonusPoints} pts por usar la etiqueta '${foundTag}'`);
    }
  }

  if (totalPoints > 0) {
    await applyPoints({
      userId: reviewerUser.id,
      points: totalPoints,
      ruleKey: 'review.submission',
      entityId: pr.id.toString(),
      notes: notes.join(', '),
      isReversible: true,
    });
  }
};
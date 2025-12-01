// RUTA: src/modules/rules-points/engine/rules/other.rule.js

import { applyPoints } from '../../service/point.service.js';
//  1. IMPORTAR EL SERVICIO DE CONFIGURACIÓN
import { getRuleValue } from '../../../../shared/service/config.service.js';

const SEMANTIC_VERSION_REGEX = /^v\d+\.\d+\.\d+$/;

const handleReleasePublished = async (event, user) => {
  const release = event.payload.release;
  
  if (SEMANTIC_VERSION_REGEX.test(release.tag_name) && release.body) {
    //  2. OBTENER VALOR DINÁMICO DE LA BD
    const points = await getRuleValue('RELEASE_PUBLISHED', 50);

    await applyPoints({
      userId: user.id,
      points: points,
      ruleKey: 'release.semantic.creation',
      entityId: release.id.toString(),
      notes: `+${points} pts por publicar el release semántico ${release.tag_name} con changelog.`,
      isReversible: true,
    });
  }
};

export const processOtherEventsRule = async (event, user) => {
  if (event.eventType === 'release' && event.payload.action === 'published') {
    await handleReleasePublished(event, user);
  }
};
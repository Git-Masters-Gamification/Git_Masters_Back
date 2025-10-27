// ==========================================================
// CHEDULER SERVICE — Tareas automáticas (cron jobs)
// Ruta: src/shared/validators/scheduler.service.js
// ==========================================================

import cron from 'node-cron';

// Importación corregida (ruta real del servicio de insignias)
import {
  evaluateDailyBadges,
  evaluateMonthlyBadges,
} from '../../modules/badges/service/badges.service.js';

/**
 * Función placeholder para futuros reconocimientos especiales
 * (por ejemplo, "Top Reviewer Mensual").
 */
async function assignTopReviewerAward() {
  console.log('[Scheduler] Lógica para Top Reviewer Mensual no implementada.');
}

/**
 * Inicializa todas las tareas programadas (cron jobs) de la aplicación.
 */
export function initializeSchedulers() {
  const cronOptions = { timezone: 'America/Bogota' };

  // Tarea para insignias DIARIAS (todos los días a las 3:00 AM)
  cron.schedule(
    '0 3 * * *',
    () => {
      console.log(
        `[${new Date().toISOString()}] Ejecutando tarea de insignias diarias...`
      );
      evaluateDailyBadges();
    },
    cronOptions
  );

  // Tarea para insignias MENSUALES (el día 1 de cada mes a las 4:00 AM)
  cron.schedule(
    '0 4 1 * *',
    () => {
      console.log(
        `[${new Date().toISOString()}] Ejecutando tarea de insignias mensuales...`
      );
      evaluateMonthlyBadges();
      assignTopReviewerAward();
    },
    cronOptions
  );

  console.log(' Tareas programadas (cron jobs) inicializadas.');
}
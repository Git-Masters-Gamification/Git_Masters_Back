// --- Importación de todos los módulos de documentación ---

const authDocs = safeRequire('../modules/auth/auth.docs');
const dashboardDocs = safeRequire('../modules/dashboard/dashboard.docs');
const eventsDocs = safeRequire('../modules/events/events.docs');
const insigniasDocs = safeRequire('../modules/insignias-rangos/insignias-rangos.docs');
const profileDocs = safeRequire('../modules/profile/profile.docs');
const rulesPointsDocs = safeRequire('../modules/rules-points/rules-points.docs');
const webhooksDocs = safeRequire('../modules/webhooks/webhooks.docs');
// const adminDocs = safeRequire('../modules/admin-panel/admin-panel.docs');

const leaderboardDocs = safeRequire('../modules/leaderboard/leaderboard.docs');
const rankingsDocs = safeRequire('../modules/rankings/rankings.docs');
const teamsDocs = safeRequire('../modules/teams/teams.docs');

// --- Fusión de todas las especificaciones ---
const finalSpec = deepmerge.all([
  baseSpec,
  authDocs,
  dashboardDocs,
  eventsDocs,
  insigniasDocs,
  profileDocs, 
  rulesPointsDocs,
  webhooksDocs,
  // adminDocs,
  leaderboardDocs,
  rankingsDocs,
  teamsDocs,
]);

export default finalSpec;

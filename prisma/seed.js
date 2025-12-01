import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// --- 1. DATOS DE LOS RANGOS ---
const ranksData = [
  { name: 'Iniciado', pointsRequired: 0, color: '#6A737D' },
  { name: 'Committer', pointsRequired: 500, color: '#28A745' },
  { name: 'Contributor', pointsRequired: 1500, color: '#0366D6' },
  { name: 'Integrator', pointsRequired: 3000, color: '#6F42C1' },
  { name: 'Maintainer', pointsRequired: 5000, color: '#D73A49' },
  { name: 'Git Master', pointsRequired: 8000, color: '#000000' },
];

// --- 2. DATOS DE LAS INSIGNIAS ---
const badgesData = [
  // --- Insignias a Largo Plazo ---
  {
    key: 'commit_perfecto',
    name: 'Commit Perfecto',
    description: 'Realiza 30 commits válidos en 30 días con una alta tasa de atomicidad.',
    criteria: {
      type: 'COMMIT_STREAK',
      durationDays: 30,
      minCommits: 30,
      minAtomicityRate: 0.6,
    },
  },
  {
    key: 'revisor_experto',
    name: 'Revisor Experto',
    description: 'Completa 50 revisiones en 30 días, con al menos 15 que resultaron en cambios.',
    criteria: {
      type: 'REVIEW_MILESTONE',
      durationDays: 30,
      minReviews: 50,
      minCorrectedReviews: 15,
    },
  },
  {
    key: 'guardian_de_la_calidad',
    name: 'Guardián de la Calidad',
    description: 'Otorgado mensualmente al revisor con más problemas válidos detectados.',
    criteria: {
      type: 'MONTHLY_AWARD',
      award: 'TOP_REVIEWER',
      minTarget: 10,
      pointsReward: 300
    },
  },
  // --- Insignias de Hitos ---
  {
    key: 'rompiendo_el_hielo',
    name: 'Rompiendo el Hielo',
    description: 'Otorgada por crear tu primer Pull Request.',
    criteria: {
      type: 'FIRST_PULL_REQUEST',
      count: 1,
    },
  },
  {
    key: 'el_planificador',
    name: 'El Planificador',
    description: 'Otorgada por crear tu primera rama siguiendo la convención del proyecto.',
    criteria: {
      type: 'FIRST_VALID_BRANCH',
      count: 1,
    },
  },
];

// --- 3. REGLAS DE PUNTUACIÓN DINÁMICA ---
const scoringRulesData = [
  // --- COMMITS ---
  { key: 'COMMIT_BASE', label: 'Commit Base', value: 5, type: 'BASE', category: 'EVENT', description: 'Puntos base por cualquier commit válido.' },
  { key: 'COMMIT_BONUS_CONVENTIONAL', label: 'Bono Convencional', value: 8, type: 'BASE', category: 'EVENT', description: 'Extra por usar Conventional Commits.' },
  { key: 'COMMIT_BONUS_TIME', label: 'Bono Time', value: 5, type: 'BASE', category: 'EVENT', description: 'Extra por incluir #time tracker.' },
  { key: 'COMMIT_DAILY_CAP', label: 'Tope Diario Commits', value: 60, type: 'LIMIT', category: 'LIMIT', description: 'Máximo de puntos por commits al día.' },
  { key: 'COMMIT_WEIGHTED_AGGREGATE', label: 'Puntos por Commit (Ponderado)', value: 0, type: 'BASE', category: 'EVENT', description: 'Regla contenedora para el cálculo dinámico de puntos por commit' },

  // --- PULL REQUESTS ---
  { key: 'PR_CREATED', label: 'PR Creado', value: 30, type: 'BASE', category: 'EVENT', description: 'Por abrir un PR con checklist.' },
  { key: 'PR_MERGED', label: 'PR Mergeado', value: 80, type: 'BASE', category: 'EVENT', description: 'Por mergear un PR exitosamente.' },
  { key: 'PR_BONUS_QUALITY', label: 'Bono Calidad PR', value: 50, type: 'BASE', category: 'EVENT', description: 'Si pasa CI/CD y no tiene cambios solicitados.' },
  { key: 'PR_CONFLICT_RESOLVED', label: 'Conflicto Resuelto', value: 25, type: 'BASE', category: 'EVENT', description: 'Por resolver conflictos de merge.' },
  
  // --- PENALIZACIONES (Valores negativos) ---
  { key: 'PENALTY_PR_CHANGE_REQUEST', label: 'Penalización Cambios', value: -10, type: 'PENALTY', category: 'PENALTY', description: 'Resta por cada cambio solicitado en PR.' },
  { key: 'PENALTY_DIRECT_PUSH', label: 'Push Directo', value: -150, type: 'PENALTY', category: 'PENALTY', description: 'Push directo a rama protegida.' },
  { key: 'PENALTY_FORCE_PUSH', label: 'Force Push', value: -500, type: 'PENALTY', category: 'PENALTY', description: 'Force push a rama protegida.' },
  { key: 'PENALTY_REDUCTION_FACTOR', label: 'Factor Reducción', value: 0.4, type: 'FACTOR', category: 'PENALTY', description: 'Porcentaje de la penalización que se aplica realmente (40%).' },

  // --- OTROS ---
  { key: 'REVIEW_CONSTRUCTIVE', label: 'Revisión Constructiva', value: 10, type: 'BASE', category: 'EVENT', description: 'Por aprobar o pedir cambios en PR.' },
  { key: 'REVIEW_TAG_BONUS', label: 'Bono Etiqueta Review', value: 20, type: 'BASE', category: 'EVENT', description: 'Por usar etiquetas válidas en review.' },
  { key: 'BRANCH_VALID_NAME', label: 'Rama Válida', value: 20, type: 'BASE', category: 'EVENT', description: 'Por crear rama con nombre correcto.' },
  { key: 'RELEASE_PUBLISHED', label: 'Release Publicado', value: 50, type: 'BASE', category: 'EVENT', description: 'Por publicar un release semántico.' },

  // --- NUEVOS FACTORES PONDERADOS (La Propuesta del Inge) ---
  { key: 'FACTOR_MODULE_FRONTEND', label: 'Factor Frontend', value: 1.3, type: 'FACTOR', category: 'MODULE', description: 'Multiplicador para cambios de Frontend.' },
  { key: 'FACTOR_MODULE_BACKEND', label: 'Factor Backend', value: 1.6, type: 'FACTOR', category: 'MODULE', description: 'Multiplicador para cambios de Backend.' },
  { key: 'FACTOR_MODULE_MIXED', label: 'Factor Mixto', value: 1.4, type: 'FACTOR', category: 'MODULE', description: 'Multiplicador para cambios mixtos.' },
  
  { key: 'FACTOR_IMPACT_LOW', label: 'Impacto Bajo', value: 1.0, type: 'FACTOR', category: 'IMPACT', description: 'Cambios menores o documentación.' },
  { key: 'FACTOR_IMPACT_MEDIUM', label: 'Impacto Medio', value: 1.3, type: 'FACTOR', category: 'IMPACT', description: 'Cambios estándar.' },
  { key: 'FACTOR_IMPACT_HIGH', label: 'Impacto Alto', value: 1.6, type: 'FACTOR', category: 'IMPACT', description: 'Refactorización o configuración crítica.' },
];

async function main() {
  console.log('Iniciando el proceso de seeding...');

  // --- Limpieza ---
  console.log('Borrando datos antiguos de rangos e insignias...');
  // Para evitar errores de Foreign Key, borramos UserBadge primero
  await prisma.userBadge.deleteMany({});
  await prisma.rank.deleteMany({});
  await prisma.badge.deleteMany({});
  // No borramos ScoringRule para no perder configuraciones personalizadas, usamos upsert

  // --- Creación de Rangos ---
  console.log('Creando nuevos rangos...');
  await prisma.rank.createMany({
    data: ranksData,
  });

  // --- Creación de Insignias ---
  console.log('Creando nuevas insignias...');
  await prisma.badge.createMany({
    data: badgesData,
  });

  // --- Creación de Reglas de Puntuación ---
  console.log('Creando/Actualizando reglas de puntuación dinámicas...');
  for (const rule of scoringRulesData) {
    await prisma.scoringRule.upsert({
      where: { key: rule.key },
      
      update: {
        value: rule.value,         // Actualiza el 999
        description: rule.description,
        label: rule.label
      }, 
      
      create: rule,
    });
  }

  console.log('Seeding completado exitosamente.');
}

try {
  await main();
} catch (e) {
  console.error('Error durante el proceso de seeding:', e);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
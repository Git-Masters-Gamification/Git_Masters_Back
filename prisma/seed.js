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
    key: 'commit_perfecto', // ✅ AÑADIDO
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
    key: 'revisor_experto', // ✅ AÑADIDO
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
    key: 'guardian_de_la_calidad', // ✅ AÑADIDO
    name: 'Guardián de la Calidad',
    description: 'Otorgado mensualmente al revisor con más problemas válidos detectados.',
    criteria: {
      type: 'MONTHLY_AWARD',
      award: 'TOP_REVIEWER',
    },
  },
  // --- Insignias de Hitos ---
  {
    key: 'rompiendo_el_hielo', // ✅ AÑADIDO
    name: 'Rompiendo el Hielo',
    description: 'Otorgada por crear tu primer Pull Request.',
    criteria: {
      type: 'FIRST_PULL_REQUEST',
      count: 1,
    },
  },
  {
    key: 'el_planificador', // ✅ AÑADIDO
    name: 'El Planificador',
    description: 'Otorgada por crear tu primera rama siguiendo la convención del proyecto.',
    criteria: {
      type: 'FIRST_VALID_BRANCH',
      count: 1,
    },
  },
];

async function main() {
  console.log('Iniciando el proceso de seeding...');

  // --- Limpieza ---
  console.log('Borrando datos antiguos de rangos e insignias...');
  // Para evitar errores de Foreign Key, borramos UserBadge primero
  await prisma.userBadge.deleteMany({});
  await prisma.rank.deleteMany({});
  await prisma.badge.deleteMany({});

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

  console.log('Seeding completado exitosamente.');
}

main()
  .catch((e) => {
    console.error('Error durante el proceso de seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
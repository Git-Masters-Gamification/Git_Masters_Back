import prisma from '../../../config/prisma.js';

// ---------------- Niveles progresivos ----------------
function getXPForLevel(level) {
  if (level <= 1) return 0;
  const base = 200;
  const growth = 1.15;
  let total = 0;
  for (let i = 1; i < level; i++) total += Math.round(base * Math.pow(growth, i - 1));
  return total;
}

function calculateLevelData(points) {
  const maxLevel = 100;
  let level = 1;
  for (let i = 1; i <= maxLevel; i++) {
    const xpNext = getXPForLevel(i + 1);
    if (points < xpNext) {
      level = i;
      break;
    } else {
      level = Math.min(i + 1, maxLevel);
    }
  }
  const currentXP = getXPForLevel(level);
  const nextXP = getXPForLevel(level + 1);
  const gained = points - currentXP;
  const needed = Math.max(0, nextXP - points);
  const progressPercent = Math.min(100, Math.round((gained / (nextXP - currentXP)) * 100));
  return { level, progressPercent, pointsToNextLevel: needed };
}

function getRankForLevel(level) {
  if (level >= 100) return 'Legendario';
  if (level >= 60) return 'Maestro';
  if (level >= 30) return 'Experto';
  if (level >= 10) return 'Avanzado';
  return 'Iniciado';
}

// ---------------- Perfil completo ----------------
export const getProfileByUserId = async (userId) => {
  const userProfile = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      githubId: true,
      username: true,
      email: true,
      avatarUrl: true,
      role: true,
      pointsBalance: true,
      createdAt: true,
      profile: {
        select: {
          id: true,
          level: true,
          bio: true,
          rank: {
            select: {
              name: true,
              color: true,
            },
          },
        },
      },
      team: { select: { id: true, name: true } },
      assignedBadges: {
        orderBy: { obtainedAt: 'desc' },
        select: {
          obtainedAt: true,
          badge: { select: { name: true, description: true } },
        },
      },
    },
  });

  if (!userProfile) return null;

  const { level, progressPercent, pointsToNextLevel } = calculateLevelData(userProfile.pointsBalance);
  const rankName = getRankForLevel(level);
  const rank = await prisma.rank.findFirst({ where: { name: rankName } });

  // 🔄 Actualiza perfil si difiere
  if (
    !userProfile.profile ||
    userProfile.profile.level !== level ||
    userProfile.profile.rank?.name !== rankName
  ) {
    await prisma.profile.upsert({
      where: { userId },
      create: { userId, level, rankId: rank?.id ?? null },
      update: { level, rankId: rank?.id ?? null },
    });
  }

  return {
    id: userProfile.id,
    githubId: userProfile.githubId,
    username: userProfile.username,
    avatarUrl: userProfile.avatarUrl,
    email: userProfile.email,
    role: userProfile.role,
    points: userProfile.pointsBalance,
    memberSince: userProfile.createdAt,
    level,
    progressPercent,
    pointsToNextLevel,
    rank: userProfile.profile?.rank || { name: rankName, color: '#A0AEC0' },
    bio: userProfile.profile?.bio ?? 'Aún no has escrito una biografía.',
    team: userProfile.team,
    badges: userProfile.assignedBadges.map((b) => ({
      name: b.badge.name,
      description: b.badge.description,
      obtainedAt: b.obtainedAt,
    })),
  };
};

// ---------------- Logs ----------------
export const getActivityLogByUserId = async (userId, options = { excludeResets: true }) => {
  const { excludeResets = true } = options;
  const where = { userId };

  if (excludeResets) {
    where.NOT = { metadata: { path: ['action'], equals: 'RESETRANKS' } };
  }

  const logs = await prisma.activityLog.findMany({
    where,
    take: 20,
    orderBy: { createdAt: 'desc' },
  });

  // 🔧 Si no hay actividad real, devolvemos lista vacía limpia
  return logs.filter((log) => log.metadata?.action !== 'RESETRANKS');
};

export const getPointsHistoryByUserId = async (userId, options = { excludeResets: true }) => {
  const { excludeResets = true } = options;
  const where = { userId };

  if (excludeResets) {
    where.NOT = { ruleKey: 'RESET_MONTHLY' };
  }

  const history = await prisma.pointLedger.findMany({
    where,
    take: 20,
    orderBy: { createdAt: 'desc' },
  });

  // 🔧 Si solo había el RESET_MONTHLY, devolver vacío
  return history.filter((h) => h.ruleKey !== 'RESET_MONTHLY');
};

// ---------------- Update profile ----------------
export const updateProfile = async (userId, data) => {
  const { bio } = data;
  if (typeof bio === 'undefined') throw new Error("El campo 'bio' es requerido.");
  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      profile: {
        upsert: {
          create: { bio },
          update: { bio },
        },
      },
    },
    select: { profile: { select: { bio: true } } },
  });
  return updatedUser.profile;
};
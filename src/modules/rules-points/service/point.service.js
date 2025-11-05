// ======================================================
// 🎯 POINT SERVICE — Sistema de Puntos + Nivel + Rango
// (Versión Unificada y Optimizada)
// ======================================================

import prisma from '../../../config/prisma.js'

// ----------------------------------------------
// 🔹 CONFIGURACIÓN DE PROGRESIÓN (niveles)
// ----------------------------------------------

// Puntos necesarios por nivel (fórmula incremental)
function getXPForLevel(level) {
  if (level <= 1) return 0
  const base = 200
  const growth = 1.15 // +15% dificultad por nivel
  let total = 0
  for (let i = 1; i < level; i++) {
    total += Math.round(base * Math.pow(growth, i - 1))
  }
  return total
}

// Calcula datos de nivel según puntos actuales
function calculateLevelData(points) {
  const maxLevel = 100
  let level = 1

  for (let i = 1; i <= maxLevel; i++) {
    const xpForNext = getXPForLevel(i + 1)
    if (points < xpForNext) {
      level = i
      break
    } else {
      level = Math.min(i + 1, maxLevel)
    }
  }

  const currentXP = getXPForLevel(level)
  const nextXP = getXPForLevel(level + 1)
  const gainedInLevel = points - currentXP
  const neededForNext = Math.max(0, nextXP - points)
  const progressPercent = Math.min(
    100,
    Math.round((gainedInLevel / (nextXP - currentXP)) * 100)
  )

  return { level, progressPercent, pointsToNextLevel: neededForNext }
}

// ----------------------------------------------
// 🔹 ACTUALIZACIÓN DE RANGO Y NIVEL
// ----------------------------------------------

function getRankForLevel(level) {
  if (level >= 100) return 'Legendario'
  if (level >= 60) return 'Maestro'
  if (level >= 30) return 'Experto'
  if (level >= 10) return 'Avanzado'
  return 'Iniciado'
}

/**
 * Actualiza el progreso (nivel + rango) de un usuario
 * @param {string} userId - ID del usuario
 * @param {number} points - Puntos totales actuales
 */
async function updateUserProgress(userId, points) {
  const { level } = calculateLevelData(points)
  const rankName = getRankForLevel(level)

  const rank = await prisma.rank.findFirst({ where: { name: rankName } })

  await prisma.profile.update({
    where: { userId },
    data: { level, rankId: rank?.id ?? null },
  })

  console.log(`[LevelSystem] Usuario ${userId} → Nivel ${level} (${rankName})`)
}

// ----------------------------------------------
// 🔹 REINICIO MENSUAL DE RANGOS (con historial)
// ----------------------------------------------

export async function resetMonthlyRanks() {
  const now = new Date()
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const monthLabel = `${lastMonth.getFullYear()}-${String(
    lastMonth.getMonth() + 1
  ).padStart(2, '0')}`

  const users = await prisma.user.findMany({
    select: {
      id: true,
      pointsBalance: true,
      profile: { select: { rankId: true, level: true } },
    },
  })

  const records = users.map((u) => ({
    userId: u.id,
    month: monthLabel,
    points: u.pointsBalance,
    level: u.profile?.level || 1,
    rankId: u.profile?.rankId || null,
  }))

  await prisma.$transaction([
    prisma.monthlyRankingHistory.createMany({ data: records }),
    prisma.user.updateMany({ data: { pointsBalance: 0 } }),
    prisma.profile.updateMany({ data: { level: 1, rankId: null } }),
  ])

  console.log(`[RankSystem] Reinicio mensual completado para ${monthLabel}`)
}

// ----------------------------------------------
// 🔹 APLICAR PUNTOS (transaccional + seguridad)
// ----------------------------------------------

export const applyPoints = async ({
  userId,
  points,
  ruleKey,
  entityId,
  ruleVersion = 'v1.0',
  notes,
  isReversible = true,
}) => {
  if (points === 0) return null

  try {
    let actualPointsToApply = points

    // --- Evitar saldo negativo ---
    if (points < 0) {
      const currentUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { pointsBalance: true },
      })
      if (!currentUser) {
        console.error(`[PointService] Usuario ${userId} no encontrado.`)
        return null
      }
      const potentialNewBalance = currentUser.pointsBalance + points
      if (potentialNewBalance < 0) {
        actualPointsToApply = -currentUser.pointsBalance // Limitar a 0
      }
    }

    if (actualPointsToApply === 0) {
      console.log(`[PointService] No se aplicaron puntos a ${userId} (resultado 0).`)
      return null
    }

    // --- Transacción segura ---
    const [ledgerEntry, updatedUser] = await prisma.$transaction([
      prisma.pointLedger.create({
        data: {
          userId,
          points: actualPointsToApply,
          ruleKey,
          entityId,
          ruleVersion,
          notes,
          isReversible,
        },
      }),
      prisma.user.update({
        where: { id: userId },
        data: { pointsBalance: { increment: actualPointsToApply } },
        select: { pointsBalance: true },
      }),
    ])

    console.log(
      `[PointService] ${actualPointsToApply} pts aplicados a ${userId} por ${ruleKey}. (Original: ${points})`
    )

    await updateUserProgress(userId, updatedUser.pointsBalance)

    return ledgerEntry
  } catch (error) {
    console.error(`[PointService] Falló transacción de puntos para ${userId}:`, error)
    throw new Error('Error en la base de datos al aplicar puntos.')
  }
}

// ----------------------------------------------
// 🔹 DASHBOARD DEL USUARIO
// ----------------------------------------------

export const getDashboardData = async (userId) => {
  try {
    const userProfile = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        username: true,
        avatarUrl: true,
        pointsBalance: true,
        createdAt: true,
        profile: {
          select: {
            level: true,
            rank: { select: { name: true, color: true } },
          },
        },
        assignedBadges: {
          select: {
            badge: { select: { name: true, description: true } },
            obtainedAt: true,
          },
          orderBy: { obtainedAt: 'desc' },
        },
        pointLedgerEntries: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          select: { points: true, notes: true, createdAt: true },
        },
      },
    })

    if (!userProfile) return null

    const badges = userProfile.assignedBadges.map((ab) => ({
      name: ab.badge.name,
      description: ab.badge.description,
      obtainedAt: ab.obtainedAt,
    }))

    return {
      username: userProfile.username,
      avatarUrl: userProfile.avatarUrl,
      memberSince: userProfile.createdAt,
      totalPoints: userProfile.pointsBalance,
      level: userProfile.profile?.level || 1,
      rank: userProfile.profile?.rank || { name: 'Iniciado', color: '#A0AEC0' },
      recentActivity: userProfile.pointLedgerEntries,
      badges,
    }
  } catch (error) {
    console.error(`[PointService] Error al obtener datos del dashboard para ${userId}:`, error)
    throw new Error('Error al obtener los datos del dashboard desde el servicio.')
  }
}

// ----------------------------------------------
// 🔹 LEADERBOARD (TOP N)
// ----------------------------------------------

export const getLeaderboard = async (limit = 10) => {
  try {
    const effectiveLimit = Math.max(1, limit)
    const topUsers = await prisma.user.findMany({
      take: effectiveLimit,
      orderBy: { pointsBalance: 'desc' },
      select: {
        username: true,
        avatarUrl: true,
        pointsBalance: true,
        profile: {
          select: {
            level: true,
            rank: { select: { name: true } },
          },
        },
      },
    })

    return topUsers.map((user) => ({
      username: user.username || 'N/A',
      avatarUrl: user.avatarUrl || '',
      totalPoints: user.pointsBalance || 0,
      level: user.profile?.level || 1,
      rank: user.profile?.rank?.name || 'Iniciado',
    }))
  } catch (error) {
    console.error('[PointService] Error al obtener el leaderboard:', error)
    throw new Error('Error al obtener el ranking de usuarios desde el servicio.')
  }
}